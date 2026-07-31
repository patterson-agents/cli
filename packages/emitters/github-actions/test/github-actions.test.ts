/**
 * E-P6 — github-actions emitter: least-privilege workflows, C13 provenance
 * step, S7 experimental gating, lefthook/commitlint, patterson-* namespacing.
 */
import { describe, expect, test } from "bun:test";

import { captureSnapshot, PattersonProjectSchema } from "@patterson/core";
import { compileGithubActions } from "../src/index.ts";

async function emptySnapshot() {
  return captureSnapshot("/tmp", []);
}

function irWithDevops(devops: Record<string, unknown>) {
  return PattersonProjectSchema.parse({
    version: 1,
    name: "ciproj",
    targets: ["github-actions"],
    devops,
  });
}

describe("github-actions emitter", () => {
  test("ci workflow: patterson-namespaced, least-privilege, pinned setup-bun, chosen linter", async () => {
    const out = compileGithubActions(
      irWithDevops({ workflows: ["ci"], lint: "oxlint" }),
      await emptySnapshot(),
    );
    const ci = out.ops.find((op) => op.path === ".github/workflows/patterson-ci.yml");
    expect(ci?.mode).toBe("own");
    expect(ci?.content).toContain("permissions:\n  contents: read");
    expect(ci?.content).toContain("oven-sh/setup-bun@v2");
    expect(ci?.content).toContain("bunx oxlint .");
    expect(ci?.content).toContain("--frozen-lockfile");
  });

  test("release workflow: C13 Node-24 npm --provenance step + S7 experimental gap", async () => {
    const out = compileGithubActions(
      irWithDevops({ workflows: ["release"], lint: "oxlint", release: { provenance: true } }),
      await emptySnapshot(),
    );
    const release = out.ops.find((op) => op.path === ".github/workflows/patterson-release.yml");
    expect(release?.content).toContain("node-version: 24");
    expect(release?.content).toContain("npm publish ./dist/*.tgz --provenance");
    expect(release?.content).toContain("id-token: write");
    // Single-package only until S7's changesets story: gap reported.
    expect(out.gaps.some((gap) => gap.reason.includes("S7-gated"))).toBe(true);

    const experimental = compileGithubActions(
      irWithDevops({
        workflows: ["release"],
        lint: "oxlint",
        release: { provenance: true, monorepo: "experimental" },
      }),
      await emptySnapshot(),
    );
    expect(experimental.gaps.some((gap) => gap.reason.includes("S7-gated"))).toBe(false);
  });

  test("security workflow ships socket ci + token instruct note", async () => {
    const out = compileGithubActions(
      irWithDevops({ workflows: ["security"], lint: "oxlint" }),
      await emptySnapshot(),
    );
    expect(out.ops.find((op) => op.path === ".github/workflows/patterson-security.yml")?.content).toContain(
      "bunx socket ci",
    );
    expect(out.ops.find((op) => op.mode === "instruct")?.content).toContain("SOCKET_API_TOKEN");
  });

  test("commit tooling: lefthook.yml + commitlint config from devops.commit", async () => {
    const out = compileGithubActions(
      irWithDevops({ workflows: [], lint: "biome", commit: { conventional: true, lefthook: true } }),
      await emptySnapshot(),
    );
    const lefthook = out.ops.find((op) => op.path === "lefthook.yml");
    expect(lefthook?.content).toContain("bunx biome check .");
    expect(lefthook?.content).toContain("commitlint --edit");
    expect(out.ops.some((op) => op.path === "commitlint.config.js")).toBe(true);
  });

  test("dependabot config is actions-only (packages stay socket-gated)", async () => {
    const out = compileGithubActions(
      irWithDevops({ workflows: [], lint: "oxlint", depUpdates: "dependabot-actions-only" }),
      await emptySnapshot(),
    );
    const dependabot = out.ops.find((op) => op.path === ".github/dependabot.yml");
    expect(dependabot?.content).toContain("package-ecosystem: github-actions");
    expect(dependabot?.content).not.toContain("package-ecosystem: npm");
  });

  test("github-actions targeted without devops ⇒ gap, no ops", async () => {
    const ir = PattersonProjectSchema.parse({ version: 1, name: "x", targets: ["github-actions"] });
    const out = compileGithubActions(ir, await emptySnapshot());
    expect(out.ops).toEqual([]);
    expect(out.gaps[0]?.entityId).toBe("devops");
  });
});
