/**
 * The v1 curriculum (E-P7): five tracks distilled from the research survey
 * (42 candidates — tutor research workflow, 2026-07-31). Licensing tiers per
 * Constitution VI: proprietary curricula (Anthropic Academy, GH-300 prep,
 * VS Code docs) are LINK-OUT ONLY; GitHub-Skills-style progressions are
 * adapted from MIT sources with attribution; everything else is original.
 *
 * Lessons are DATA — the engine owns all execution. Validation follows the
 * GitHub Skills model: the learner does real work in a real repo; the tutor
 * verifies the artifacts.
 */
import type { Lesson } from "./types.ts";

export const LESSONS: readonly Lesson[] = [
  // -------------------------------------------------------------------------
  // fluency — AI-fluency foundations (4Ds framework: link-out, attributed)
  // -------------------------------------------------------------------------
  {
    id: "fluency-git-foundation",
    track: "fluency",
    order: 1,
    title: "A repository for your AI work",
    requires: [],
    license: { tier: "original" },
    body: [
      "Every lesson in this tutor validates real artifacts in a real repository —",
      "so the first artifact is the repository itself.",
      "",
      "1. Create a working directory and run `git init` in it.",
      "2. Add a `README.md` describing what you want to build with AI assistance.",
      "3. Commit it: `git add README.md && git commit -m 'chore: init'`.",
    ].join("\n"),
    validate: [
      {
        kind: "command",
        argv: ["git", "rev-parse", "--git-dir"],
        expectExitCode: 0,
        hint: "Run `git init` in this directory.",
      },
      {
        kind: "file-exists",
        path: "README.md",
        hint: "Create a README.md describing your project.",
      },
    ],
  },
  {
    id: "fluency-4ds",
    track: "fluency",
    order: 2,
    title: "The 4Ds: Delegation, Description, Discernment, Diligence",
    requires: ["git"],
    license: {
      tier: "link-out",
      source: "Anthropic AI Fluency framework — https://www.anthropic.com/ai-fluency",
    },
    body: [
      "Anthropic's AI Fluency framework organizes effective AI collaboration into",
      "four competencies (the **4Ds**) — study the framework at the source link,",
      "then practice **Description**: write an instructions file for your repo.",
      "",
      "Create `AGENTS.md` stating: what the project is, what the agent should",
      "always do (e.g. run tests), and what it must never do. This single file is",
      "read by Claude Code, Copilot, opencode, and Zed (widest-reach artifact).",
    ].join("\n"),
    validate: [
      {
        kind: "file-exists",
        path: "AGENTS.md",
        hint: "Write AGENTS.md — your project's instructions for every agent.",
      },
    ],
  },
  {
    id: "fluency-scaffold",
    track: "fluency",
    order: 3,
    title: "Scaffold an agent-ready project with patterson",
    requires: ["git", "bun"],
    license: { tier: "original" },
    body: [
      "Turn the concepts into configuration. Use patterson to make this repo",
      "agent-ready:",
      "",
      "1. `patterson init` (adopts existing files — your AGENTS.md is preserved).",
      "2. Open `patterson.config.ts` and add an instruction block.",
      "3. `patterson sync`, then `patterson doctor` — zero drift expected.",
    ].join("\n"),
    validate: [
      {
        kind: "file-exists",
        path: "patterson.config.ts",
        hint: "Run `patterson init` to adopt this repository.",
      },
      {
        kind: "file-exists",
        path: ".patterson/emitted.json",
        hint: "Run `patterson sync` to emit your configuration.",
      },
    ],
  },
  // -------------------------------------------------------------------------
  // claude-code — from the docs' recommended path (link-outs; artifacts original)
  // -------------------------------------------------------------------------
  {
    id: "claude-instructions",
    track: "claude-code",
    order: 1,
    title: "CLAUDE.md and the instructions chain",
    requires: ["git"],
    license: {
      tier: "link-out",
      source: "Claude Code docs — https://code.claude.com/docs",
    },
    body: [
      "Claude Code reads `CLAUDE.md` at session start. The strongest pattern is a",
      "thin shim: `CLAUDE.md` contains `@AGENTS.md` (an import) so every agent",
      "shares one source of truth, with Claude-only notes appended after.",
      "",
      "Create both files (or let `patterson sync` emit the shim for you).",
    ].join("\n"),
    validate: [
      {
        kind: "file-exists",
        path: "CLAUDE.md",
        hint: "Create CLAUDE.md (patterson sync emits the @AGENTS.md shim).",
      },
      {
        kind: "file-exists",
        path: "AGENTS.md",
        hint: "Create AGENTS.md — the shared instructions file.",
      },
    ],
  },
  {
    id: "claude-skills",
    track: "claude-code",
    order: 2,
    title: "Your first Agent Skill",
    requires: ["git"],
    license: { tier: "original" },
    body: [
      "Skills are reusable procedures with a `SKILL.md` (frontmatter `name` MUST",
      "equal the directory name). Claude Code scans `.claude/skills/`; the",
      "canonical cross-agent home is `.agents/skills/` with a symlink.",
      "",
      "Scaffold one: `patterson new skill my-first-skill`, then link it:",
      "`ln -s ../../.agents/skills/my-first-skill .claude/skills/my-first-skill`.",
    ].join("\n"),
    validate: [
      {
        kind: "file-exists",
        path: ".agents/skills/my-first-skill/SKILL.md",
        hint: "Run `patterson new skill my-first-skill`.",
      },
      {
        kind: "file-contains",
        path: ".agents/skills/my-first-skill/SKILL.md",
        needle: "name: my-first-skill",
        hint: "The SKILL.md frontmatter name must equal the directory name (C6).",
      },
    ],
  },
  {
    id: "claude-mcp",
    track: "claude-code",
    order: 3,
    title: "Project-scoped MCP servers (.mcp.json)",
    requires: ["git"],
    license: { tier: "original" },
    body: [
      "Project MCP servers live in `.mcp.json` (committed, shared with your",
      "team). Add a server under `mcp:` in patterson.config.ts with",
      '`scope: "project"` and sync — patterson renders the Claude shape',
      "(`command` + `args`) and every other agent's shape from the same entry.",
    ].join("\n"),
    validate: [
      {
        kind: "file-exists",
        path: ".mcp.json",
        hint: "Add an MCP server to patterson.config.ts and run `patterson sync`.",
      },
      {
        kind: "file-contains",
        path: ".mcp.json",
        needle: "mcpServers",
        hint: ".mcp.json must carry a top-level mcpServers object.",
      },
    ],
  },
  {
    id: "claude-drift",
    track: "claude-code",
    order: 4,
    title: "Drift discipline: sync, doctor, --accept-generated",
    requires: ["git"],
    license: { tier: "original" },
    body: [
      "patterson never clobbers your hand edits: `sync` keeps drifted content,",
      "reports it, and exits 2; only `--accept-generated` authorizes overwrites",
      "(with a backup). Practice the loop:",
      "",
      "1. Hand-edit an emitted file. 2. `patterson doctor` (exit 2, drift named).",
      "3. Decide: keep your edit (move it into patterson.config.ts) or",
      "   `patterson sync --accept-generated` to return to generated content.",
      "Finish healthy: `patterson doctor` exits 0.",
    ].join("\n"),
    validate: [
      {
        kind: "file-exists",
        path: ".patterson/emitted.json",
        hint: "Run `patterson sync` first — drift discipline needs provenance records.",
      },
      {
        kind: "command",
        argv: ["bun", "x", "--bun", "true"],
        expectExitCode: 0,
        hint: "Bun toolchain check failed.",
      },
    ],
  },
  // -------------------------------------------------------------------------
  // copilot — GitHub-Skills-style progression (adapted from MIT sources)
  // -------------------------------------------------------------------------
  {
    id: "copilot-instructions",
    track: "copilot",
    order: 1,
    title: "Repository custom instructions",
    requires: ["git"],
    license: {
      tier: "adapted-mit",
      source: "Adapted from github/skills (MIT) — https://github.com/skills",
    },
    body: [
      "Copilot reads `.github/copilot-instructions.md` for repository-wide",
      "instructions (a REAL copy — Copilot does not follow imports). patterson",
      "keeps it in lockstep with AGENTS.md via sentinel blocks.",
      "",
      "Emit it: target `copilot` in patterson.config.ts and `patterson sync`.",
    ].join("\n"),
    validate: [
      {
        kind: "file-exists",
        path: ".github/copilot-instructions.md",
        hint: 'Add "copilot" to targets in patterson.config.ts and run `patterson sync`.',
      },
    ],
  },
  {
    id: "copilot-path-instructions",
    track: "copilot",
    order: 2,
    title: "Path-scoped instructions (applyTo)",
    requires: ["git"],
    license: {
      tier: "adapted-mit",
      source: "Adapted from github/skills (MIT) — https://github.com/skills",
    },
    body: [
      "`.github/instructions/*.instructions.md` files carry an `applyTo:`",
      "frontmatter (comma-separated globs). In patterson, give an instruction",
      'block `reach: "path-scoped"` and a scope — the copilot emitter renders',
      "the applyTo form; agents without path scoping report a coverage gap",
      "instead of silently dropping the rule (`patterson check`).",
    ].join("\n"),
    validate: [
      {
        kind: "file-exists",
        path: ".github/instructions",
        hint: "Add a path-scoped instruction block and `patterson sync`.",
      },
    ],
  },
  {
    id: "copilot-agents",
    track: "copilot",
    order: 3,
    title: "Custom agents (.github/agents)",
    requires: ["git"],
    license: {
      tier: "link-out",
      source: "GitHub Copilot docs — https://docs.github.com/copilot",
    },
    body: [
      "Copilot custom agents live in `.github/agents/<name>.agent.md` (the",
      "current form — the older .chatmode.md era is gone). Define an agent once",
      "under `agents:` in patterson.config.ts; sync renders the Claude",
      "subagent file AND the Copilot .agent.md from the same definition.",
    ].join("\n"),
    validate: [
      {
        kind: "file-exists",
        path: ".github/agents",
        hint: "Add an agent to patterson.config.ts and run `patterson sync`.",
      },
    ],
  },
  // -------------------------------------------------------------------------
  // mcp — protocol fundamentals via the shared handshake validator
  // -------------------------------------------------------------------------
  {
    id: "mcp-scaffold",
    track: "mcp",
    order: 1,
    title: "Scaffold a working MCP server",
    requires: ["git", "bun"],
    license: { tier: "original" },
    body: [
      "Model Context Protocol servers expose tools over JSON-RPC (stdio framing:",
      "one JSON object per line; stdout is protocol-only, logs go to stderr).",
      "",
      "Scaffold one: `patterson new mcp-server my-server`, then",
      "`cd my-server && bun install && bun test` — its handshake self-test walks",
      "initialize → tools/list → tools/call exactly like a real host.",
    ].join("\n"),
    validate: [
      {
        kind: "file-exists",
        path: "my-server/src/index.ts",
        hint: "Run `patterson new mcp-server my-server`.",
      },
      {
        kind: "file-exists",
        path: "my-server/node_modules",
        hint: "Run `bun install` inside my-server/.",
      },
    ],
  },
  {
    id: "mcp-handshake",
    track: "mcp",
    order: 2,
    title: "The initialize handshake, on the wire",
    requires: ["git", "bun"],
    license: {
      tier: "link-out",
      source: "MCP specification — https://modelcontextprotocol.io",
    },
    body: [
      "A host sends `initialize` (protocol version + client info), the server",
      "answers with its capabilities, the host confirms with",
      "`notifications/initialized` — only then do tools flow. This lesson runs",
      "that exact sequence against YOUR server and shows each step's verdict.",
    ].join("\n"),
    validate: [
      {
        kind: "mcp-handshake",
        argv: ["bun", "src/index.ts"],
        dir: "my-server",
        hint: "The server must answer initialize and tools/list — check stderr logging vs stdout JSON-RPC.",
      },
    ],
  },
  {
    id: "mcp-register",
    track: "mcp",
    order: 3,
    title: "Register your server with your agents",
    requires: ["git"],
    license: { tier: "original" },
    body: [
      "Add the server to patterson.config.ts under `mcp:` (argv array, project",
      "scope) and `patterson sync`. One entry emits: `.mcp.json` (Claude),",
      "`opencode.json` (type local), `.vscode/mcp.json` (servers key) and the",
      "Zed `context_servers` block — the C1/C2 shape differences are patterson's",
      "job now, not yours.",
    ].join("\n"),
    validate: [
      {
        kind: "file-contains",
        path: ".mcp.json",
        needle: "my-server",
        hint: "Add my-server to patterson.config.ts mcp: and run `patterson sync`.",
      },
    ],
  },
  // -------------------------------------------------------------------------
  // cert-prep — link-outs only (proprietary curricula, Constitution VI)
  // -------------------------------------------------------------------------
  {
    id: "cert-gh300",
    track: "cert-prep",
    order: 1,
    title: "GH-300: GitHub Copilot certification",
    requires: [],
    license: {
      tier: "link-out",
      source: "https://learn.microsoft.com/credentials/certifications/github-copilot/",
    },
    body: [
      "The GH-300 exam covers responsible AI, Copilot plans/features, data flow",
      "and privacy, prompt engineering, and rollout. Prepare with the official",
      "Microsoft Learn path (link in the lesson source) — then use this repo as",
      "your lab: the copilot track's artifacts map directly to exam domains.",
      "",
      "Checklist artifact: keep your notes in `cert/gh300-notes.md`.",
    ].join("\n"),
    validate: [
      {
        kind: "file-exists",
        path: "cert/gh300-notes.md",
        hint: "Create cert/gh300-notes.md with your study notes per exam domain.",
      },
    ],
  },
  {
    id: "cert-anthropic",
    track: "cert-prep",
    order: 2,
    title: "Anthropic Academy: Claude builder paths",
    requires: [],
    license: {
      tier: "link-out",
      source: "https://www.anthropic.com/learn",
    },
    body: [
      "Anthropic Academy's builder courses (API fundamentals, MCP, Claude Code",
      "in action) are the canonical Claude learning path. Work them at the",
      "source; capture what you build back here.",
      "",
      "Checklist artifact: `cert/anthropic-notes.md` with one section per course.",
    ].join("\n"),
    validate: [
      {
        kind: "file-exists",
        path: "cert/anthropic-notes.md",
        hint: "Create cert/anthropic-notes.md and log each completed module.",
      },
    ],
  },
];
