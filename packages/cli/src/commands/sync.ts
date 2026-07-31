/**
 * `patterson sync` — re-emit target configs from patterson.config.ts with the
 * drift protocol (T025, US2).
 *
 * Non-interactive conflicts are never clobbered: the engine keeps hand-edits,
 * the command returns a `conflicts` result (exit 2), and only
 * `--accept-generated` authorizes overwriting (Constitution II).
 */
import { z } from "zod";

import { defineCommand, RESOLVING_FLAG, type CommandResult } from "@patterson/core";

import {
  defaultDeps,
  loadProjectConfig,
  runEmitPipeline,
  toCommandConflicts,
  type CommandDeps,
} from "./shared.ts";

export const SyncInputSchema = z.strictObject({
  /** Overwrite drifted content (after backup) instead of keeping + reporting. */
  acceptGenerated: z.boolean().default(false),
  /** Compute the full plan and result without writing anything. */
  dryRun: z.boolean().default(false),
});

export const SyncOutputSchema = z.strictObject({
  written: z.array(z.string()),
  backups: z.array(z.string()),
  foreignSkipped: z.array(z.string()),
  setupPath: z.string().nullable(),
  dryRun: z.boolean(),
  unsupportedTargets: z.array(z.string()),
});

export type SyncInput = z.infer<typeof SyncInputSchema>;
export type SyncOutput = z.infer<typeof SyncOutputSchema>;

export function makeSyncCommand(deps: CommandDeps = defaultDeps) {
  return defineCommand({
    id: "sync",
    path: ["sync"],
    summary: "Re-emit target configs from patterson.config.ts (drift-safe)",
    inputSchema: SyncInputSchema,
    outputSchema: SyncOutputSchema,
    annotations: { readOnlyHint: false, destructiveHint: true },
    async run(rawArgs, ctx): Promise<CommandResult<SyncOutput>> {
      const args = SyncInputSchema.parse(rawArgs);

      const config = await loadProjectConfig(ctx.cwd);
      if (!config.ok) {
        return { kind: "error", code: config.code, message: config.message };
      }

      const outcome = await runEmitPipeline(
        config.ir,
        ctx.cwd,
        { acceptGenerated: args.acceptGenerated, dryRun: args.dryRun },
        deps,
      );

      if (outcome.apply.conflicts.length > 0) {
        return {
          kind: "conflicts",
          conflicts: toCommandConflicts(outcome.apply.conflicts),
          resolvingFlag: RESOLVING_FLAG,
        };
      }

      const details: string[] = [];
      for (const target of outcome.unsupported) {
        details.push(`Target "${target}" has no emitter yet; nothing was emitted for it.`);
      }
      if (outcome.apply.backups.length > 0) {
        details.push(`Backups: ${outcome.apply.backups.join(", ")}`);
      }
      if (outcome.apply.foreignSkipped.length > 0) {
        details.push(
          `Foreign (hand-owned) content left untouched: ${outcome.apply.foreignSkipped.join(", ")}`,
        );
      }

      return {
        kind: "ok",
        value: {
          written: outcome.apply.written,
          backups: outcome.apply.backups,
          foreignSkipped: outcome.apply.foreignSkipped,
          setupPath: outcome.apply.setupPath,
          dryRun: args.dryRun,
          unsupportedTargets: outcome.unsupported,
        },
        report: {
          summary: args.dryRun
            ? `Dry run: ${outcome.apply.written.length} file(s) would be written; nothing was.`
            : `Sync complete: ${outcome.apply.written.length} file(s) written, 0 conflicts.`,
          ...(details.length > 0 ? { details } : {}),
        },
      };
    },
  });
}

export const syncCommand = makeSyncCommand();
