/**
 * `patterson design …` — vendored design-system surface (E-P3, FR-014).
 *
 * - `design templates`: list the 11 vendored templates (offline, --json-able).
 * - `design tokens`: the design system's token groups from theme.json.
 * - `design refresh`: WITHOUT authentication this never errors — it reports
 *   the snapshot's age and the authenticated refresh steps and exits 0
 *   (FR-014: a stale snapshot is a warning, not a failure). Named `refresh`
 *   (not `sync`) to avoid colliding with top-level `patterson sync`.
 *
 * All three read only the byte-verified snapshot in @patterson/design — no
 * network call exists in this module graph.
 */
import { z } from "zod";

import { defineCommand, type CommandResult } from "@patterson/core";
import {
  DESIGN_PROJECT_ID,
  listDesignTemplates,
  loadTheme,
  snapshotInfo,
} from "@patterson/design";

// ---------------------------------------------------------------------------
// design templates
// ---------------------------------------------------------------------------

export const DesignTemplatesInputSchema = z.strictObject({});

export const DesignTemplatesOutputSchema = z.strictObject({
  templates: z.array(
    z.strictObject({
      name: z.string(),
      label: z.string(),
      description: z.string(),
      entryPath: z.string(),
    }),
  ),
});

export type DesignTemplatesOutput = z.infer<typeof DesignTemplatesOutputSchema>;

export const designTemplatesCommand = defineCommand({
  id: "design.templates",
  path: ["design", "templates"],
  summary: "List the vendored design-system templates (offline)",
  inputSchema: DesignTemplatesInputSchema,
  outputSchema: DesignTemplatesOutputSchema,
  annotations: { readOnlyHint: true, destructiveHint: false },
  async run(): Promise<CommandResult<DesignTemplatesOutput>> {
    const templates = (await listDesignTemplates()).map((template) => ({
      name: template.name,
      label: template.label,
      description: template.description,
      entryPath: template.entryPath,
    }));
    return {
      kind: "ok",
      value: { templates },
      report: {
        summary: `${templates.length} design template(s) available (vendored snapshot).`,
        details: templates.map((t) => `${t.name} — ${t.label}: ${t.description}`),
      },
    };
  },
});

// ---------------------------------------------------------------------------
// design tokens
// ---------------------------------------------------------------------------

export const DesignTokensInputSchema = z.strictObject({});

export const DesignTokensOutputSchema = z.strictObject({
  name: z.string(),
  version: z.string(),
  /** theme.json token groups, passed through as-is (theme-ui spec). */
  groups: z.record(z.string(), z.unknown()),
});

export type DesignTokensOutput = z.infer<typeof DesignTokensOutputSchema>;

/** theme.json keys that hold design tokens (not component styles). */
const TOKEN_GROUP_KEYS = [
  "colors",
  "fonts",
  "fontWeights",
  "fontSizes",
  "lineHeights",
  "letterSpacings",
  "space",
  "sizes",
  "radii",
  "borderWidths",
  "shadows",
  "transitions",
] as const;

export const designTokensCommand = defineCommand({
  id: "design.tokens",
  path: ["design", "tokens"],
  summary: "Show the design system's token groups (colors, fonts, spacing, …)",
  inputSchema: DesignTokensInputSchema,
  outputSchema: DesignTokensOutputSchema,
  annotations: { readOnlyHint: true, destructiveHint: false },
  async run(): Promise<CommandResult<DesignTokensOutput>> {
    const theme = await loadTheme();
    const meta = (theme["$meta"] ?? {}) as { name?: string; version?: string };
    const groups: Record<string, unknown> = {};
    for (const key of TOKEN_GROUP_KEYS) {
      if (theme[key] !== undefined) groups[key] = theme[key];
    }
    return {
      kind: "ok",
      value: {
        name: meta.name ?? "Patterson design system",
        version: meta.version ?? "unknown",
        groups,
      },
      report: {
        summary: `${meta.name ?? "design system"} v${meta.version ?? "?"}: ${Object.keys(groups).length} token group(s).`,
        details: Object.entries(groups).map(([key, value]) => {
          const count =
            typeof value === "object" && value !== null ? Object.keys(value).length : 1;
          return `${key}: ${count} token(s)`;
        }),
      },
    };
  },
});

// ---------------------------------------------------------------------------
// design refresh
// ---------------------------------------------------------------------------

export const DesignRefreshInputSchema = z.strictObject({});

export const DesignRefreshOutputSchema = z.strictObject({
  refreshed: z.boolean(),
  pulledAt: z.string(),
  ageDays: z.number(),
  fileCount: z.number(),
  projectId: z.string(),
});

export type DesignRefreshOutput = z.infer<typeof DesignRefreshOutputSchema>;

export const designRefreshCommand = defineCommand({
  id: "design.refresh",
  path: ["design", "refresh"],
  summary: "Refresh the vendored design snapshot (needs claude.ai auth; else reports age)",
  inputSchema: DesignRefreshInputSchema,
  outputSchema: DesignRefreshOutputSchema,
  annotations: { readOnlyHint: true, destructiveHint: false },
  async run(): Promise<CommandResult<DesignRefreshOutput>> {
    // The claude.ai/design endpoint is authenticated; the CLI has no
    // credential store in v1, so refresh always takes the offline path:
    // report the snapshot's age + how to refresh, exit 0 (FR-014).
    const info = await snapshotInfo();
    return {
      kind: "ok",
      value: {
        refreshed: false,
        pulledAt: info.pulledAt,
        ageDays: info.ageDays,
        fileCount: info.fileCount,
        projectId: info.projectId,
      },
      report: {
        summary:
          `Snapshot is from ${info.pulledAt} (${info.ageDays} day(s) old, ${info.fileCount} files); ` +
          `not refreshed — the design endpoint requires claude.ai authentication.`,
        details: [
          `To refresh: open claude.ai/design project ${DESIGN_PROJECT_ID} with the claude-design ` +
            `MCP connected and re-run the snapshot pull (see packages/design/assets/snapshot/snapshot-manifest.json).`,
          "A stale snapshot only affects new scaffolds; existing projects keep their materialized copies.",
        ],
      },
    };
  },
});

