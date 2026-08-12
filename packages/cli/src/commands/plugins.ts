/**
 * `patterson plugins marketplace …` — curated marketplace registry (E-P4).
 *
 * The registry is DATA, pinned per research: Anthropic's official Claude
 * marketplaces by registered name, and awesome-copilot pinned @SHA (its
 * 2026-02 restructure broke floating refs — research.md, Copilot section).
 * This command group is a DISCOVERY surface only: it lists the curated
 * registry and writes nothing. The IR has a `marketplaces` field
 * (ir/project.ts, MarketplaceRefSchema) but NO emitter reads it yet — nothing
 * in packages/emitters/ consumes `ir.marketplaces`, so configuring a
 * marketplace in patterson.config.ts currently has no emitted effect.
 * Wiring it into the claude-code emitter is tracked as future work.
 */
import { z } from "zod";

import { defineCommand, type CommandResult } from "@patterson/core";

export interface KnownMarketplace {
  name: string;
  kind: "claude" | "copilot";
  /** How the target surface identifies it (registered name or owner/repo@sha). */
  ref: string;
  description: string;
}

/**
 * Curated, pinned marketplace registry (research.md: registered names for
 * Claude; @SHA pin for awesome-copilot after the 2026-02 restructure).
 */
export const KNOWN_MARKETPLACES: readonly KnownMarketplace[] = [
  {
    name: "claude-code-plugins",
    kind: "claude",
    ref: "claude-code-plugins",
    description: "Anthropic's official Claude Code plugin marketplace",
  },
  {
    name: "claude-plugins-official",
    kind: "claude",
    ref: "claude-plugins-official",
    description: "Anthropic's official Claude plugins marketplace",
  },
  {
    name: "claude-community",
    kind: "claude",
    ref: "claude-community",
    description: "Community Claude plugin marketplace",
  },
  {
    name: "awesome-copilot",
    kind: "copilot",
    ref: "github/awesome-copilot",
    description:
      "GitHub's awesome-copilot collection (pin @SHA in patterson.config.ts — " +
      "the 2026-02 restructure moved prompts/ into skills/ and removed collections/)",
  },
];

export const MarketplaceListInputSchema = z.strictObject({});

export const MarketplaceListOutputSchema = z.strictObject({
  marketplaces: z.array(
    z.strictObject({
      name: z.string(),
      kind: z.enum(["claude", "copilot"]),
      ref: z.string(),
      description: z.string(),
    }),
  ),
});

export type MarketplaceListOutput = z.infer<typeof MarketplaceListOutputSchema>;

export const marketplaceListCommand = defineCommand({
  id: "plugins.marketplace.list",
  path: ["plugins", "marketplace", "list"],
  summary: "List known plugin marketplaces (curated, pinned registry)",
  inputSchema: MarketplaceListInputSchema,
  outputSchema: MarketplaceListOutputSchema,
  annotations: { readOnlyHint: true, destructiveHint: false },
  async run(): Promise<CommandResult<MarketplaceListOutput>> {
    const marketplaces = KNOWN_MARKETPLACES.map((marketplace) => ({ ...marketplace }));
    return {
      kind: "ok",
      value: { marketplaces },
      report: {
        summary: `${marketplaces.length} known marketplace(s).`,
        details: marketplaces.map(
          (marketplace) => `${marketplace.name} [${marketplace.kind}] — ${marketplace.description}`,
        ),
      },
    };
  },
});
