/**
 * CLI entry smoke: the citty tree lazily maps registry entries and `--help`
 * lists every skeleton command.
 */
import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const ENTRY = join(import.meta.dir, "..", "src", "index.ts");

async function runCli(args: string[]): Promise<{ code: number; out: string; err: string }> {
  const proc = Bun.spawn(["bun", ENTRY, ...args], {
    stdout: "pipe",
    stderr: "pipe",
    stdin: "ignore",
    env: { ...process.env, CI: "true" },
  });
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { code, out, err };
}

describe("patterson CLI entry", () => {
  test("--help exits 0 and lists all skeleton commands", async () => {
    const { code, out, err } = await runCli(["--help"]);
    expect(code).toBe(0);
    const text = out + err;
    for (const command of ["create", "init", "sync", "doctor", "check"]) {
      expect(text).toContain(command);
    }
  });

  test("subcommand --help resolves the lazy citty mapping", async () => {
    const { code, out, err } = await runCli(["sync", "--help"]);
    expect(code).toBe(0);
    const text = out + err;
    expect(text).toContain("--accept-generated");
    expect(text).toContain("--dry-run");
  });
});
