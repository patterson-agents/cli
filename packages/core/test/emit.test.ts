/**
 * T014 — Emit engine tests (written before/with the T015 implementation per
 * constitution Development Workflow: tests-first for core mechanisms).
 *
 * Covers the T014 list from tasks.md:
 *   - FileOp apply for own/merge/instruct
 *   - sentinel insert/replace/hand-edit-detect (hash mismatch)
 *   - jsonc key-path surgery preserving comments + unknown keys
 *   - emitted.json record/compare
 *   - OWN-tier drift protection
 *   - non-interactive conflict behavior (keep + report, resolving flag named)
 *   - foreign-key adoption marking
 *   - never-write guard (attempt → hard error)
 * plus backup util, FsSnapshot capture, SETUP.md rendering, and determinism
 * (no timestamps in emitted content).
 */
import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  applyFileOps,
  backupFile,
  captureSnapshot,
  classifyDrift,
  computeIrHash,
  contentHash,
  EMITTED_RELATIVE_PATH,
  findSentinel,
  loadProvenance,
  PattersonNeverWriteError,
  renderSentinelBlock,
  renderSetupMd,
  RESOLVING_FLAG,
  type ApplyOptions,
  type EmissionRecord,
  type FileOp,
} from "../src/index.ts";

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

const roots: string[] = [];

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "patterson-emit-"));
  roots.push(root);
  return root;
}

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

const FIXED_NOW = new Date("2026-07-31T12:00:00.000Z");

function opts(root: string, overrides: Partial<ApplyOptions> = {}): ApplyOptions {
  return { root, irHash: "sha256:" + "0".repeat(64), now: () => FIXED_NOW, ...overrides };
}

async function readFile(root: string, rel: string): Promise<string> {
  return Bun.file(join(root, rel)).text();
}

async function fileExists(root: string, rel: string): Promise<boolean> {
  return Bun.file(join(root, rel)).exists();
}

async function writeFixture(root: string, rel: string, content: string): Promise<void> {
  await Bun.write(join(root, rel), content);
}

// ---------------------------------------------------------------------------
// OWN tier
// ---------------------------------------------------------------------------

describe("own-tier apply", () => {
  test("writes a fresh file and records provenance", async () => {
    const root = makeRoot();
    const op: FileOp = { path: "lefthook.yml", format: "yaml", mode: "own", content: "pre-commit:\n" };

    const result = await applyFileOps([op], opts(root));

    expect(result.conflicts).toEqual([]);
    expect(result.written).toContain("lefthook.yml");
    expect(await readFile(root, "lefthook.yml")).toBe("pre-commit:\n");

    const records = await loadProvenance(root);
    const rec = records.get("lefthook.yml");
    expect(rec).toBeDefined();
    expect(rec?.mode).toBe("own");
    expect(rec?.contentHash).toBe(contentHash("pre-commit:\n"));
    expect(rec?.irHash).toBe("sha256:" + "0".repeat(64));
    expect(rec?.emittedAt).toBe(FIXED_NOW.toISOString());
  });

  test("clean re-emit rewrites without conflict", async () => {
    const root = makeRoot();
    const v1: FileOp = { path: "a.txt", format: "text", mode: "own", content: "one\n" };
    const v2: FileOp = { path: "a.txt", format: "text", mode: "own", content: "two\n" };

    await applyFileOps([v1], opts(root));
    const result = await applyFileOps([v2], opts(root));

    expect(result.conflicts).toEqual([]);
    expect(await readFile(root, "a.txt")).toBe("two\n");
  });

  test("OWN-tier drift protection: hand-edit is kept and reported", async () => {
    const root = makeRoot();
    const op: FileOp = { path: "a.txt", format: "text", mode: "own", content: "generated\n" };
    await applyFileOps([op], opts(root));

    await writeFixture(root, "a.txt", "hand edited\n");
    const next: FileOp = { path: "a.txt", format: "text", mode: "own", content: "generated v2\n" };
    const result = await applyFileOps([next], opts(root));

    // Non-interactive behavior: keep + report, never clobber; the resolving flag is named.
    expect(await readFile(root, "a.txt")).toBe("hand edited\n");
    expect(result.written).not.toContain("a.txt");
    expect(result.conflicts).toHaveLength(1);
    const conflict = result.conflicts[0];
    expect(conflict?.path).toBe("a.txt");
    expect(conflict?.reason).toBe("hand-edited");
    expect(conflict?.resolvingFlag).toBe(RESOLVING_FLAG);
    expect(conflict?.currentHash).toBe(contentHash("hand edited\n"));

    // Recorded baseline is untouched so the same conflict reproduces on re-run.
    const rec = (await loadProvenance(root)).get("a.txt");
    expect(rec?.contentHash).toBe(contentHash("generated\n"));
  });

  test("acceptGenerated overwrites drift and backs the file up first", async () => {
    const root = makeRoot();
    await applyFileOps([{ path: "a.txt", format: "text", mode: "own", content: "generated\n" }], opts(root));
    await writeFixture(root, "a.txt", "hand edited\n");

    const result = await applyFileOps(
      [{ path: "a.txt", format: "text", mode: "own", content: "generated v2\n" }],
      opts(root, { acceptGenerated: true }),
    );

    expect(result.conflicts).toEqual([]);
    expect(await readFile(root, "a.txt")).toBe("generated v2\n");
    expect(result.backups).toHaveLength(1);
    const backupRel = result.backups[0];
    expect(backupRel).toStartWith(".patterson/backup/");
    expect(backupRel).toContain("a.txt");
    expect(await readFile(root, backupRel ?? "")).toBe("hand edited\n");
  });

  test("pre-existing unrecorded file with different content is a conflict, not an overwrite", async () => {
    const root = makeRoot();
    await writeFixture(root, "a.txt", "was here first\n");

    const result = await applyFileOps(
      [{ path: "a.txt", format: "text", mode: "own", content: "generated\n" }],
      opts(root),
    );

    expect(await readFile(root, "a.txt")).toBe("was here first\n");
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.reason).toBe("unrecorded");
  });

  test("adoption marks a pre-existing own-tier file foreign and never overwrites it", async () => {
    const root = makeRoot();
    await writeFixture(root, "a.txt", "user content\n");

    const first = await applyFileOps(
      [{ path: "a.txt", format: "text", mode: "own", content: "generated\n" }],
      opts(root, { adopt: true }),
    );
    expect(first.conflicts).toEqual([]);
    expect(await readFile(root, "a.txt")).toBe("user content\n");

    const rec = (await loadProvenance(root)).get("a.txt");
    expect(rec?.foreign).toContain("content");

    // Subsequent non-adopt sync still skips it silently (foreign, not a conflict).
    const second = await applyFileOps(
      [{ path: "a.txt", format: "text", mode: "own", content: "generated v2\n" }],
      opts(root),
    );
    expect(second.conflicts).toEqual([]);
    expect(second.foreignSkipped).toContain("a.txt");
    expect(await readFile(root, "a.txt")).toBe("user content\n");
  });
});

// ---------------------------------------------------------------------------
// Deletion drift — hand-deletion of managed content is drift, not a no-op
// ---------------------------------------------------------------------------

describe("deletion drift", () => {
  test("own-tier: deleting an emitted file is kept + reported, not silently recreated", async () => {
    const root = makeRoot();
    await applyFileOps([{ path: "gen.txt", format: "text", mode: "own", content: "generated\n" }], opts(root));
    rmSync(join(root, "gen.txt"));

    const result = await applyFileOps(
      [{ path: "gen.txt", format: "text", mode: "own", content: "generated\n" }],
      opts(root),
    );

    expect(await fileExists(root, "gen.txt")).toBe(false);
    expect(result.written).not.toContain("gen.txt");
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.path).toBe("gen.txt");
    expect(result.conflicts[0]?.reason).toBe("hand-edited");
    expect(result.conflicts[0]?.recordedHash).toBe(contentHash("generated\n"));
    expect(result.conflicts[0]?.resolvingFlag).toBe(RESOLVING_FLAG);
  });

  test("own-tier: acceptGenerated recreates a deleted file", async () => {
    const root = makeRoot();
    await applyFileOps([{ path: "gen.txt", format: "text", mode: "own", content: "generated\n" }], opts(root));
    rmSync(join(root, "gen.txt"));

    const result = await applyFileOps(
      [{ path: "gen.txt", format: "text", mode: "own", content: "generated\n" }],
      opts(root, { acceptGenerated: true }),
    );

    expect(result.conflicts).toEqual([]);
    expect(await readFile(root, "gen.txt")).toBe("generated\n");
  });

  test("markdown: deleting an emitted sentinel block is kept + reported, not re-appended", async () => {
    const root = makeRoot();
    const op: FileOp = { path: "AGENTS.md", format: "markdown", mode: "merge", sentinelId: "core", content: "Body." };
    await applyFileOps([op], opts(root));

    // User deletes the managed region (keeps the rest of the file).
    await writeFixture(root, "AGENTS.md", "# My own notes\n");

    const result = await applyFileOps([op], opts(root));

    expect(await readFile(root, "AGENTS.md")).toBe("# My own notes\n");
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.sentinelId).toBe("core");
    expect(result.conflicts[0]?.reason).toBe("hand-edited");
    expect(result.conflicts[0]?.resolvingFlag).toBe(RESOLVING_FLAG);

    // acceptGenerated re-appends after backing up the file.
    const accepted = await applyFileOps([op], opts(root, { acceptGenerated: true }));
    expect(accepted.conflicts).toEqual([]);
    expect(accepted.backups).toHaveLength(1);
    expect(findSentinel(await readFile(root, "AGENTS.md"), "core")?.content).toBe("Body.");
  });

  test("structured: deleting an emitted key is kept + reported, not silently re-set", async () => {
    const root = makeRoot();
    await applyFileOps([mk("sonnet")], opts(root));
    await writeFixture(root, "cfg.json", "{}\n");

    const result = await applyFileOps([mk("sonnet")], opts(root));

    expect(await readFile(root, "cfg.json")).toBe("{}\n");
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.keyPath).toBe("/model");
    expect(result.conflicts[0]?.reason).toBe("hand-edited");

    // The conflict reproduces on re-run (baseline untouched).
    const again = await applyFileOps([mk("sonnet")], opts(root));
    expect(again.conflicts).toHaveLength(1);

    // acceptGenerated re-sets the key.
    const accepted = await applyFileOps([mk("sonnet")], opts(root, { acceptGenerated: true }));
    expect(accepted.conflicts).toEqual([]);
    expect(await readFile(root, "cfg.json")).toContain('"model": "sonnet"');
  });
});

// ---------------------------------------------------------------------------
// Markdown sentinel merge
// ---------------------------------------------------------------------------

describe("markdown sentinel merge", () => {
  const body = "Generated instructions.\nLine two.";

  test("inserts a sentinel block into a fresh file", async () => {
    const root = makeRoot();
    const op: FileOp = { path: "AGENTS.md", format: "markdown", mode: "merge", sentinelId: "core", content: body };

    await applyFileOps([op], opts(root));

    const doc = await readFile(root, "AGENTS.md");
    expect(doc).toContain(`<!-- patterson:begin id=core hash=${contentHash(body)} -->`);
    expect(doc).toContain(body);
    expect(doc).toContain("<!-- patterson:end id=core -->");

    const match = findSentinel(doc, "core");
    expect(match?.content).toBe(body);
    expect(match?.markerHash).toBe(contentHash(body));
  });

  test("appends the block while preserving existing hand-written content", async () => {
    const root = makeRoot();
    await writeFixture(root, "AGENTS.md", "# My notes\n\nHand written intro.\n");

    await applyFileOps(
      [{ path: "AGENTS.md", format: "markdown", mode: "merge", sentinelId: "core", content: body }],
      opts(root),
    );

    const doc = await readFile(root, "AGENTS.md");
    expect(doc).toStartWith("# My notes\n\nHand written intro.\n");
    expect(findSentinel(doc, "core")?.content).toBe(body);
  });

  test("replaces a clean region on re-emit, leaving surrounding text intact", async () => {
    const root = makeRoot();
    await writeFixture(root, "AGENTS.md", "before text\n");
    await applyFileOps(
      [{ path: "AGENTS.md", format: "markdown", mode: "merge", sentinelId: "core", content: body }],
      opts(root),
    );
    await applyFileOps(
      [{ path: "AGENTS.md", format: "markdown", mode: "merge", sentinelId: "core", content: "New body." }],
      opts(root),
    );

    const doc = await readFile(root, "AGENTS.md");
    expect(doc).toStartWith("before text\n");
    expect(findSentinel(doc, "core")?.content).toBe("New body.");
    expect(doc).not.toContain("Line two.");
  });

  test("hand-edit inside the sentinel (hash mismatch vs recorded) is drift: kept + reported", async () => {
    const root = makeRoot();
    await applyFileOps(
      [{ path: "AGENTS.md", format: "markdown", mode: "merge", sentinelId: "core", content: body }],
      opts(root),
    );

    const doc = await readFile(root, "AGENTS.md");
    const edited = doc.replace("Line two.", "Line two, edited by hand.");
    await writeFixture(root, "AGENTS.md", edited);

    const result = await applyFileOps(
      [{ path: "AGENTS.md", format: "markdown", mode: "merge", sentinelId: "core", content: "New body." }],
      opts(root),
    );

    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.sentinelId).toBe("core");
    expect(result.conflicts[0]?.reason).toBe("hand-edited");
    expect(result.conflicts[0]?.resolvingFlag).toBe(RESOLVING_FLAG);
    expect(await readFile(root, "AGENTS.md")).toBe(edited);
  });

  test("acceptGenerated replaces a drifted region after backing up", async () => {
    const root = makeRoot();
    await applyFileOps(
      [{ path: "AGENTS.md", format: "markdown", mode: "merge", sentinelId: "core", content: body }],
      opts(root),
    );
    const doc = await readFile(root, "AGENTS.md");
    await writeFixture(root, "AGENTS.md", doc.replace("Line two.", "edited"));

    const result = await applyFileOps(
      [{ path: "AGENTS.md", format: "markdown", mode: "merge", sentinelId: "core", content: "New body." }],
      opts(root, { acceptGenerated: true }),
    );

    expect(result.conflicts).toEqual([]);
    expect(result.backups).toHaveLength(1);
    expect(findSentinel(await readFile(root, "AGENTS.md"), "core")?.content).toBe("New body.");
  });

  test("marker hash serves as baseline when emitted.json is missing (recovery)", async () => {
    const root = makeRoot();
    await applyFileOps(
      [{ path: "AGENTS.md", format: "markdown", mode: "merge", sentinelId: "core", content: body }],
      opts(root),
    );
    rmSync(join(root, EMITTED_RELATIVE_PATH));

    const result = await applyFileOps(
      [{ path: "AGENTS.md", format: "markdown", mode: "merge", sentinelId: "core", content: "New body." }],
      opts(root),
    );

    expect(result.conflicts).toEqual([]);
    expect(findSentinel(await readFile(root, "AGENTS.md"), "core")?.content).toBe("New body.");
  });

  test("renderSentinelBlock is deterministic and timestamp-free", () => {
    const a = renderSentinelBlock("x", "hello");
    const b = renderSentinelBlock("x", "hello");
    expect(a).toBe(b);
    expect(a).toBe(`<!-- patterson:begin id=x hash=${contentHash("hello")} -->\nhello\n<!-- patterson:end id=x -->`);
  });
});

// ---------------------------------------------------------------------------
// JSONC key-path merge
// ---------------------------------------------------------------------------

/** Merge op setting cfg.json's "model" key. */
const mk = (value: string): FileOp => ({
  path: "cfg.json",
  format: "json",
  mode: "merge",
  patch: [{ keyPath: ["model"], value }],
});

/** Merge op setting both "model" and "timeoutMs" in cfg.json. */
const mkPair = (model: string, timeout: number): FileOp => ({
  path: "cfg.json",
  format: "json",
  mode: "merge",
  patch: [
    { keyPath: ["model"], value: model },
    { keyPath: ["timeoutMs"], value: timeout },
  ],
});

describe("jsonc key-path merge", () => {
  const settingsBefore = [
    "{",
    "  // user's own comment — must survive",
    '  "userKey": "user value",',
    '  "permissions": {',
    '    "allow": ["Read"]',
    "  }",
    "}",
    "",
  ].join("\n");

  test("key-path surgery preserves comments and unknown keys", async () => {
    const root = makeRoot();
    await writeFixture(root, ".vscode/settings.json", settingsBefore);

    const op: FileOp = {
      path: ".vscode/settings.json",
      format: "jsonc",
      mode: "merge",
      patch: [{ keyPath: ["patterson", "managed"], value: true }],
    };
    const result = await applyFileOps([op], opts(root));

    const after = await readFile(root, ".vscode/settings.json");
    expect(result.conflicts).toEqual([]);
    expect(after).toContain("// user's own comment — must survive");
    expect(after).toContain('"userKey": "user value"');
    expect(after).toContain('"allow": ["Read"]');
    expect(after).toContain('"patterson"');
    expect(after).toContain('"managed": true');
  });

  test("creates the file when absent and records each keyPath with value+hash", async () => {
    const root = makeRoot();
    const op: FileOp = {
      path: ".mcp.json",
      format: "json",
      mode: "merge",
      patch: [{ keyPath: ["mcpServers", "docs", "command"], value: "bunx" }],
    };
    await applyFileOps([op], opts(root));

    expect(await fileExists(root, ".mcp.json")).toBe(true);
    const rec = (await loadProvenance(root)).get(".mcp.json");
    expect(rec?.mode).toBe("merge");
    const kp = rec?.keyPaths?.find((k) => k.path === "/mcpServers/docs/command");
    expect(kp).toBeDefined();
    expect(kp?.value).toBe("bunx");
    expect(typeof kp?.hash).toBe("string");
  });

  test("clean managed key is updated on re-emit", async () => {
    const root = makeRoot();
    await applyFileOps([mk("sonnet")], opts(root));
    const result = await applyFileOps([mk("opus")], opts(root));

    expect(result.conflicts).toEqual([]);
    expect(await readFile(root, "cfg.json")).toContain('"model": "opus"');
  });

  test("hand-edited managed key is kept + reported per keyPath", async () => {
    const root = makeRoot();
    await applyFileOps([mk("sonnet")], opts(root));

    const doc = await readFile(root, "cfg.json");
    await writeFixture(root, "cfg.json", doc.replace('"sonnet"', '"my-custom-model"'));

    const result = await applyFileOps([mk("opus")], opts(root));

    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.keyPath).toBe("/model");
    expect(result.conflicts[0]?.reason).toBe("hand-edited");
    expect(await readFile(root, "cfg.json")).toContain('"my-custom-model"');

    // Baseline preserved: the conflict reproduces (not silently re-recorded).
    const again = await applyFileOps([mk("opus")], opts(root));
    expect(again.conflicts).toHaveLength(1);
  });

  test("conflicting keyPath does not block sibling clean edits in the same file", async () => {
    const root = makeRoot();
    await applyFileOps([mkPair("sonnet", 1000)], opts(root));
    const doc = await readFile(root, "cfg.json");
    await writeFixture(root, "cfg.json", doc.replace('"sonnet"', '"custom"'));

    const result = await applyFileOps([mkPair("opus", 2000)], opts(root));

    expect(result.conflicts).toHaveLength(1);
    const after = await readFile(root, "cfg.json");
    expect(after).toContain('"custom"'); // drifted key kept
    expect(after).toContain('"timeoutMs": 2000'); // clean key updated
  });

  test("foreign-key adoption: pre-existing keys are marked foreign and never overwritten", async () => {
    const root = makeRoot();
    await writeFixture(root, "cfg.json", '{\n  "model": "user-choice"\n}\n');

    const first = await applyFileOps([mk("sonnet")], opts(root, { adopt: true }));
    expect(first.conflicts).toEqual([]);
    expect(await readFile(root, "cfg.json")).toContain('"user-choice"');

    const rec = (await loadProvenance(root)).get("cfg.json");
    expect(rec?.foreign).toContain("/model");

    // Later plain sync: still hand-owned, skipped without conflict.
    const second = await applyFileOps([mk("opus")], opts(root));
    expect(second.conflicts).toEqual([]);
    expect(second.foreignSkipped).toContain("cfg.json#/model");
    expect(await readFile(root, "cfg.json")).toContain('"user-choice"');
  });
});

// ---------------------------------------------------------------------------
// Provenance store (.patterson/emitted.json)
// ---------------------------------------------------------------------------

describe("provenance store", () => {
  test("record/compare round-trip through emitted.json", async () => {
    const root = makeRoot();
    await applyFileOps(
      [
        { path: "b.txt", format: "text", mode: "own", content: "b\n" },
        { path: "a.txt", format: "text", mode: "own", content: "a\n" },
      ],
      opts(root),
    );

    const raw = JSON.parse(await readFile(root, EMITTED_RELATIVE_PATH)) as {
      version: number;
      files: EmissionRecord[];
    };
    expect(raw.version).toBe(1);
    // Deterministic ordering: sorted by path.
    expect(raw.files.map((f) => f.path)).toEqual(["a.txt", "b.txt"]);
    for (const record of raw.files) {
      expect(record.mode).toBe("own");
      expect(record.contentHash).toStartWith("sha256:");
      expect(record.emittedAt).toBe(FIXED_NOW.toISOString());
      expect(record.irHash).toStartWith("sha256:");
    }

    const reloaded = await loadProvenance(root);
    expect(reloaded.get("a.txt")?.contentHash).toBe(contentHash("a\n"));
  });

  test("classifyDrift comparator: equal → clean, differ → drifted, missing → unrecorded", () => {
    expect(classifyDrift("sha256:aa", "sha256:aa")).toBe("clean");
    expect(classifyDrift("sha256:aa", "sha256:bb")).toBe("drifted");
    expect(classifyDrift(undefined, "sha256:bb")).toBe("unrecorded");
  });
});

// ---------------------------------------------------------------------------
// Instruct tier → SETUP.md
// ---------------------------------------------------------------------------

describe("instruct tier", () => {
  test("instruct ops never touch their target path; they render into SETUP.md", async () => {
    const root = makeRoot();
    const ops: FileOp[] = [
      {
        path: ".github/workflows/copilot-setup-steps.yml",
        format: "yaml",
        mode: "instruct",
        content: "Add the COPILOT_MCP_DOCS secret in repository settings.",
      },
      {
        path: ".github/agents/reviewer.agent.md",
        format: "markdown",
        mode: "instruct",
        content: "Enable the coding agent for this repository first.",
      },
    ];

    const result = await applyFileOps(ops, opts(root));

    expect(await fileExists(root, ".github/workflows/copilot-setup-steps.yml")).toBe(false);
    expect(await fileExists(root, ".github/agents/reviewer.agent.md")).toBe(false);
    expect(result.setupPath).toBe("SETUP.md");

    const setup = await readFile(root, "SETUP.md");
    expect(setup).toContain("## .github/agents/reviewer.agent.md");
    expect(setup).toContain("## .github/workflows/copilot-setup-steps.yml");
    expect(setup).toContain("COPILOT_MCP_DOCS");
    // Deterministic ordering: sorted by path (agents before workflows).
    expect(setup.indexOf("reviewer.agent.md")).toBeLessThan(setup.indexOf("copilot-setup-steps.yml"));
  });

  test("renderSetupMd is deterministic and ignores non-instruct ops", () => {
    const ops: FileOp[] = [
      { path: "z.yml", format: "yaml", mode: "instruct", content: "step z" },
      { path: "a.yml", format: "yaml", mode: "instruct", content: "step a" },
      { path: "own.txt", format: "text", mode: "own", content: "not included" },
    ];
    const a = renderSetupMd(ops);
    expect(a).toBe(renderSetupMd([...ops]));
    expect(a).not.toContain("not included");
    expect(a.indexOf("step a")).toBeLessThan(a.indexOf("step z"));
  });

  test("SETUP.md itself gets drift protection (own tier through the same path)", async () => {
    const root = makeRoot();
    const ops: FileOp[] = [{ path: "x.yml", format: "yaml", mode: "instruct", content: "do the thing" }];
    await applyFileOps(ops, opts(root));

    await writeFixture(root, "SETUP.md", "user rewrote this\n");
    const result = await applyFileOps(
      [{ path: "x.yml", format: "yaml", mode: "instruct", content: "do the OTHER thing" }],
      opts(root),
    );

    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.path).toBe("SETUP.md");
    expect(await readFile(root, "SETUP.md")).toBe("user rewrote this\n");
  });
});

// ---------------------------------------------------------------------------
// Never-write guard
// ---------------------------------------------------------------------------

describe("never-write guard", () => {
  test("skills-lock.json is never written", async () => {
    const root = makeRoot();
    const op: FileOp = { path: "skills-lock.json", format: "json", mode: "own", content: "{}" };
    expect(applyFileOps([op], opts(root))).rejects.toThrow(PattersonNeverWriteError);
    expect(await fileExists(root, "skills-lock.json")).toBe(false);
  });

  test(".skill-lock.json is refused in any directory", async () => {
    const root = makeRoot();
    const op: FileOp = { path: ".agents/.skill-lock.json", format: "json", mode: "own", content: "{}" };
    expect(applyFileOps([op], opts(root))).rejects.toThrow(PattersonNeverWriteError);
  });

  test("guard rejects merge-tier attempts too, even with acceptGenerated", async () => {
    const root = makeRoot();
    await writeFixture(root, "skills-lock.json", '{"locked": true}\n');
    const op: FileOp = {
      path: "skills-lock.json",
      format: "json",
      mode: "merge",
      patch: [{ keyPath: ["locked"], value: false }],
    };
    expect(applyFileOps([op], opts(root, { acceptGenerated: true }))).rejects.toThrow(PattersonNeverWriteError);
    expect(await readFile(root, "skills-lock.json")).toBe('{"locked": true}\n');
  });

  test("a batch containing a forbidden path writes nothing at all (pre-flight)", async () => {
    const root = makeRoot();
    const ops: FileOp[] = [
      { path: "ok.txt", format: "text", mode: "own", content: "fine\n" },
      { path: "nested/skills-lock.json", format: "json", mode: "own", content: "{}" },
    ];
    expect(applyFileOps(ops, opts(root))).rejects.toThrow(PattersonNeverWriteError);
    expect(await fileExists(root, "ok.txt")).toBe(false);
  });

  test("a batch that creates settings.local.json and touches it again aborts before writing anything", async () => {
    const root = makeRoot();
    const ops: FileOp[] = [
      { path: "first.txt", format: "text", mode: "own", content: "first\n" },
      { path: ".claude/settings.local.json", format: "jsonc", mode: "own", content: "{}\n" },
      {
        path: ".claude/settings.local.json",
        format: "jsonc",
        mode: "merge",
        patch: [{ keyPath: ["sandbox"], value: true }],
      },
    ];

    expect(applyFileOps(ops, opts(root))).rejects.toThrow(PattersonNeverWriteError);
    // Pre-flight atomicity: nothing at all was written, including earlier ops.
    expect(await fileExists(root, "first.txt")).toBe(false);
    expect(await fileExists(root, ".claude/settings.local.json")).toBe(false);
  });

  test(".claude/settings.local.json: first creation allowed, later writes refused", async () => {
    const root = makeRoot();
    const op: FileOp = {
      path: ".claude/settings.local.json",
      format: "jsonc",
      mode: "own",
      content: '{ "sandbox": true }\n',
    };
    const first = await applyFileOps([op], opts(root));
    expect(first.written).toContain(".claude/settings.local.json");

    expect(applyFileOps([op], opts(root, { acceptGenerated: true }))).rejects.toThrow(PattersonNeverWriteError);
    expect(await readFile(root, ".claude/settings.local.json")).toBe('{ "sandbox": true }\n');
  });
});

// ---------------------------------------------------------------------------
// Backup util
// ---------------------------------------------------------------------------

describe("backup util", () => {
  test("backs a file up under .patterson/backup/<timestamp>-<name>", async () => {
    const root = makeRoot();
    await writeFixture(root, "deep/dir/file.json", '{"a":1}\n');

    const rel = await backupFile(root, "deep/dir/file.json", FIXED_NOW);

    expect(rel).toStartWith(".patterson/backup/2026-07-31T12-00-00.000Z-");
    expect(rel).toContain("file.json");
    expect(await readFile(root, rel)).toBe('{"a":1}\n');
  });
});

// ---------------------------------------------------------------------------
// FsSnapshot
// ---------------------------------------------------------------------------

describe("FsSnapshot", () => {
  test("captures listed paths read-only; missing files read as null", async () => {
    const root = makeRoot();
    await writeFixture(root, "AGENTS.md", "hello\n");

    const snapshot = await captureSnapshot(root, ["AGENTS.md", ".mcp.json"]);

    expect(snapshot.read("AGENTS.md")).toBe("hello\n");
    expect(snapshot.has("AGENTS.md")).toBe(true);
    expect(snapshot.read(".mcp.json")).toBeNull();
    expect(snapshot.has(".mcp.json")).toBe(false);
    expect(snapshot.read("not-listed.txt")).toBeNull();
    expect(snapshot.paths().toSorted()).toEqual([".mcp.json", "AGENTS.md"]);

    // Snapshot is a capture, not a live view.
    await writeFixture(root, "AGENTS.md", "changed\n");
    expect(snapshot.read("AGENTS.md")).toBe("hello\n");
  });
});

// ---------------------------------------------------------------------------
// Determinism & dry-run
// ---------------------------------------------------------------------------

const determinismOps = (): FileOp[] => [
  { path: "AGENTS.md", format: "markdown", mode: "merge", sentinelId: "core", content: "Body." },
  { path: "own.txt", format: "text", mode: "own", content: "own\n" },
  { path: "cfg.json", format: "json", mode: "merge", patch: [{ keyPath: ["a", "b"], value: [1, 2] }] },
  { path: "manual.yml", format: "yaml", mode: "instruct", content: "do it" },
];

describe("determinism", () => {
  const ops = determinismOps;

  test("same ops on identical roots produce byte-identical files (no timestamps in content)", async () => {
    const rootA = makeRoot();
    const rootB = makeRoot();
    await applyFileOps(ops(), opts(rootA));
    await applyFileOps(ops(), opts(rootB));

    for (const rel of ["AGENTS.md", "own.txt", "cfg.json", "SETUP.md", EMITTED_RELATIVE_PATH]) {
      expect(await readFile(rootA, rel)).toBe(await readFile(rootB, rel));
    }
  });

  test("computeIrHash is stable under key ordering", () => {
    expect(computeIrHash({ a: 1, b: [{ x: 1, y: 2 }] })).toBe(computeIrHash({ b: [{ y: 2, x: 1 }], a: 1 }));
    expect(computeIrHash({ a: 1 })).not.toBe(computeIrHash({ a: 2 }));
  });

  test("dry-run computes the plan but writes nothing", async () => {
    const root = makeRoot();
    const result = await applyFileOps(ops(), opts(root, { dryRun: true }));

    expect(result.written.toSorted()).toEqual(["AGENTS.md", "SETUP.md", "cfg.json", "own.txt"]);
    for (const rel of ["AGENTS.md", "own.txt", "cfg.json", "SETUP.md", EMITTED_RELATIVE_PATH]) {
      expect(await fileExists(root, rel)).toBe(false);
    }
  });

  test("dry-run with acceptGenerated reports the would-be backup without creating it", async () => {
    const root = makeRoot();
    await applyFileOps([{ path: "a.txt", format: "text", mode: "own", content: "generated\n" }], opts(root));
    await writeFixture(root, "a.txt", "hand edited\n");

    const dry = await applyFileOps(
      [{ path: "a.txt", format: "text", mode: "own", content: "generated v2\n" }],
      opts(root, { acceptGenerated: true, dryRun: true }),
    );

    // The plan matches the real run's result shape: same backup path, no writes.
    expect(dry.written).toContain("a.txt");
    expect(dry.backups).toHaveLength(1);
    const planned = dry.backups[0];
    expect(planned).toStartWith(".patterson/backup/");
    expect(planned).toContain("a.txt");
    expect(await fileExists(root, planned ?? "")).toBe(false);
    expect(await readFile(root, "a.txt")).toBe("hand edited\n");

    const real = await applyFileOps(
      [{ path: "a.txt", format: "text", mode: "own", content: "generated v2\n" }],
      opts(root, { acceptGenerated: true }),
    );
    expect(real.backups).toEqual(dry.backups);
    expect(await fileExists(root, planned ?? "")).toBe(true);
  });
});
