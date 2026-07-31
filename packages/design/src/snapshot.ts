/**
 * Vendored design-system snapshot access (E-P3, FR-014).
 *
 * Everything here reads from `assets/snapshot/` — the byte-verified copy of
 * the Patterson design-system project pulled from claude.ai/design. No
 * function in this package touches the network: the authenticated refresh
 * path is `patterson design refresh`, which (unauthenticated) only reports
 * the snapshot's age and how to refresh (exit 0, per FR-014).
 */
import { join } from "node:path";

/** Absolute path of the vendored snapshot root. */
export const SNAPSHOT_DIR = join(import.meta.dir, "..", "assets", "snapshot");

/** claude.ai/design project the snapshot was pulled from. */
export const DESIGN_PROJECT_ID = "3534f94f-a7e6-4612-81d4-6e830716f07d";

// ---------------------------------------------------------------------------
// snapshot-manifest.json — what was pulled, when
// ---------------------------------------------------------------------------

export interface SnapshotFileRecord {
  path: string;
  bytes: number;
  etag: string;
}

export interface SnapshotManifest {
  pulledAt: string;
  projectId: string;
  files: SnapshotFileRecord[];
}

let manifestCache: SnapshotManifest | null = null;

/** Load (and cache) the pull manifest describing the vendored snapshot. */
export async function loadSnapshotManifest(): Promise<SnapshotManifest> {
  if (manifestCache === null) {
    manifestCache = (await Bun.file(
      join(SNAPSHOT_DIR, "snapshot-manifest.json"),
    ).json()) as SnapshotManifest;
  }
  return manifestCache;
}

export interface SnapshotInfo {
  pulledAt: string;
  projectId: string;
  fileCount: number;
  /** Whole days since the snapshot was pulled (0 for today). */
  ageDays: number;
}

/** Summary used by `design refresh` and the stale-snapshot warning. */
export async function snapshotInfo(now: Date = new Date()): Promise<SnapshotInfo> {
  const manifest = await loadSnapshotManifest();
  const pulled = new Date(`${manifest.pulledAt}T00:00:00Z`);
  const ms = now.getTime() - pulled.getTime();
  const ageDays = Number.isFinite(ms) ? Math.max(0, Math.floor(ms / 86_400_000)) : 0;
  return {
    pulledAt: manifest.pulledAt,
    projectId: manifest.projectId,
    fileCount: manifest.files.length,
    ageDays,
  };
}

// ---------------------------------------------------------------------------
// _ds_manifest.json — the design system's own machine-readable index
// ---------------------------------------------------------------------------

export interface DsTemplateEntry {
  name: string;
  description: string;
  folder: string;
  entryPath: string;
  thumbnail?: { path: string; kind: string };
}

export interface DsManifest {
  templates: DsTemplateEntry[];
  components?: unknown[];
  tokens?: unknown[];
  cards?: unknown[];
  fonts?: unknown[];
}

let dsManifestCache: DsManifest | null = null;

/** Load (and cache) the design system's `_ds_manifest.json`. */
export async function loadDsManifest(): Promise<DsManifest> {
  if (dsManifestCache === null) {
    dsManifestCache = (await Bun.file(
      join(SNAPSHOT_DIR, "_ds_manifest.json"),
    ).json()) as DsManifest;
  }
  return dsManifestCache;
}

/** The design system's theme.json (theme-ui spec; source for token queries). */
export async function loadTheme(): Promise<Record<string, unknown>> {
  return (await Bun.file(join(SNAPSHOT_DIR, "theme.json")).json()) as Record<string, unknown>;
}

/** Reset module caches (tests only). */
export function resetSnapshotCaches(): void {
  manifestCache = null;
  dsManifestCache = null;
}
