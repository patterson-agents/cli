/**
 * E-P6 — devcontainer(+codespaces) emitter: C10 lifecycle type preservation,
 * C15 prompt-only secrets, community-feature gaps, one-emitter-two-targets.
 */
import { describe, expect, test } from "bun:test";

import { captureSnapshot, PattersonProjectSchema, type FileOp } from "@patterson/core";
import { compileDevcontainer, DEVCONTAINER_PATH } from "../src/index.ts";

/** Reassemble the merge-patch op into the config object it writes. */
// oxlint-disable-next-line no-explicit-any -- test-only convenience accessor
function configOf(op: FileOp | undefined): Record<string, any> {
  const config: Record<string, unknown> = {};
  for (const entry of op?.patch ?? []) config[String(entry.keyPath[0])] = entry.value;
  return config;
}

async function emptySnapshot() {
  return captureSnapshot("/tmp", []);
}

function baseIr(overrides: Record<string, unknown> = {}) {
  return PattersonProjectSchema.parse({
    version: 1,
    name: "envproj",
    targets: ["devcontainer"],
    ...overrides,
  });
}

describe("devcontainer emitter", () => {
  test("no devcontainer/codespaces target ⇒ no ops", async () => {
    const ir = PattersonProjectSchema.parse({ version: 1, name: "x", targets: ["claude-code"] });
    const out = compileDevcontainer(ir, await emptySnapshot());
    expect(out.ops).toEqual([]);
  });

  test("C10: lifecycle values keep their author-provided types", async () => {
    const ir = baseIr({
      env: {
        image: "oven/bun:1.3.14",
        lifecycle: {
          onCreate: "bun install",
          postCreate: ["bun", "run", "setup.ts"],
          postStart: { server: "bun run dev", watch: ["bun", "test", "--watch"] },
        },
      },
    });
    const out = compileDevcontainer(ir, await emptySnapshot());
    const op = out.ops.find((candidate) => candidate.path === DEVCONTAINER_PATH);
    const config = configOf(op);
    expect(config.onCreateCommand).toBe("bun install");
    expect(config.postCreateCommand).toEqual(["bun", "run", "setup.ts"]);
    expect(config.postStartCommand).toEqual({ server: "bun run dev", watch: ["bun", "test", "--watch"] });
  });

  test("C15: secrets are prompt-only — codespaces block + instruct note, never values", async () => {
    const ir = baseIr({
      targets: ["devcontainer", "codespaces"],
      env: { image: "oven/bun:1.3.14", secrets: [{ kind: "env", name: "API_TOKEN" }] },
    });
    const out = compileDevcontainer(ir, await emptySnapshot());
    const config = configOf(out.ops.find((candidate) => candidate.path === DEVCONTAINER_PATH));
    expect(config.secrets.API_TOKEN.description).toContain("configure in GitHub");
    expect(JSON.stringify(config)).not.toContain("value");

    const instruct = out.ops.find((candidate) => candidate.mode === "instruct");
    expect(instruct?.content).toContain("API_TOKEN");
    expect(instruct?.content).toContain("Prebuilds do NOT see user secrets");
  });

  test("community features emit but are flagged as supply-chain gaps", async () => {
    const ir = baseIr({
      env: { image: "oven/bun:1.3.14", features: [{ id: "ghcr.io/x/feature:1" }] },
    });
    const out = compileDevcontainer(ir, await emptySnapshot());
    const config = configOf(out.ops[0]);
    expect(config.features["ghcr.io/x/feature:1"]).toEqual({});
    expect(out.gaps.some((gap) => gap.reason.includes("Dockerfile RUN"))).toBe(true);
  });

  test("codespaces prebuild note: postCreate without updateContent gaps", async () => {
    const ir = baseIr({
      targets: ["codespaces"],
      env: { image: "oven/bun:1.3.14", lifecycle: { postCreate: "bun install" } },
    });
    const out = compileDevcontainer(ir, await emptySnapshot());
    expect(out.gaps.some((gap) => gap.reason.includes("updateContentCommand"))).toBe(true);
  });

  test("extensions land in customizations.vscode", async () => {
    const ir = baseIr({ extensions: [{ id: "dbaeumer.vscode-eslint" }] });
    const out = compileDevcontainer(ir, await emptySnapshot());
    const config = configOf(out.ops[0]);
    expect(config.customizations.vscode.extensions).toEqual(["dbaeumer.vscode-eslint"]);
  });
});
