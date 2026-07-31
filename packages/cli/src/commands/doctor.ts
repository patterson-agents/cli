/**
 * `patterson doctor` — drift + config-validity findings via the core check
 * registry (T025, US2).
 *
 * Read-only: drift is detected with a dry-run pass through the emit engine
 * (nothing is written, provenance is not saved). Exit mapping: clean → ok (0),
 * drift → conflicts (2), unloadable config → error (1).
 */
import { z } from "zod";

import {
  ABSENT_HASH,
  CheckRegistry,
  defineCommand,
  RESOLVING_FLAG,
  type CommandResult,
  type Finding,
} from "@patterson/core";

import {
  defaultDeps,
  describeConflict,
  loadProjectConfig,
  runEmitPipeline,
  toCommandConflicts,
  type CommandDeps,
} from "./shared.ts";

// ---------------------------------------------------------------------------
// Schemas — mirrors core's CheckReport (the stable --json contract, T016)
// ---------------------------------------------------------------------------

const FindingSchema = z.strictObject({
  checkId: z.string(),
  severity: z.enum(["error", "warn", "info"]),
  message: z.string(),
  path: z.string().optional(),
  fix: z.string().optional(),
});

export const DoctorInputSchema = z.strictObject({});

export const DoctorOutputSchema = z.strictObject({
  ok: z.boolean(),
  summary: z.strictObject({
    total: z.number(),
    error: z.number(),
    warn: z.number(),
    info: z.number(),
  }),
  checks: z.array(
    z.strictObject({
      id: z.string(),
      description: z.string(),
      findings: z.array(FindingSchema),
    }),
  ),
  findings: z.array(FindingSchema),
});

export type DoctorInput = z.infer<typeof DoctorInputSchema>;
export type DoctorOutput = z.infer<typeof DoctorOutputSchema>;

// ---------------------------------------------------------------------------
// Descriptor
// ---------------------------------------------------------------------------

export function makeDoctorCommand(deps: CommandDeps = defaultDeps) {
  return defineCommand({
    id: "doctor",
    path: ["doctor"],
    summary: "Diagnose drift and config validity (read-only)",
    inputSchema: DoctorInputSchema,
    outputSchema: DoctorOutputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false },
    async run(_args, ctx): Promise<CommandResult<DoctorOutput>> {
      const config = await loadProjectConfig(ctx.cwd);
      if (!config.ok) {
        return {
          kind: "error",
          code: config.code,
          message: config.message,
          hint: "Fix patterson.config.ts, then re-run `patterson doctor`.",
        };
      }
      const ir = config.ir;

      // Dry-run emission: full drift comparison, zero writes.
      const outcome = await runEmitPipeline(ir, ctx.cwd, { dryRun: true }, deps);

      const registry = new CheckRegistry();
      registry.register({
        id: "config.valid",
        description: "patterson.config.ts parses into a valid Patterson IR",
        run: async (): Promise<Finding[]> => [
          {
            checkId: "config.valid",
            severity: "info",
            message: `Config valid: project "${ir.name}", targets [${ir.targets.join(", ")}].`,
            path: "patterson.config.ts",
          },
        ],
      });
      registry.register({
        id: "emit.drift",
        description: "Emitted files match their recorded provenance",
        run: async (): Promise<Finding[]> =>
          outcome.apply.conflicts.map((conflict) => ({
            checkId: "emit.drift",
            severity: "error",
            message: describeConflict(conflict),
            path: conflict.path,
            fix:
              conflict.currentHash === ABSENT_HASH
                ? `patterson sync ${RESOLVING_FLAG} (recreates the deleted content)`
                : `patterson sync ${RESOLVING_FLAG}`,
          })),
      });
      registry.register({
        id: "emit.pending",
        description: "All compiled output has been emitted",
        run: async (): Promise<Finding[]> =>
          outcome.apply.written.length > 0
            ? [
                {
                  checkId: "emit.pending",
                  severity: "warn",
                  message: `${outcome.apply.written.length} file(s) pending emission: ${outcome.apply.written.join(", ")}.`,
                  fix: "patterson sync",
                },
              ]
            : [],
      });
      registry.register({
        id: "emit.targets",
        description: "Every configured target has an emitter",
        run: async (): Promise<Finding[]> =>
          outcome.unsupported.map((target) => ({
            checkId: "emit.targets",
            severity: "warn",
            message: `Target "${target}" has no emitter in this phase; its files are not managed yet.`,
          })),
      });

      const report = await registry.runAll({ cwd: ctx.cwd, ir });

      if (outcome.apply.conflicts.length > 0) {
        return {
          kind: "conflicts",
          conflicts: toCommandConflicts(outcome.apply.conflicts),
          resolvingFlag: RESOLVING_FLAG,
        };
      }

      return {
        kind: "ok",
        value: report,
        report: {
          summary: report.ok
            ? `doctor: 0 drift conflicts, ${report.summary.warn} warning(s).`
            : `doctor: ${report.summary.error} error(s), ${report.summary.warn} warning(s).`,
          details: report.findings.map((finding) => `[${finding.severity}] ${finding.message}`),
        },
      };
    },
  });
}

export const doctorCommand = makeDoctorCommand();
