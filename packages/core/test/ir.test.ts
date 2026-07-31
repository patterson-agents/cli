/**
 * T009 — Golden tests for IR schema validation.
 *
 * Written before/with the implementation per constitution (Development Workflow:
 * tests-first for core mechanisms). Covers the T009 list from tasks.md:
 *   - valid fixture
 *   - unknown-target rejection
 *   - SecretRef string-forbidden rule (interpolated secret strings)
 *   - skill name regex (+ length, no `--`)
 *   - reserved MCP names
 *   - argv non-empty
 * plus uniqueness rules and defaults from data-model.md.
 */
import { describe, expect, test } from "bun:test";

import {
  AgentHookDefSchema,
  ExecSchema,
  GitHookDefSchema,
  McpServerDefSchema,
  PattersonProjectSchema,
  SecretRefSchema,
  SkillDefSchema,
  TargetIdSchema,
  type PattersonProject,
} from "../src/index.ts";

/** Flatten every issue message of a failed safeParse into one string. */
function messagesOf(result: { success: boolean; error?: { issues: { message: string }[] } }): string {
  if (result.success || !result.error) return "";
  return result.error.issues.map((i) => i.message).join("\n");
}

// ---------------------------------------------------------------------------
// Golden valid fixture
// ---------------------------------------------------------------------------

const validProject = {
  version: 1,
  name: "demo-project",
  targets: ["claude-code", "opencode", "devcontainer"],
  instructions: [
    {
      id: "style",
      body: "# Style\nUse tabs.",
      reach: "universal",
    },
    {
      id: "frontend",
      body: "React rules.",
      reach: "path-scoped",
      scope: { globs: ["src/frontend/**"] },
    },
  ],
  skills: [
    {
      name: "deploy-widget",
      description: "Deploys the widget.",
      body: "# Deploy widget\nSteps...",
      linkMode: "symlink",
    },
  ],
  agents: [
    {
      name: "code-reviewer",
      description: "Reviews code.",
      prompt: "You review code.",
    },
  ],
  commands: [
    {
      name: "release",
      description: "Cut a release",
      template: "Release version {version}",
      args: ["version"],
    },
  ],
  mcp: [
    {
      name: "docs-server",
      transport: {
        kind: "stdio",
        exec: {
          argv: ["bunx", "docs-mcp@1.2.3"],
          env: {
            PLAIN: "just-a-value",
            API_KEY: { kind: "env", name: "DOCS_API_KEY" },
          },
        },
      },
      scope: "project",
    },
    {
      name: "remote-server",
      transport: {
        kind: "http",
        url: "https://mcp.example.com/mcp",
        headers: {
          Authorization: { kind: "env", name: "REMOTE_TOKEN" },
        },
      },
      scope: "user",
    },
  ],
  hooks: {
    agentHooks: [
      {
        event: "PostToolUse",
        matcher: "Write|Edit",
        exec: { argv: ["bunx", "oxlint@1.0.0", "--fix"] },
      },
    ],
    gitHooks: [{ stage: "pre-commit", argv: ["bun", "test"] }],
  },
  marketplaces: [
    {
      id: "acme",
      kind: "claude",
      source: "github.com/acme/marketplace",
      pin: { sha: "0123456789abcdef0123456789abcdef01234567" },
      plugins: ["acme-tools"],
    },
  ],
  extensions: [{ id: "dbaeumer.vscode-eslint", targets: ["vscode"] }],
  env: {
    image: "mcr.microsoft.com/devcontainers/typescript-node:24",
    lifecycle: {
      // C10: author-provided value types are preserved (string | array | object).
      onCreate: "bun install",
      postCreate: ["bun", "run", "setup"],
      postStart: { server: "bun run dev", watcher: ["bun", "run", "watch"] },
    },
    ports: [3000],
    secrets: [{ kind: "prompt", id: "npm-token", description: "npm publish token" }],
  },
  devops: {
    workflows: ["ci"],
    lint: "oxlint",
  },
} as const;

describe("PattersonProject golden fixture", () => {
  test("valid fixture parses", () => {
    const result = PattersonProjectSchema.safeParse(validProject);
    expect(result.success).toBe(true);
  });

  test("parsed type round-trips core fields", () => {
    const project: PattersonProject = PattersonProjectSchema.parse(validProject);
    expect(project.version).toBe(1);
    expect(project.name).toBe("demo-project");
    expect(project.targets).toEqual(["claude-code", "opencode", "devcontainer"]);
    expect(project.skills[0]?.name).toBe("deploy-widget");
    expect(project.mcp[1]?.transport.kind).toBe("http");
  });

  test("minimal project applies defaults (collections empty, emit.scopeFallback inline)", () => {
    const project = PattersonProjectSchema.parse({ version: 1, name: "tiny" });
    expect(project.targets).toEqual([]);
    expect(project.instructions).toEqual([]);
    expect(project.skills).toEqual([]);
    expect(project.agents).toEqual([]);
    expect(project.commands).toEqual([]);
    expect(project.mcp).toEqual([]);
    expect(project.hooks).toEqual({ agentHooks: [], gitHooks: [] });
    expect(project.marketplaces).toEqual([]);
    expect(project.extensions).toEqual([]);
    expect(project.policy.allow).toEqual([]);
    expect(project.policy.deny).toEqual([]);
    expect(project.policy.ask).toEqual([]);
    expect(project.emit.scopeFallback).toBe("inline");
  });

  test("version must be the literal 1", () => {
    const result = PattersonProjectSchema.safeParse({ ...validProject, version: 2 });
    expect(result.success).toBe(false);
  });

  test("name must be non-empty", () => {
    const result = PattersonProjectSchema.safeParse({ ...validProject, name: "" });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Strictness — unknown keys are validation errors, never silently stripped
// ---------------------------------------------------------------------------

describe("strict schemas (typos fail loudly)", () => {
  test("typo'd top-level key rejected (golden: 'skils' does not vanish silently)", () => {
    const result = PattersonProjectSchema.safeParse({
      version: 1,
      name: "p",
      skils: [{ name: "deploy", description: "d", body: "b", linkMode: "copy" }],
    });
    expect(result.success).toBe(false);
    expect(messagesOf(result).toLowerCase()).toContain("skils");
  });

  test("typo'd entity-level key rejected ('alowedTools' on a SkillDef)", () => {
    const result = SkillDefSchema.safeParse({
      name: "deploy",
      description: "d",
      body: "b",
      linkMode: "copy",
      alowedTools: ["Bash"],
    });
    expect(result.success).toBe(false);
  });

  test("unknown key inside a nested object rejected (lifecycle)", () => {
    const result = PattersonProjectSchema.safeParse({
      version: 1,
      name: "p",
      env: { lifecycle: { onCreat: "bun install" } },
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// InstructionBlock — reach/scope invariant
// ---------------------------------------------------------------------------

describe("InstructionBlock reach/scope invariant", () => {
  test('reach "path-scoped" without scope rejected', () => {
    const result = PattersonProjectSchema.safeParse({
      version: 1,
      name: "p",
      instructions: [{ id: "x", body: "b", reach: "path-scoped" }],
    });
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toContain("scope");
  });

  test('reach "universal" with scope rejected', () => {
    const result = PattersonProjectSchema.safeParse({
      version: 1,
      name: "p",
      instructions: [
        { id: "x", body: "b", reach: "universal", scope: { globs: ["src/**"] } },
      ],
    });
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toContain("scope");
  });
});

// ---------------------------------------------------------------------------
// TargetId — unknown targets rejected
// ---------------------------------------------------------------------------

describe("TargetId", () => {
  test("all eight known targets accepted", () => {
    for (const t of [
      "claude-code",
      "copilot",
      "opencode",
      "zed",
      "vscode",
      "devcontainer",
      "codespaces",
      "github-actions",
    ]) {
      expect(TargetIdSchema.safeParse(t).success).toBe(true);
    }
  });

  test("unknown target id rejected at the root", () => {
    const result = PattersonProjectSchema.safeParse({
      ...validProject,
      targets: ["claude-code", "cursor"],
    });
    expect(result.success).toBe(false);
  });

  test("unknown target id rejected on entity-level targets", () => {
    const result = PattersonProjectSchema.safeParse({
      ...validProject,
      extensions: [{ id: "x", targets: ["not-a-target"] }],
    });
    expect(result.success).toBe(false);
  });

  test("duplicate root targets rejected (targets is a set)", () => {
    const result = PattersonProjectSchema.safeParse({
      ...validProject,
      targets: ["claude-code", "claude-code"],
    });
    expect(result.success).toBe(false);
    expect(messagesOf(result).toLowerCase()).toContain("duplicate");
  });
});

// ---------------------------------------------------------------------------
// SecretRef + interpolated-secret-string prohibition (C4)
// ---------------------------------------------------------------------------

describe("SecretRef", () => {
  test("all five kinds parse", () => {
    const refs = [
      { kind: "env", name: "FOO", default: "bar" },
      { kind: "prompt", id: "tok", description: "a token", password: true },
      { kind: "pick", id: "region", options: ["us", "eu"] },
      { kind: "command", id: "op", command: "op", args: ["read", "secret"] },
      { kind: "helper", command: "vault-helper" },
    ];
    for (const ref of refs) {
      expect(SecretRefSchema.safeParse(ref).success).toBe(true);
    }
  });

  test("unknown kind rejected", () => {
    expect(SecretRefSchema.safeParse({ kind: "magic", name: "x" }).success).toBe(false);
  });

  test('plain env string containing "${" rejected with SecretRef hint', () => {
    const result = ExecSchema.safeParse({
      argv: ["run"],
      env: { TOKEN: "${MY_SECRET}" },
    });
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toContain("SecretRef");
  });

  test('plain env string containing "${input:...}" rejected', () => {
    const result = ExecSchema.safeParse({
      argv: ["run"],
      env: { TOKEN: "${input:token}" },
    });
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toContain("SecretRef");
  });

  test('plain env string containing "{env:...}" rejected', () => {
    const result = ExecSchema.safeParse({
      argv: ["run"],
      env: { TOKEN: "{env:MY_SECRET}" },
    });
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toContain("SecretRef");
  });

  test("plain non-interpolated env string accepted", () => {
    const result = ExecSchema.safeParse({
      argv: ["run"],
      env: { NODE_ENV: "production" },
    });
    expect(result.success).toBe(true);
  });

  test("SecretRef env value accepted", () => {
    const result = ExecSchema.safeParse({
      argv: ["run"],
      env: { TOKEN: { kind: "env", name: "MY_SECRET" } },
    });
    expect(result.success).toBe(true);
  });

  test("interpolated string rejected in argv elements (C4: nothing may smuggle a secret)", () => {
    const result = ExecSchema.safeParse({
      argv: ["sh", "-c", "curl -H 'Auth: ${TOKEN}'"],
    });
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toContain("SecretRef");
  });

  test("interpolated string rejected in cwd", () => {
    const result = ExecSchema.safeParse({ argv: ["x"], cwd: "${HOME}/app" });
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toContain("SecretRef");
  });

  test("interpolated string rejected in git-hook argv", () => {
    const result = GitHookDefSchema.safeParse({
      stage: "pre-commit",
      argv: ["sh", "-c", "echo ${SECRET}"],
    });
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toContain("SecretRef");
  });

  test("interpolated string rejected in http transport headers too", () => {
    const result = McpServerDefSchema.safeParse({
      name: "srv",
      transport: {
        kind: "http",
        url: "https://example.com/mcp",
        headers: { Authorization: "Bearer ${TOKEN}" },
      },
      scope: "project",
    });
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toContain("SecretRef");
  });
});

// ---------------------------------------------------------------------------
// Exec (C1) — argv non-empty
// ---------------------------------------------------------------------------

describe("Exec", () => {
  test("empty argv rejected", () => {
    const result = ExecSchema.safeParse({ argv: [] });
    expect(result.success).toBe(false);
    expect(messagesOf(result).toLowerCase()).toContain("argv");
  });

  test("argv with one element accepted", () => {
    expect(ExecSchema.safeParse({ argv: ["ls"] }).success).toBe(true);
  });

  test("empty argv rejected inside hooks", () => {
    expect(
      AgentHookDefSchema.safeParse({ event: "PostToolUse", exec: { argv: [] } }).success,
    ).toBe(false);
    expect(GitHookDefSchema.safeParse({ stage: "pre-commit", argv: [] }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// SkillDef (C6, C9) — name rules
// ---------------------------------------------------------------------------

describe("SkillDef name", () => {
  const base = {
    description: "d",
    body: "b",
    linkMode: "copy",
  };

  test.each(["deploy", "a", "a1", "deploy-widget", "x2-y3"])("valid name %p accepted", (name) => {
    expect(SkillDefSchema.safeParse({ ...base, name }).success).toBe(true);
  });

  test.each([
    "Deploy", // uppercase
    "-deploy", // leading hyphen
    "deploy-", // trailing hyphen
    "dep loy", // space
    "dép", // non-ascii
    "", // empty
  ])("invalid name %p rejected by regex", (name) => {
    expect(SkillDefSchema.safeParse({ ...base, name }).success).toBe(false);
  });

  test("consecutive hyphens rejected", () => {
    expect(SkillDefSchema.safeParse({ ...base, name: "a--b" }).success).toBe(false);
  });

  test("names longer than 64 chars rejected", () => {
    expect(SkillDefSchema.safeParse({ ...base, name: "a".repeat(65) }).success).toBe(false);
    expect(SkillDefSchema.safeParse({ ...base, name: "a".repeat(64) }).success).toBe(true);
  });

  test("description longer than 1024 rejected", () => {
    expect(
      SkillDefSchema.safeParse({ ...base, name: "ok", description: "d".repeat(1025) }).success,
    ).toBe(false);
  });

  test.each([
    "../../../secret", // traversal
    "/etc/passwd", // absolute
    "a\\b", // backslash
    "./x", // "." segment
    "a//b", // empty segment
  ])("traversal-unsafe files entry %p rejected", (file) => {
    expect(SkillDefSchema.safeParse({ ...base, name: "ok", files: [file] }).success).toBe(false);
  });

  test("safe relative files entries accepted", () => {
    expect(
      SkillDefSchema.safeParse({ ...base, name: "ok", files: ["helper.sh", "docs/usage.md"] }).success,
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// McpServerDef (C1–C3) — reserved names
// ---------------------------------------------------------------------------

describe("McpServerDef reserved names", () => {
  const stdioTransport = { kind: "stdio", exec: { argv: ["bunx", "some-mcp@1.0.0"] } };

  test.each(["workspace", "claude-in-chrome", "computer-use", "Claude Preview", "Claude Browser"])(
    "reserved name %p rejected",
    (name) => {
      const result = McpServerDefSchema.safeParse({
        name,
        transport: stdioTransport,
        scope: "project",
      });
      expect(result.success).toBe(false);
      expect(messagesOf(result).toLowerCase()).toContain("reserved");
    },
  );

  test("non-reserved name accepted", () => {
    expect(
      McpServerDefSchema.safeParse({
        name: "my-server",
        transport: stdioTransport,
        scope: "local",
      }).success,
    ).toBe(true);
  });

  test("ws transport parses (reachability is an emitter concern, not a schema one)", () => {
    expect(
      McpServerDefSchema.safeParse({
        name: "wss",
        transport: { kind: "ws", url: "wss://example.com/mcp" },
        scope: "project",
      }).success,
    ).toBe(true);
  });

  test("invalid transport url rejected", () => {
    expect(
      McpServerDefSchema.safeParse({
        name: "bad",
        transport: { kind: "http", url: "not a url" },
        scope: "project",
      }).success,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Uniqueness rules on the root
// ---------------------------------------------------------------------------

describe("root uniqueness rules", () => {
  test("duplicate instruction ids rejected", () => {
    const result = PattersonProjectSchema.safeParse({
      version: 1,
      name: "p",
      instructions: [
        { id: "dup", body: "a", reach: "universal" },
        { id: "dup", body: "b", reach: "universal" },
      ],
    });
    expect(result.success).toBe(false);
    expect(messagesOf(result).toLowerCase()).toContain("duplicate");
  });

  test("duplicate skill names rejected", () => {
    const skill = { name: "same", description: "d", body: "b", linkMode: "copy" };
    const result = PattersonProjectSchema.safeParse({
      version: 1,
      name: "p",
      skills: [skill, skill],
    });
    expect(result.success).toBe(false);
  });

  test("duplicate agent names rejected", () => {
    const agent = { name: "same-agent", description: "d", prompt: "p" };
    const result = PattersonProjectSchema.safeParse({
      version: 1,
      name: "p",
      agents: [agent, agent],
    });
    expect(result.success).toBe(false);
  });

  test("duplicate command names rejected", () => {
    const command = { name: "same", template: "t" };
    const result = PattersonProjectSchema.safeParse({
      version: 1,
      name: "p",
      commands: [command, command],
    });
    expect(result.success).toBe(false);
  });

  test("duplicate mcp server names rejected", () => {
    const server = {
      name: "same",
      transport: { kind: "stdio", exec: { argv: ["x"] } },
      scope: "project",
    };
    const result = PattersonProjectSchema.safeParse({
      version: 1,
      name: "p",
      mcp: [server, server],
    });
    expect(result.success).toBe(false);
  });

  test("agent names must be lowercase-hyphen", () => {
    const result = PattersonProjectSchema.safeParse({
      version: 1,
      name: "p",
      agents: [{ name: "Bad Agent", description: "d", prompt: "p" }],
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// EnvironmentDef (C10, C15)
// ---------------------------------------------------------------------------

describe("EnvironmentDef", () => {
  test("image and dockerfile are mutually exclusive", () => {
    const result = PattersonProjectSchema.safeParse({
      version: 1,
      name: "p",
      env: { image: "img", dockerfile: "Dockerfile" },
    });
    expect(result.success).toBe(false);
  });

  test("lifecycle values keep their author-provided shapes", () => {
    const project = PattersonProjectSchema.parse({
      version: 1,
      name: "p",
      env: {
        lifecycle: {
          onCreate: "echo shell",
          updateContent: ["bun", "install"],
          postStart: { a: "one", b: ["two", "args"] },
        },
      },
    });
    expect(project.env.lifecycle?.onCreate).toBe("echo shell");
    expect(project.env.lifecycle?.updateContent).toEqual(["bun", "install"]);
    expect(project.env.lifecycle?.postStart).toEqual({ a: "one", b: ["two", "args"] });
  });

  test("env.secrets must be SecretRefs, not strings", () => {
    const result = PattersonProjectSchema.safeParse({
      version: 1,
      name: "p",
      env: { secrets: ["MY_SECRET"] },
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// EmitPolicy
// ---------------------------------------------------------------------------

describe("EmitPolicy", () => {
  test("scopeFallback accepts inline|drop|error", () => {
    for (const v of ["inline", "drop", "error"]) {
      expect(
        PattersonProjectSchema.safeParse({ version: 1, name: "p", emit: { scopeFallback: v } })
          .success,
      ).toBe(true);
    }
  });

  test("unknown scopeFallback rejected", () => {
    expect(
      PattersonProjectSchema.safeParse({
        version: 1,
        name: "p",
        emit: { scopeFallback: "silently-ignore" },
      }).success,
    ).toBe(false);
  });
});
