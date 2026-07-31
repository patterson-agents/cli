/**
 * T012 — Command registry tests.
 *
 * Contract: specs/001-patterson-cli-v1/contracts/command-registry.md
 * Constitution III: One Registry, Two Frontends. Core handlers are prompt-free;
 * interactive decisions surface as structured `decision-required` results whose
 * options each map to a flag, so the CLI frontend can prompt + re-invoke and the
 * MCP frontend can return the result verbatim.
 */
import { describe, expect, test } from "bun:test";
import { z } from "zod";

import {
  createRegistry,
  defineCommand,
  EXIT_CODES,
  exitCodeFor,
  RESOLVING_FLAG,
} from "../src/registry/index.ts";
import type {
  CommandCtx,
  CommandResult,
  DriftConflict,
} from "../src/registry/index.ts";
import {
  COMMAND_ID_REGEX as regexFromRootBarrel,
  createRegistry as createFromRootBarrel,
  defineCommand as defineFromRootBarrel,
  EXIT_CODES as exitCodesFromRootBarrel,
} from "../src/index.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCtx(overrides: Partial<CommandCtx> = {}): CommandCtx & {
  outLines: string[];
  errLines: string[];
} {
  const outLines: string[] = [];
  const errLines: string[] = [];
  return {
    cwd: "/tmp/project",
    nonInteractive: false,
    io: {
      out: (text: string) => {
        outLines.push(text);
      },
      err: (text: string) => {
        errLines.push(text);
      },
    },
    outLines,
    errLines,
    ...overrides,
  };
}

/** A minimal read-only descriptor used by several tests. */
function skillsListDescriptor() {
  return defineCommand({
    id: "skills.list",
    path: ["skills", "list"],
    summary: "List skills defined in the project IR",
    inputSchema: z.object({}),
    outputSchema: z.object({ names: z.array(z.string()) }),
    annotations: { readOnlyHint: true, destructiveHint: false },
    run: async () => ({ kind: "ok" as const, value: { names: ["a", "b"] } }),
  });
}

// ---------------------------------------------------------------------------
// Registration / resolution / listing
// ---------------------------------------------------------------------------

describe("registry: register + resolve", () => {
  test("a registered descriptor resolves by id", () => {
    const registry = createRegistry();
    const descriptor = skillsListDescriptor();
    registry.register(descriptor);
    expect(registry.resolve("skills.list")).toBe(descriptor);
  });

  test("a registered descriptor resolves by CLI path", () => {
    const registry = createRegistry();
    const descriptor = skillsListDescriptor();
    registry.register(descriptor);
    expect(registry.resolveByPath(["skills", "list"])).toBe(descriptor);
  });

  test("resolving an unknown id returns undefined", () => {
    const registry = createRegistry();
    expect(registry.resolve("nope.nothing")).toBeUndefined();
    expect(registry.resolveByPath(["nope"])).toBeUndefined();
  });

  test("duplicate id is rejected", () => {
    const registry = createRegistry();
    registry.register(skillsListDescriptor());
    const duplicate = defineCommand({
      id: "skills.list",
      path: ["skills", "list-again"],
      summary: "Same id, different path",
      inputSchema: z.object({}),
      outputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false },
      run: async () => ({ kind: "ok" as const, value: {} }),
    });
    expect(() => registry.register(duplicate)).toThrow(/skills\.list/);
  });

  test("duplicate CLI path is rejected (two ids may not collide on one subcommand)", () => {
    const registry = createRegistry();
    registry.register(skillsListDescriptor());
    const collision = defineCommand({
      id: "skills.enumerate",
      path: ["skills", "list"],
      summary: "Different id, same path",
      inputSchema: z.object({}),
      outputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false },
      run: async () => ({ kind: "ok" as const, value: {} }),
    });
    expect(() => registry.register(collision)).toThrow(/skills list/);
  });

  test("descriptor shape is validated: empty id / empty path / empty segments are rejected", () => {
    const registry = createRegistry();
    const base = {
      summary: "s",
      inputSchema: z.object({}),
      outputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false },
      run: async () => ({ kind: "ok" as const, value: {} }),
    };
    expect(() => registry.register({ ...base, id: "", path: ["x"] })).toThrow();
    expect(() => registry.register({ ...base, id: "x", path: [] })).toThrow();
    expect(() => registry.register({ ...base, id: "x", path: ["ok", ""] })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Id charset + MCP tool-name projection injectivity
// ---------------------------------------------------------------------------

const withId = (id: string) =>
  defineCommand({
    id,
    path: [id.replaceAll(".", "-")],
    summary: id,
    inputSchema: z.object({}),
    outputSchema: z.object({}),
    annotations: { readOnlyHint: true, destructiveHint: false },
    run: async () => ({ kind: "ok" as const, value: {} }),
  });

describe("registry: command id charset (MCP projection safety)", () => {
  test.each(["skills.list", "doctor", "new.mcp-server", "design.templates", "a1.b2-c3"])(
    "valid id %p accepted",
    (id) => {
      const registry = createRegistry();
      expect(() => registry.register(withId(id))).not.toThrow();
    },
  );

  test.each([
    "skills_list", // underscore breaks dots→underscores injectivity
    "Skills.list", // uppercase
    "skills list", // space
    ".skills", // empty leading segment
    "skills.", // empty trailing segment
    "skills..list", // empty middle segment
    "-skills", // leading hyphen in a segment
  ])("invalid id %p rejected", (id) => {
    const registry = createRegistry();
    expect(() => registry.register(withId(id))).toThrow();
  });

  test('registering "skills.list" then "skills_list" cannot mint colliding MCP tool names', () => {
    const registry = createRegistry();
    registry.register(withId("skills.list"));
    // The underscore id is rejected outright, so patterson_skills_list stays unique.
    expect(() => registry.register(withId("skills_list"))).toThrow(/skills_list/);
  });
});

// ---------------------------------------------------------------------------
// Root barrel — frontends import the registry from @patterson/core
// ---------------------------------------------------------------------------

describe("root barrel re-exports the registry surface", () => {
  test("createRegistry/defineCommand/EXIT_CODES/COMMAND_ID_REGEX resolve from src/index.ts", () => {
    expect(createFromRootBarrel).toBe(createRegistry);
    expect(defineFromRootBarrel).toBe(defineCommand);
    expect(exitCodesFromRootBarrel).toBe(EXIT_CODES);
    expect(regexFromRootBarrel.test("skills.add")).toBe(true);
  });
});

const make = (id: string, path: string[]) =>
  defineCommand({
    id,
    path,
    summary: id,
    inputSchema: z.object({}),
    outputSchema: z.object({}),
    annotations: { readOnlyHint: true, destructiveHint: false },
    run: async () => ({ kind: "ok" as const, value: {} }),
  });

describe("registry: list", () => {
  test("listing is deterministic — sorted by id regardless of registration order", () => {
    const a = createRegistry();
    const b = createRegistry();
    const descriptors = [
      make("skills.add", ["skills", "add"]),
      make("design.templates", ["design", "templates"]),
      make("new.mcp-server", ["new", "mcp-server"]),
      make("doctor", ["doctor"]),
    ];
    for (const d of descriptors) a.register(d);
    for (const d of descriptors.toReversed()) b.register(d);

    const ids = a.list().map((d) => d.id);
    expect(ids).toEqual(["design.templates", "doctor", "new.mcp-server", "skills.add"]);
    expect(b.list().map((d) => d.id)).toEqual(ids);
  });

  test("list returns a copy — mutating it does not affect the registry", () => {
    const registry = createRegistry();
    registry.register(skillsListDescriptor());
    registry.list().length = 0;
    expect(registry.list()).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// CommandCtx plumbing
// ---------------------------------------------------------------------------

describe("CommandCtx", () => {
  test("run receives cwd, nonInteractive, and io verbatim", async () => {
    const seen: { cwd?: string; nonInteractive?: boolean } = {};
    const descriptor = defineCommand({
      id: "ctx.echo",
      path: ["ctx", "echo"],
      summary: "Echo ctx",
      inputSchema: z.object({}),
      outputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false },
      run: async (_args, ctx) => {
        seen.cwd = ctx.cwd;
        seen.nonInteractive = ctx.nonInteractive;
        ctx.io.out("hello-out");
        ctx.io.err("hello-err");
        return { kind: "ok" as const, value: {} };
      },
    });

    const ctx = makeCtx({ nonInteractive: true });
    const result = await descriptor.run({}, ctx);
    expect(result.kind).toBe("ok");
    expect(seen.cwd).toBe("/tmp/project");
    expect(seen.nonInteractive).toBe(true);
    expect(ctx.outLines).toEqual(["hello-out"]);
    expect(ctx.errLines).toEqual(["hello-err"]);
  });
});

// ---------------------------------------------------------------------------
// CommandResult: decision-required round-trip
// ---------------------------------------------------------------------------

describe("decision-required protocol", () => {
  /**
   * Prompt-free core handler: without a linkMode flag it returns a structured
   * decision whose every option names the resolving flag (`processArgument`
   * pattern) — the CLI frontend prompts and re-invokes; MCP returns it verbatim.
   */
  const linkDescriptor = defineCommand({
    id: "skills.link",
    path: ["skills", "link"],
    summary: "Link a skill into the project",
    inputSchema: z.object({
      name: z.string().min(1),
      linkMode: z.enum(["symlink", "copy"]).optional(),
    }),
    outputSchema: z.object({ linked: z.string(), linkMode: z.enum(["symlink", "copy"]) }),
    annotations: { readOnlyHint: false, destructiveHint: false },
    run: async (args) => {
      if (args.linkMode === undefined) {
        return {
          kind: "decision-required" as const,
          decision: {
            id: "skills.link.linkMode",
            question: `How should skill "${args.name}" be linked?`,
            options: [
              { flag: "--link-mode=symlink", label: "Symlink (stays in sync)" },
              { flag: "--link-mode=copy", label: "Copy (frozen snapshot)" },
            ],
          },
        };
      }
      return {
        kind: "ok" as const,
        value: { linked: args.name, linkMode: args.linkMode },
      };
    },
  });

  test("without the flag: a structured decision with flag-backed options", async () => {
    const result = await linkDescriptor.run({ name: "humanizer" }, makeCtx());
    expect(result.kind).toBe("decision-required");
    if (result.kind !== "decision-required") throw new Error("unreachable");
    expect(result.decision.id).toBe("skills.link.linkMode");
    expect(result.decision.question).toContain("humanizer");
    expect(result.decision.options.length).toBeGreaterThan(0);
    for (const option of result.decision.options) {
      expect(option.flag).toMatch(/^--/);
      expect(option.label.length).toBeGreaterThan(0);
    }
    // Non-interactive frontends map this to exit code 3.
    expect(exitCodeFor(result)).toBe(3);
  });

  test("round-trip: re-invoking with the chosen flag resolves to ok", async () => {
    const ctx = makeCtx();
    const first = await linkDescriptor.run({ name: "humanizer" }, ctx);
    expect(first.kind).toBe("decision-required");
    if (first.kind !== "decision-required") throw new Error("unreachable");

    // Simulate the CLI frontend: user picks an option, the frontend converts the
    // flag into args and re-invokes the SAME descriptor.
    const chosen = first.decision.options[0];
    expect(chosen).toBeDefined();
    if (!chosen) throw new Error("unreachable");
    const flagValue = chosen.flag.split("=")[1] as "symlink" | "copy";
    const second = await linkDescriptor.run({ name: "humanizer", linkMode: flagValue }, ctx);

    expect(second.kind).toBe("ok");
    if (second.kind !== "ok") throw new Error("unreachable");
    expect(second.value).toEqual({ linked: "humanizer", linkMode: "symlink" });
    expect(exitCodeFor(second)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// CommandResult: conflicts shape
// ---------------------------------------------------------------------------

describe("conflicts result", () => {
  const conflicts: DriftConflict[] = [
    {
      path: ".claude/settings.json",
      keyPath: "permissions.allow",
      message: "hand-edited since last emission",
      recordedHash: "aaaa",
      currentHash: "bbbb",
    },
  ];

  const syncDescriptor = defineCommand({
    id: "sync",
    path: ["sync"],
    summary: "Re-emit all targets from the IR",
    inputSchema: z.object({ acceptGenerated: z.boolean().optional() }),
    outputSchema: z.object({ written: z.number() }),
    annotations: { readOnlyHint: false, destructiveHint: true },
    run: async (args) => {
      if (!args.acceptGenerated) {
        return { kind: "conflicts" as const, conflicts, resolvingFlag: RESOLVING_FLAG };
      }
      return { kind: "ok" as const, value: { written: 1 } };
    },
  });

  test("conflicts carry the structured list and name --accept-generated as resolver", async () => {
    const result = await syncDescriptor.run({}, makeCtx({ nonInteractive: true }));
    expect(result.kind).toBe("conflicts");
    if (result.kind !== "conflicts") throw new Error("unreachable");
    expect(result.resolvingFlag).toBe("--accept-generated");
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.path).toBe(".claude/settings.json");
    // Never silent: non-interactive maps to exit ≠ 0 — specifically 2.
    expect(exitCodeFor(result)).toBe(2);
  });

  test("--accept-generated resolves the conflict on re-invoke", async () => {
    const result = await syncDescriptor.run({ acceptGenerated: true }, makeCtx());
    expect(result.kind).toBe("ok");
    expect(exitCodeFor(result)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Exit-code mapping (CLI projection)
// ---------------------------------------------------------------------------

describe("exit-code mapping", () => {
  test("ok→0 error→1 conflicts→2 decision-required→3", () => {
    const ok: CommandResult<{ x: number }> = { kind: "ok", value: { x: 1 } };
    const error: CommandResult<never> = {
      kind: "error",
      code: "E_NO_CONFIG",
      message: "patterson.config not found",
      hint: "run `patterson init`",
    };
    const conflicted: CommandResult<never> = {
      kind: "conflicts",
      conflicts: [],
      resolvingFlag: "--accept-generated",
    };
    const decision: CommandResult<never> = {
      kind: "decision-required",
      decision: { id: "d", question: "q", options: [{ flag: "--yes", label: "Yes" }] },
    };

    expect(exitCodeFor(ok)).toBe(0);
    expect(exitCodeFor(error)).toBe(1);
    expect(exitCodeFor(conflicted)).toBe(2);
    expect(exitCodeFor(decision)).toBe(3);

    expect(EXIT_CODES).toEqual({
      ok: 0,
      error: 1,
      conflicts: 2,
      "decision-required": 3,
    });
  });
});

// ---------------------------------------------------------------------------
// Schema wiring (flag parsing + MCP schema both derive from inputSchema)
// ---------------------------------------------------------------------------

describe("descriptor schemas", () => {
  test("inputSchema validates and types args; outputSchema validates results", () => {
    const descriptor = skillsListDescriptor();
    expect(descriptor.inputSchema.safeParse({}).success).toBe(true);
    expect(descriptor.inputSchema.safeParse("not-an-object").success).toBe(false);
    expect(descriptor.outputSchema.safeParse({ names: ["a"] }).success).toBe(true);
    expect(descriptor.outputSchema.safeParse({ names: [1] }).success).toBe(false);
  });

  test("annotations distinguish read from write descriptors", () => {
    const descriptor = skillsListDescriptor();
    expect(descriptor.annotations.readOnlyHint).toBe(true);
    expect(descriptor.annotations.destructiveHint).toBe(false);
  });
});
