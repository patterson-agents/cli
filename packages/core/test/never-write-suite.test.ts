/**
 * Suite-level never-write enforcement (data-model.md "Never-write list",
 * Constitution II): instrument the write layer (Bun.write) and run the emit
 * engine through every write-producing code path — own/merge/instruct tiers,
 * accepted-overwrite backups, provenance saves, settings.local.json first
 * creation, and rejected forbidden batches — then assert from the recorded
 * write log that no never-write path was EVER opened for write, including by
 * modules that write outside applyFileOps (backup.ts, provenance.ts).
 *
 * Unit-level guard tests (emit.test.ts) verify assertWritable's behavior; this
 * test verifies the property at the write-syscall boundary, which is what
 * catches a future code path that bypasses the guard.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { applyFileOps, PattersonNeverWriteError, type FileOp } from "../src/index.ts";

const roots: string[] = [];

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "patterson-nw-suite-"));
  roots.push(root);
  return root;
}

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

/** Paths recorded while the spy is installed, normalized to forward slashes. */
function installWriteSpy(): { writes: string[]; restore: () => void } {
  const writes: string[] = [];
  const bunAsRecord = Bun as unknown as Record<string, unknown>;
  const originalWrite = bunAsRecord["write"] as (...args: unknown[]) => Promise<number>;
  bunAsRecord["write"] = (...args: unknown[]): Promise<number> => {
    const dest = args[0];
    writes.push(String(dest).replaceAll("\\", "/"));
    return originalWrite(...args);
  };
  return {
    writes,
    restore: () => {
      bunAsRecord["write"] = originalWrite;
    },
  };
}

describe("suite-level never-write enforcement", () => {
  test("a full engine workflow never opens a never-write path for write", async () => {
    const root = makeRoot();

    // Harness fixtures (user-owned files that exist before the engine runs) —
    // written BEFORE the spy is installed so only engine writes are recorded.
    await Bun.write(join(root, "skills-lock.json"), '{"locked": true}\n');
    await Bun.write(join(root, ".agents/.skill-lock.json"), "{}\n");
    await Bun.write(join(root, "drifty.txt"), "generated\n");

    const spy = installWriteSpy();
    try {
      // 1. Every tier at once: own + markdown sentinel + structured merge +
      //    instruct (SETUP.md) + provenance save + settings.local first creation.
      const batch: FileOp[] = [
        { path: "lefthook.yml", format: "yaml", mode: "own", content: "pre-commit:\n" },
        { path: "AGENTS.md", format: "markdown", mode: "merge", sentinelId: "core", content: "Body." },
        { path: "cfg.json", format: "json", mode: "merge", patch: [{ keyPath: ["model"], value: "sonnet" }] },
        { path: "manual.yml", format: "yaml", mode: "instruct", content: "do it" },
        { path: ".claude/settings.local.json", format: "jsonc", mode: "own", content: "{}\n" },
        { path: "drifty.txt", format: "text", mode: "own", content: "generated\n" },
        // Symlink materialization (the second guarded write path).
        {
          path: ".claude/skills/deploy",
          format: "text",
          mode: "own",
          content: "../../.agents/skills/deploy",
          linkMode: "symlink",
        },
      ];
      const first = await applyFileOps(batch, { root, irHash: "sha256:" + "0".repeat(64) });
      expect(first.conflicts).toEqual([]);

      // 2. Drift + acceptGenerated → backup.ts write path exercised.
      await Bun.write(join(root, "drifty.txt"), "hand edited\n");
      const accepted = await applyFileOps(
        [{ path: "drifty.txt", format: "text", mode: "own", content: "generated v2\n" }],
        { root, irHash: "sha256:" + "0".repeat(64), acceptGenerated: true },
      );
      expect(accepted.backups).toHaveLength(1);

      // 3. Forbidden batches are rejected before any write.
      const forbidden: FileOp[][] = [
        [{ path: "skills-lock.json", format: "json", mode: "own", content: "{}" }],
        [{ path: ".agents/.skill-lock.json", format: "json", mode: "own", content: "{}" }],
        [{ path: ".claude/settings.local.json", format: "jsonc", mode: "own", content: "{ }\n" }],
        // A symlink op may not target a never-write path either.
        [{ path: "skills-lock.json", format: "text", mode: "own", content: "../x", linkMode: "symlink" }],
      ];
      for (const ops of forbidden) {
        expect(
          applyFileOps(ops, { root, irHash: "sha256:" + "0".repeat(64), acceptGenerated: true }),
        ).rejects.toThrow(PattersonNeverWriteError);
      }
    } finally {
      spy.restore();
    }

    // The write-log assertion the spec asks for: never-write paths were never
    // opened for write by the engine, anywhere.
    const engineWrites = spy.writes;
    expect(engineWrites.length).toBeGreaterThan(0);
    for (const path of engineWrites) {
      expect(path.endsWith("skills-lock.json")).toBe(false);
      expect(path.endsWith(".skill-lock.json")).toBe(false);
    }
    const settingsLocalWrites = engineWrites.filter((p) =>
      p.endsWith(".claude/settings.local.json"),
    );
    expect(settingsLocalWrites).toHaveLength(1); // first creation only, never again
  });
});
