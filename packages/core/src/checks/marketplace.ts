/**
 * Marketplace manifest checks (spec 002).
 *
 * A Claude plugin marketplace can be published from two paths, and both are
 * plain copies of one another rather than two dialects: githubnext/ado-aw ships
 * `.claude-plugin/marketplace.json` and `.github/plugin/marketplace.json` with
 * identical bytes (both sha256
 * f7010cf379fbc2977a06fc099de8c34b80a0a1e6197491a23eccafa03cf1630e — verified
 * with `cmp`/`sha256sum` against the vendored copy of that repo, Constitution V).
 *
 * So when a repo carries both files, a byte difference between them is drift:
 * whichever consumer reads the stale one gets a different plugin list. This
 * check reports that. It stays silent when only one path (or neither) exists —
 * publishing from a single path is legal, and most projects are not
 * marketplaces at all.
 */
import { join } from "node:path";

import type { CheckCtx, CheckDef, Finding } from "./types.ts";

/** The two published locations of a Claude plugin marketplace manifest. */
export const MARKETPLACE_MANIFEST_PATHS = {
  /** Read by Claude Code when the repo is added as a marketplace. */
  claude: ".claude-plugin/marketplace.json",
  /** The in-repo convention `patterson new marketplace` has always emitted. */
  github: ".github/plugin/marketplace.json",
} as const;

/** Read a file's bytes, or null when it does not exist. */
async function readBytes(path: string): Promise<Uint8Array | null> {
  const file = Bun.file(path);
  if (!(await file.exists())) return null;
  return new Uint8Array(await file.arrayBuffer());
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.byteLength; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export const marketplaceManifestsDivergedCheck: CheckDef = {
  id: "marketplace.manifests-diverged",
  description: "Dual marketplace manifests are byte-identical copies of each other",
  async run(ctx: CheckCtx): Promise<Finding[]> {
    const [claude, github] = await Promise.all([
      readBytes(join(ctx.cwd, MARKETPLACE_MANIFEST_PATHS.claude)),
      readBytes(join(ctx.cwd, MARKETPLACE_MANIFEST_PATHS.github)),
    ]);
    // Only a repo that publishes from BOTH paths can have them diverge.
    if (claude === null || github === null) return [];
    if (sameBytes(claude, github)) return [];

    return [
      {
        checkId: marketplaceManifestsDivergedCheck.id,
        severity: "error",
        message:
          `${MARKETPLACE_MANIFEST_PATHS.claude} and ${MARKETPLACE_MANIFEST_PATHS.github} differ; ` +
          "the two marketplace manifests must be byte-identical copies, or consumers " +
          "reading different paths see different plugin lists.",
        path: MARKETPLACE_MANIFEST_PATHS.claude,
        fix: `cp ${MARKETPLACE_MANIFEST_PATHS.claude} ${MARKETPLACE_MANIFEST_PATHS.github} (after deciding which side is current)`,
      },
    ];
  },
};

/** Marketplace checks, in registration order. */
export const marketplaceChecks: CheckDef[] = [marketplaceManifestsDivergedCheck];
