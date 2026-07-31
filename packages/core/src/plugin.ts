/**
 * definePattersonPlugin — plugin surface, TYPES ONLY (T017).
 *
 * v1 ships the interface and the identity helper so first-party packages and
 * early adopters can author plugins against a stable shape. The loading
 * mechanism (discovery, sandboxing, out-of-process fallback) is deliberately
 * deferred to P8, gated on spike S4 — nothing here reads, resolves, or
 * executes anything.
 *
 * The contribution slots below are structural minimums, not the full concrete
 * types: the registry's `CommandDescriptor` (contracts/command-registry.md)
 * and the emitter contract's `Emitter` (contracts/emitter.md) each satisfy
 * their slot structurally. Keeping the slots minimal here avoids a hard
 * dependency on those modules and lets P8 tighten the types without breaking
 * plugin authors. `checks` is fully typed already because the check registry
 * lives in core (T016).
 */
import type { CheckDef } from "./checks/index.ts";
import type { TargetId } from "./ir/index.ts";

/**
 * A command contribution — structurally satisfied by a registry
 * `CommandDescriptor` (`{id, path[], summary, inputSchema, outputSchema,
 * annotations, run}`). Tightened to the concrete type in P8.
 */
export interface PluginCommandContribution {
  /** Registry id, e.g. "skills.audit". */
  readonly id: string;
}

/**
 * An emitter contribution — structurally satisfied by the emitter contract's
 * `Emitter` (`{targets, compile(ir, snapshot)}`). Tightened in P8.
 */
export interface PluginEmitterContribution {
  /** Targets the emitter compiles for, or "cross" for cross-cutting passes. */
  readonly targets: readonly TargetId[] | "cross";
}

/** A generator contribution (P5 surface). Tightened in P8. */
export interface PluginGeneratorContribution {
  readonly id: string;
}

/**
 * A tutor lesson contribution (P7 surface; lesson `validate` steps reference
 * core checks via CheckRef — the tutor owns no validators). Tightened in P8.
 */
export interface PluginLessonContribution {
  readonly id: string;
}

export interface PattersonPlugin {
  /** Plugin name (npm-package-style identifier recommended). */
  name: string;
  commands?: readonly PluginCommandContribution[];
  emitters?: readonly PluginEmitterContribution[];
  checks?: readonly CheckDef[];
  generators?: readonly PluginGeneratorContribution[];
  lessons?: readonly PluginLessonContribution[];
}

/**
 * Identity helper for authoring plugins with full type inference:
 *
 * ```ts
 * export default definePattersonPlugin({
 *   name: "my-plugin",
 *   checks: [myCheck],
 * });
 * ```
 *
 * Performs no registration, loading, or IO — it exists purely so authors get
 * typechecking and editors get completion.
 */
export function definePattersonPlugin<const P extends PattersonPlugin>(plugin: P): P {
  return plugin;
}
