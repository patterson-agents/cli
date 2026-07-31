/**
 * `patterson check` — coverage table from emitter gaps (T025).
 *
 * For every (entity × target) pair the table reports "covered" or "gap".
 * Gaps come from the emitter's coverage hook when it exposes one; a target
 * with no emitter at all gaps every entity (silent drops are contract
 * violations — contracts/emitter.md, Reachability).
 */
import { z } from "zod";

import { defineCommand, type CommandResult, type PattersonProject } from "@patterson/core";

import { defaultDeps, loadProjectConfig, type CommandDeps } from "./shared.ts";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const CheckInputSchema = z.strictObject({});

const RowSchema = z.strictObject({
  entityId: z.string(),
  targetId: z.string(),
  status: z.enum(["covered", "gap"]),
  reason: z.string().optional(),
});

export const CheckOutputSchema = z.strictObject({
  rows: z.array(RowSchema),
  summary: z.strictObject({
    covered: z.number(),
    gaps: z.number(),
  }),
});

export type CheckInput = z.infer<typeof CheckInputSchema>;
export type CheckOutput = z.infer<typeof CheckOutputSchema>;
type CoverageRow = z.infer<typeof RowSchema>;

// ---------------------------------------------------------------------------
// Entity enumeration
// ---------------------------------------------------------------------------

/** Stable entity ids for the coverage table (sorted per kind, kinds in IR order). */
export function enumerateEntities(ir: PattersonProject): string[] {
  return [
    ...ir.instructions.map((block) => `instruction:${block.id}`),
    ...ir.skills.map((skill) => `skill:${skill.name}`),
    ...ir.agents.map((agent) => `agent:${agent.name}`),
    ...ir.commands.map((command) => `command:${command.name}`),
    ...ir.mcp.map((server) => `mcp:${server.name}`),
  ];
}

// ---------------------------------------------------------------------------
// Descriptor
// ---------------------------------------------------------------------------

export function makeCheckCommand(deps: CommandDeps = defaultDeps) {
  return defineCommand({
    id: "check",
    path: ["check"],
    summary: "Coverage table: which IR entities each target can express",
    inputSchema: CheckInputSchema,
    outputSchema: CheckOutputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false },
    async run(_args, ctx): Promise<CommandResult<CheckOutput>> {
      const config = await loadProjectConfig(ctx.cwd);
      if (!config.ok) {
        return { kind: "error", code: config.code, message: config.message };
      }
      const ir = config.ir;
      const entities = enumerateEntities(ir);

      const rows: CoverageRow[] = [];
      for (const target of ir.targets) {
        const resolved = await deps.resolveEmitter(target);
        if (!resolved) {
          for (const entityId of entities) {
            rows.push({
              entityId,
              targetId: target,
              status: "gap",
              reason: `no emitter for target "${target}" in this phase`,
            });
          }
          continue;
        }
        const gaps = new Map(
          (resolved.coverageGaps?.(ir) ?? []).map((gap) => [gap.entityId, gap.reason]),
        );
        for (const entityId of entities) {
          const reason = gaps.get(entityId);
          rows.push(
            reason === undefined
              ? { entityId, targetId: target, status: "covered" }
              : { entityId, targetId: target, status: "gap", reason },
          );
        }
      }

      const gapCount = rows.filter((row) => row.status === "gap").length;
      const value: CheckOutput = {
        rows,
        summary: { covered: rows.length - gapCount, gaps: gapCount },
      };

      return {
        kind: "ok",
        value,
        report: {
          summary: `check: ${value.summary.covered} covered, ${value.summary.gaps} gap(s) across ${ir.targets.length} target(s).`,
          details: rows
            .filter((row) => row.status === "gap")
            .map((row) => `[gap] ${row.entityId} → ${row.targetId}: ${row.reason ?? "unreachable"}`),
        },
      };
    },
  });
}

export const checkCommand = makeCheckCommand();
