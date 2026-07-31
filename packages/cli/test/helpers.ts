/**
 * Shared test harness for the skeleton commands.
 *
 * The commands are tested against a STUB claude-code emitter that exercises
 * every FileOp tier (markdown sentinel merge, structured json merge, own-tier
 * files, instruct → SETUP.md) through the real core emit engine. The real
 * emitter's behavior is covered by its own fixture suite (T021–T023) and the
 * integrator's walking-skeleton E2E.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { CommandCtx, CommandIo, Emitter, FileOp, PattersonProject } from "@patterson/core";

import {
  claudeCodeSnapshotPaths,
  type CommandDeps,
  type EmitterResolver,
} from "../src/commands/shared.ts";

// ---------------------------------------------------------------------------
// Temp dirs
// ---------------------------------------------------------------------------

export async function makeTempDir(): Promise<string> {
  return await mkdtemp(join(tmpdir(), "patterson-cli-test-"));
}

export async function removeDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// IO / ctx
// ---------------------------------------------------------------------------

export interface CapturedIo {
  io: CommandIo;
  out: string[];
  err: string[];
}

export function makeIo(): CapturedIo {
  const out: string[] = [];
  const err: string[] = [];
  return {
    out,
    err,
    io: {
      out: (text) => {
        out.push(text);
      },
      err: (text) => {
        err.push(text);
      },
    },
  };
}

export function makeCtx(cwd: string, overrides: Partial<CommandCtx> = {}): CommandCtx {
  return { cwd, nonInteractive: true, io: makeIo().io, ...overrides };
}

// ---------------------------------------------------------------------------
// Stub emitter (claude-code shaped)
// ---------------------------------------------------------------------------

export const STUB_SENTINEL_ID = "patterson:instructions";

/** Deterministic stand-in for the claude-code emitter across all tiers. */
export const stubEmitter: Emitter = {
  targets: ["claude-code"],
  compile(ir: PattersonProject): FileOp[] {
    const ops: FileOp[] = [
      {
        path: "CLAUDE.md",
        format: "markdown",
        mode: "merge",
        sentinelId: STUB_SENTINEL_ID,
        content:
          ir.instructions.length > 0
            ? ir.instructions.map((block) => block.body.trimEnd()).join("\n\n")
            : `# ${ir.name}\n\nManaged by patterson.`,
      },
    ];
    if (ir.mcp.length > 0) {
      ops.push({
        path: ".mcp.json",
        format: "json",
        mode: "merge",
        patch: ir.mcp.map((server) => ({
          keyPath: ["mcpServers", server.name],
          value:
            server.transport.kind === "stdio"
              ? {
                  command: server.transport.exec.argv[0],
                  args: server.transport.exec.argv.slice(1),
                }
              : { url: server.transport.url },
        })),
      });
    }
    for (const agent of ir.agents) {
      ops.push({
        path: `.claude/agents/${agent.name}.md`,
        format: "markdown",
        mode: "own",
        content: `# ${agent.name}\n\n${agent.prompt}\n`,
      });
    }
    ops.push({
      path: ".claude/settings.local.json",
      format: "json",
      mode: "instruct",
      content: "Create `.claude/settings.local.json` by hand for machine-local overrides if needed.",
    });
    return ops;
  },
};

export const stubResolver: EmitterResolver = async (target) => {
  if (target !== "claude-code") return null;
  return { emitter: stubEmitter, snapshotPaths: claudeCodeSnapshotPaths };
};

/** Repo-root templates directory (packages/cli/test → repo root). */
export const TEMPLATES_DIR = join(import.meta.dir, "..", "..", "..", "templates");

/** Empty design-template source: unit tests exercise builtin templates only. */
export const stubDesignTemplates: CommandDeps["designTemplates"] = {
  async list() {
    return [];
  },
  async materialize(name) {
    throw new Error(`stubDesignTemplates cannot materialize "${name}".`);
  },
};

export function stubDeps(overrides: Partial<CommandDeps> = {}): CommandDeps {
  return {
    resolveEmitter: stubResolver,
    templatesDir: TEMPLATES_DIR,
    designTemplates: stubDesignTemplates,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------

export async function readText(root: string, rel: string): Promise<string> {
  return await Bun.file(join(root, rel)).text();
}

export async function exists(root: string, rel: string): Promise<boolean> {
  return await Bun.file(join(root, rel)).exists();
}

export async function readEmittedRecords(root: string): Promise<Map<string, Record<string, unknown>>> {
  const parsed = JSON.parse(await readText(root, ".patterson/emitted.json")) as {
    files?: { path: string }[];
  };
  return new Map(
    (parsed.files ?? []).map((record) => [record.path, record as unknown as Record<string, unknown>]),
  );
}
