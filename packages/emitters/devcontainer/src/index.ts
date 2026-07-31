/**
 * @patterson/emitter-devcontainer — ONE emitter, TWO targets (E-P6):
 * `devcontainer` and `codespaces` (plan.md: codespaces is owned by the
 * devcontainer emitter — prebuild-aware notes, C15 secrets warnings).
 *
 * Contract: contracts/emitter.md — pure, deterministic, `{ops, gaps}`.
 *
 * Verified facts honored:
 * - C10: lifecycle values keep their author-provided type (string = shell,
 *   array = exec, object = parallel) — no normalization, ever.
 * - C15: devcontainer/codespaces secrets are PROMPT-ONLY — emitted as the
 *   codespaces `secrets` recommendation block plus an instruct note; never
 *   assumed populated at build time.
 * - Community features are flagged as gaps (supply-chain: prefer explicit
 *   Dockerfile RUN lines — research.md).
 * - Prebuilds run only `updateContent` (codespaces note).
 */
import type {
  CoverageGap,
  Emitter,
  FileOp,
  FsSnapshot,
  KeyPathPatch,
  PattersonProject,
  SecretRef,
} from "@patterson/core";

export const DEVCONTAINER_PATH = ".devcontainer/devcontainer.json";

export interface CompileOutput {
  ops: FileOp[];
  gaps: CoverageGap[];
}

function targetsAny(ir: PattersonProject): boolean {
  return ir.targets.includes("devcontainer") || ir.targets.includes("codespaces");
}

function secretName(secret: SecretRef): string {
  switch (secret.kind) {
    case "env":
      return secret.name;
    case "prompt":
    case "pick":
    case "command":
      return secret.id;
    case "helper":
      return secret.command;
  }
}

/** Full compile: FileOps plus CoverageGaps (contracts/emitter.md obligation 3). */
export function compileDevcontainer(ir: PattersonProject, _snapshot: FsSnapshot): CompileOutput {
  const ops: FileOp[] = [];
  const gaps: CoverageGap[] = [];
  if (!targetsAny(ir)) return { ops, gaps };

  const env = ir.env ?? {};
  const forCodespaces = ir.targets.includes("codespaces");

  const config: Record<string, unknown> = { name: ir.name };
  if (env.image !== undefined) config["image"] = env.image;
  if (env.dockerfile !== undefined) config["build"] = { dockerfile: env.dockerfile };
  if (env.image === undefined && env.dockerfile === undefined) {
    // Bun-first default, pinned digest-less but versioned (no :latest).
    config["image"] = "oven/bun:1.3.14";
  }

  if (env.features !== undefined && env.features.length > 0) {
    config["features"] = Object.fromEntries(
      env.features.map((feature) => [feature.id, feature.options ?? {}]),
    );
    for (const feature of env.features) {
      gaps.push({
        fallbackApplied: true,
        entityId: `env.features.${feature.id}`,
        targetId: "devcontainer",
        reason:
          `Community devcontainer feature "${feature.id}" runs third-party install code at build ` +
          "time; prefer an explicit Dockerfile RUN line (supply-chain gate) — kept, but review it.",
      });
    }
  }

  // C10: pass lifecycle values through EXACTLY as authored.
  const lifecycle = env.lifecycle ?? {};
  if (lifecycle.onCreate !== undefined) config["onCreateCommand"] = lifecycle.onCreate;
  if (lifecycle.updateContent !== undefined) config["updateContentCommand"] = lifecycle.updateContent;
  if (lifecycle.postCreate !== undefined) config["postCreateCommand"] = lifecycle.postCreate;
  if (lifecycle.postStart !== undefined) config["postStartCommand"] = lifecycle.postStart;

  if (env.ports !== undefined && env.ports.length > 0) config["forwardPorts"] = env.ports;
  if (env.hostRequirements !== undefined) config["hostRequirements"] = env.hostRequirements;

  const vscodeExtensions = ir.extensions
    .filter((extension) => extension.targets === undefined || extension.targets.includes("devcontainer") || extension.targets.includes("vscode"))
    .map((extension) => extension.id);
  if (vscodeExtensions.length > 0) {
    config["customizations"] = { vscode: { extensions: vscodeExtensions } };
  }

  // C15: secrets are prompt-only. The devcontainer spec's `secrets` key is a
  // Codespaces RECOMMENDATION (descriptions shown in the creation UI) — the
  // values are configured in the GitHub UI, never in this file.
  const secrets = env.secrets ?? [];
  if (secrets.length > 0 && forCodespaces) {
    config["secrets"] = Object.fromEntries(
      secrets.map((secret) => [
        secretName(secret),
        { description: `Required by ${ir.name} (configure in GitHub → Codespaces secrets)` },
      ]),
    );
  }

  // Key-path surgery (merge + patch): patterson owns exactly the keys it
  // writes; foreign keys in a pre-existing devcontainer.json survive.
  const patch: KeyPathPatch[] = Object.entries(config).map(([key, value]) => ({
    keyPath: [key],
    value,
  }));
  ops.push({ path: DEVCONTAINER_PATH, format: "json", mode: "merge", patch });

  if (secrets.length > 0) {
    ops.push({
      path: "devcontainer/secrets",
      format: "markdown",
      mode: "instruct",
      content: [
        `Configure ${secrets.length} secret(s) for the dev container (values are never stored in-repo):`,
        ...secrets.map((secret) => `- \`${secretName(secret)}\` (${secret.kind})`),
        forCodespaces
          ? "Codespaces: repository → Settings → Secrets and variables → Codespaces. Prebuilds do NOT see user secrets."
          : "Local devcontainers: provide them via your shell environment or a local .env excluded from git.",
      ].join("\n"),
    });
  }

  if (forCodespaces && lifecycle.updateContent === undefined && lifecycle.postCreate !== undefined) {
    gaps.push({
      fallbackApplied: true,
      entityId: "env.lifecycle.postCreate",
      targetId: "codespaces",
      reason:
        "Codespaces prebuilds run ONLY updateContentCommand; postCreateCommand runs per-codespace. " +
        "Move cacheable setup into lifecycle.updateContent for prebuild speedups.",
    });
  }

  return { ops, gaps };
}

/** Core-contract emitter (gaps available via compileDevcontainer). */
export const devcontainerEmitter: Emitter = {
  targets: ["devcontainer", "codespaces"],
  compile(ir, snapshot) {
    return compileDevcontainer(ir, snapshot).ops;
  },
};

export function snapshotPaths(_ir: PattersonProject): string[] {
  return [DEVCONTAINER_PATH];
}

export function coverageGaps(ir: PattersonProject, snapshot: FsSnapshot): CoverageGap[] {
  return compileDevcontainer(ir, snapshot).gaps;
}
