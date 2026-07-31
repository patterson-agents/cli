/**
 * Golden regenerator for the fixture suite (T021).
 *
 * Usage: bun packages/emitters/claude-code/tools/gen-goldens.ts
 *
 * Rewrites every fixture's expected/ops.json and expected-gaps.json from the
 * CURRENT emitter output. Only run when an intentional output change has been
 * reviewed — goldens exist to catch unintentional changes.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";

import { captureSnapshot, PattersonProjectSchema } from "@patterson/core";

import { compileClaudeCode, snapshotPaths } from "../src/index.ts";

const FIXTURES = join(import.meta.dir, "..", "test", "fixtures");

for (const name of readdirSync(FIXTURES).toSorted()) {
  const dir = join(FIXTURES, name);
  const ir = PattersonProjectSchema.parse(await Bun.file(join(dir, "ir.json")).json());
  const snapshot = await captureSnapshot(join(dir, "before"), snapshotPaths(ir));
  const { ops, gaps } = compileClaudeCode(ir, snapshot);
  await Bun.write(join(dir, "expected", "ops.json"), `${JSON.stringify(ops, null, 2)}\n`);
  await Bun.write(join(dir, "expected-gaps.json"), `${JSON.stringify(gaps, null, 2)}\n`);
  console.log(name, "ops:", ops.length, "gaps:", gaps.length);
}
