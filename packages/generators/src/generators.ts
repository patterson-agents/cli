/**
 * The six v1 generators (E-P5, US5): skill, mcp-server, plugin, marketplace,
 * command, cli-plugin. All templates are inline and deterministic; pinned
 * versions come from verified facts (sdk@1.30.0 per S1, zod@4.4.3 — the
 * exact pins this repo itself uses; no `@latest` anywhere, Constitution IV).
 */
import { join } from "node:path";

import { MARKETPLACE_MANIFEST_PATHS, type Finding } from "@patterson/core";

import type { Generator } from "./engine.ts";

/** Pins mirrored from this repo's own gated installs (Constitution IV). */
export const PINS = {
  mcpSdk: "1.30.0",
  zod: "4.4.3",
  typesBun: "1.3.14",
} as const;

// ---------------------------------------------------------------------------
// skill
// ---------------------------------------------------------------------------

/** Read the `name:` field of a SKILL.md frontmatter block. */
export function frontmatterName(content: string): string | null {
  const match = /^---\n([\s\S]*?)\n---/.exec(content);
  if (!match) return null;
  const nameLine = (match[1] ?? "").split("\n").find((line) => line.startsWith("name:"));
  return nameLine?.slice("name:".length).trim() ?? null;
}

export const skillGenerator: Generator = {
  kind: "skill",
  summary: "Scaffold an Agent Skill in .agents/skills/<name>/ (spec-valid, dir == name)",
  generate(name) {
    return {
      files: [
        {
          path: `.agents/skills/${name}/SKILL.md`,
          content: [
            "---",
            `name: ${name}`,
            `description: TODO — one sentence: when should an agent use the ${name} skill?`,
            "---",
            "",
            `# ${name}`,
            "",
            "TODO: instructions the agent follows when this skill activates.",
            "",
            "## Steps",
            "",
            "1. …",
            "",
          ].join("\n"),
        },
      ],
      notes: [
        `Canonical home: .agents/skills/${name}/ (D6). Link it for Claude Code:`,
        `  ln -s ../../.agents/skills/${name} .claude/skills/${name}`,
        "opencode needs `skills.paths: [\".agents/skills\"]` (patterson sync emits it).",
      ],
    };
  },
  planSections(name) {
    return [
      "## Purpose",
      `- What task should the ${name} skill make an agent good at?`,
      "",
      "## Activation",
      "- When should an agent reach for it (the frontmatter `description`)?",
      "",
      "## Steps",
      "- The procedure, as numbered steps.",
    ];
  },
  async postValidate(root, name) {
    const findings: Finding[] = [];
    const content = await Bun.file(join(root, `.agents/skills/${name}/SKILL.md`)).text();
    const declared = frontmatterName(content);
    if (declared !== name) {
      findings.push({
        checkId: "generators.skill.name",
        severity: "error",
        message: `SKILL.md frontmatter name "${declared ?? "(missing)"}" must equal the directory name "${name}" (C6).`,
        path: `.agents/skills/${name}/SKILL.md`,
      });
    }
    return findings;
  },
};

// ---------------------------------------------------------------------------
// mcp-server
// ---------------------------------------------------------------------------

export const mcpServerGenerator: Generator = {
  kind: "mcp-server",
  summary: "Scaffold a standalone stdio MCP server (Bun + pinned sdk) with a handshake self-test",
  generate(name) {
    return {
      files: [
        {
          path: `${name}/package.json`,
          content: `${JSON.stringify(
            {
              name,
              version: "0.1.0",
              private: true,
              type: "module",
              module: "src/index.ts",
              scripts: { start: "bun run src/index.ts", test: "bun test" },
              dependencies: {
                "@modelcontextprotocol/sdk": PINS.mcpSdk,
                zod: PINS.zod,
              },
              devDependencies: { "@types/bun": PINS.typesBun },
            },
            null,
            2,
          )}\n`,
        },
        {
          path: `${name}/src/index.ts`,
          content: [
            "#!/usr/bin/env bun",
            `// ${name} — stdio MCP server (scaffolded by patterson new mcp-server).`,
            "// Contract: stdout is reserved for JSON-RPC; log to stderr only.",
            'import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";',
            'import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";',
            'import { z } from "zod";',
            "",
            `const server = new McpServer({ name: "${name}", version: "0.1.0" });`,
            "",
            "server.registerTool(",
            '  "echo",',
            "  {",
            '    title: "Echo a message",',
            '    description: "Echoes a message back, optionally uppercased.",',
            "    inputSchema: {",
            '      message: z.string().min(1).describe("Message to echo"),',
            '      upper: z.boolean().optional().describe("Uppercase the reply"),',
            "    },",
            "    annotations: { readOnlyHint: true, destructiveHint: false },",
            "  },",
            "  async ({ message, upper }) => ({",
            '    content: [{ type: "text", text: upper ? message.toUpperCase() : message }],',
            "  }),",
            ");",
            "",
            "server.registerTool(",
            '  "add",',
            "  {",
            '    title: "Add two numbers",',
            '    description: "Returns the sum of two numbers.",',
            "    inputSchema: {",
            '      a: z.number().describe("First addend"),',
            '      b: z.number().describe("Second addend"),',
            "    },",
            "    annotations: { readOnlyHint: true, destructiveHint: false },",
            "  },",
            "  async ({ a, b }) => ({",
            '    content: [{ type: "text", text: String(a + b) }],',
            "  }),",
            ");",
            "",
            `console.error("[${name}] stdio transport starting");`,
            "await server.connect(new StdioServerTransport());",
            "",
          ].join("\n"),
        },
        {
          path: `${name}/test/handshake.test.ts`,
          content: [
            "// Handshake self-test: initialize → tools/list → tools/call over raw",
            "// stdio, exactly what a real MCP host does. Self-contained on purpose —",
            "// this project must pass `bun test` with no patterson dependency.",
            'import { describe, expect, test } from "bun:test";',
            "",
            'const SERVER = new URL("../src/index.ts", import.meta.url).pathname;',
            "",
            "interface Res { id?: number; result?: Record<string, unknown>; error?: { message: string } }",
            "",
            "async function rpc(steps: { method: string; params?: Record<string, unknown> }[]): Promise<Res[]> {",
            '  const proc = Bun.spawn(["bun", SERVER], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });',
            "  const out: Res[] = [];",
            "  const decoder = new TextDecoder();",
            "  let buffer = \"\";",
            "  const reader = (async () => {",
            "    for await (const chunk of proc.stdout) {",
            "      buffer += decoder.decode(chunk, { stream: true });",
            "      let idx: number;",
            '      while ((idx = buffer.indexOf("\\n")) !== -1) {',
            "        const line = buffer.slice(0, idx).trim();",
            "        buffer = buffer.slice(idx + 1);",
            "        if (line) out.push(JSON.parse(line) as Res);",
            "      }",
            "    }",
            "  })();",
            "  let id = 1;",
            "  for (const step of steps) {",
            "    const payload = step.method.startsWith(\"notifications/\")",
            '      ? { jsonrpc: "2.0", method: step.method, ...(step.params ? { params: step.params } : {}) }',
            '      : { jsonrpc: "2.0", id: id++, method: step.method, ...(step.params ? { params: step.params } : {}) };',
            "    proc.stdin.write(`${JSON.stringify(payload)}\\n`);",
            "    await Bun.sleep(150);",
            "  }",
            "  proc.kill();",
            "  await proc.exited;",
            "  await reader;",
            "  return out;",
            "}",
            "",
            'describe("MCP handshake", () => {',
            '  test("initialize → tools/list → tools/call round-trips", async () => {',
            "    const responses = await rpc([",
            '      { method: "initialize", params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "self-test", version: "0.0.1" } } },',
            '      { method: "notifications/initialized" },',
            '      { method: "tools/list", params: {} },',
            '      { method: "tools/call", params: { name: "add", arguments: { a: 2, b: 3 } } },',
            "    ]);",
            "    expect(responses.some((res) => res.error)).toBe(false);",
            "    const list = responses.find((res) => (res.result as { tools?: unknown[] } | undefined)?.tools);",
            "    const tools = (list?.result as { tools: { name: string }[] }).tools.map((tool) => tool.name);",
            '    expect(tools.toSorted()).toEqual(["add", "echo"]);',
            "    const call = responses.find((res) => (res.result as { content?: unknown[] } | undefined)?.content);",
            "    const content = (call?.result as { content: { text?: string }[] }).content;",
            '    expect(content[0]?.text).toBe("5");',
            "  });",
            "});",
            "",
          ].join("\n"),
        },
        {
          path: `${name}/README.md`,
          content: [
            `# ${name}`,
            "",
            "A stdio MCP server scaffolded by `patterson new mcp-server`.",
            "",
            "```sh",
            "bun install",
            "bun test        # handshake self-test",
            "bun run start   # serve over stdio",
            "```",
            "",
            "Register with Claude Code:",
            "",
            "```sh",
            `claude mcp add ${name} -- bun run ${name}/src/index.ts`,
            "```",
            "",
          ].join("\n"),
        },
      ],
      notes: [`cd ${name} && bun install && bun test — the handshake self-test must pass.`],
    };
  },
  planSections(name) {
    return [
      "## Tools",
      `- Which tools should ${name} expose (name, inputs, read-only or destructive)?`,
      "",
      "## Data sources",
      "- What does it read/write; which credentials (as env SecretRefs, never inline)?",
      "",
      "## Hosts",
      "- Which agents connect (Claude Code, opencode, VS Code, Zed)?",
    ];
  },
};

// ---------------------------------------------------------------------------
// plugin + cli-plugin
// ---------------------------------------------------------------------------

function pluginFiles(packageName: string, dir: string): { path: string; content: string }[] {
  return [
    {
      path: `${dir}/package.json`,
      content: `${JSON.stringify(
        {
          name: packageName,
          version: "0.1.0",
          private: true,
          type: "module",
          module: "src/index.ts",
          exports: { ".": "./src/index.ts" },
          peerDependencies: { "@patterson/core": "*" },
          devDependencies: { "@types/bun": PINS.typesBun },
        },
        null,
        2,
      )}\n`,
    },
    {
      path: `${dir}/src/index.ts`,
      content: [
        `// ${packageName} — a patterson plugin (definePattersonPlugin surface).`,
        "// v1 plugins are build-time registered; dynamic loading lands in P8 (S4).",
        'import { definePattersonPlugin, type CheckDef, type Finding } from "@patterson/core";',
        "",
        "const exampleCheck: CheckDef = {",
        `  id: "${packageName.replaceAll("/", ".")}.example",`,
        '  description: "Example check contributed by this plugin",',
        "  run: async (): Promise<Finding[]> => [],",
        "};",
        "",
        "export default definePattersonPlugin({",
        `  name: "${packageName}",`,
        "  checks: [exampleCheck],",
        "});",
        "",
      ].join("\n"),
    },
  ];
}

export const pluginGenerator: Generator = {
  kind: "plugin",
  summary: "Scaffold a patterson plugin package (definePattersonPlugin, build-time registered)",
  generate(name) {
    return {
      files: pluginFiles(name, name),
      notes: [
        "v1 plugins are build-time registered: add the package to your workspace and",
        "import its default export where you build the registry. Dynamic loading is P8 (S4).",
      ],
    };
  },
  planSections() {
    return [
      "## Contributions",
      "- Which slots does the plugin fill: commands, emitters, checks, generators, lessons?",
      "",
      "## Inputs",
      "- What configuration does it need from patterson.config.ts `raw`/plugin config?",
    ];
  },
};

export const cliPluginGenerator: Generator = {
  kind: "cli-plugin",
  summary: "Scaffold a distributable patterson CLI plugin (patterson-plugin-<name>)",
  generate(name) {
    const packageName = `patterson-plugin-${name}`;
    const files = pluginFiles(packageName, packageName);
    files.push({
      path: `${packageName}/src/cli.ts`,
      content: [
        "#!/usr/bin/env bun",
        `// Out-of-process entry (research D-plugins): \`bunx ${packageName}\``,
        "// prints the plugin manifest as JSON so hosts can discover contributions",
        "// without loading arbitrary code in-process (S4 fallback design).",
        'import plugin from "./index.ts";',
        "",
        "console.log(JSON.stringify({",
        "  name: plugin.name,",
        "  commands: plugin.commands?.map((command) => command.id) ?? [],",
        "  checks: plugin.checks?.map((check) => check.id) ?? [],",
        "}, null, 2));",
        "",
      ].join("\n"),
    });
    return {
      files,
      notes: [
        `Distributable as ${packageName}; hosts discover it out-of-process via`,
        `\`bunx ${packageName}\` (S4 fallback) until in-process loading lands (P8).`,
      ],
    };
  },
  planSections(name) {
    return [
      "## Distribution",
      `- npm package name: patterson-plugin-${name}; who installs it and how?`,
      "",
      "## Contributions",
      "- Commands / emitters / checks the plugin adds.",
    ];
  },
};

// ---------------------------------------------------------------------------
// marketplace
// ---------------------------------------------------------------------------

export const marketplaceGenerator: Generator = {
  kind: "marketplace",
  summary:
    "Scaffold an in-repo Claude plugin marketplace (dual .claude-plugin/ + .github/plugin/ manifests)",
  generate(name) {
    // ONE manifest string, emitted at BOTH published paths. Cross-vendor
    // support here is a copy, not a transform: githubnext/ado-aw ships
    // .claude-plugin/marketplace.json and .github/plugin/marketplace.json with
    // identical bytes (both sha256 f7010cf3…, verified with cmp/sha256sum
    // against the vendored copy of that repo — Constitution V). Any divergence
    // is drift, and `patterson doctor` reports it as
    // `marketplace.manifests-diverged`.
    const manifest = `${JSON.stringify(
      {
        name,
        metadata: { description: `TODO: what does the ${name} marketplace collect?` },
        plugins: [
          {
            name: "example-plugin",
            // The "./" prefix is required: Claude resolves plugin sources
            // relative to the marketplace root and does not accept a bare path.
            source: "./plugins/example-plugin",
            description: "TODO: replace with a real plugin entry",
          },
        ],
      },
      null,
      2,
    )}\n`;
    return {
      files: [
        { path: MARKETPLACE_MANIFEST_PATHS.claude, content: manifest },
        { path: MARKETPLACE_MANIFEST_PATHS.github, content: manifest },
      ],
      notes: [
        "In-repo marketplace, published at both known paths:",
        `  ${MARKETPLACE_MANIFEST_PATHS.claude} (read by Claude Code)`,
        `  ${MARKETPLACE_MANIFEST_PATHS.github} (in-repo convention)`,
        "Keep them byte-identical — edit one and copy it over the other;",
        "`patterson doctor` fails with marketplace.manifests-diverged otherwise.",
        "Consumers add it with:",
        `  /plugin marketplace add <owner>/<this-repo>`,
      ],
    };
  },
  planSections(name) {
    return [
      "## Scope",
      `- What family of plugins does ${name} curate?`,
      "",
      "## Entries",
      "- Initial plugin list (name, source path or repo, description).",
    ];
  },
};

// ---------------------------------------------------------------------------
// command (self-extension)
// ---------------------------------------------------------------------------

export const commandGenerator: Generator = {
  kind: "command",
  summary: "Scaffold a patterson command descriptor module (self-extension)",
  generate(name) {
    const id = name.replaceAll("-", ".");
    return {
      files: [
        {
          path: `patterson-commands/${name}.ts`,
          content: [
            `// Command descriptor "${id}" (scaffolded by patterson new command).`,
            "// Register it where you build the registry (buildRegistry) — commands are",
            "// defined once and surfaced as both CLI subcommand and MCP tool.",
            'import { z } from "zod";',
            'import { defineCommand, type CommandResult } from "@patterson/core";',
            "",
            "export const InputSchema = z.strictObject({",
            '  // TODO: flags — every prompt must be flag-first ("processArgument").',
            "});",
            "",
            "export const OutputSchema = z.strictObject({",
            "  ok: z.boolean(),",
            "});",
            "",
            "export type Output = z.infer<typeof OutputSchema>;",
            "",
            `export const ${name.replaceAll(/-(\w)/g, (_match, ch: string) => ch.toUpperCase())}Command = defineCommand({`,
            `  id: "${id}",`,
            `  path: ${JSON.stringify(name.split("-"))},`,
            `  summary: "TODO: one line — what does ${name} do?",`,
            "  inputSchema: InputSchema,",
            "  outputSchema: OutputSchema,",
            "  annotations: { readOnlyHint: true, destructiveHint: false },",
            "  async run(_args, _ctx): Promise<CommandResult<Output>> {",
            '    return { kind: "ok", value: { ok: true } };',
            "  },",
            "});",
            "",
          ].join("\n"),
        },
      ],
      notes: [
        `Register the descriptor in your registry wiring, then it appears as both`,
        `\`patterson ${name.split("-").join(" ")}\` and the MCP tool \`patterson_${name.replaceAll("-", "_")}\`.`,
      ],
    };
  },
  planSections(name) {
    return [
      "## Behavior",
      `- What does \`patterson ${name.split("-").join(" ")}\` do; read-only or destructive?`,
      "",
      "## Inputs/Outputs",
      "- Flags (zod input schema) and the machine-readable output shape.",
    ];
  },
};

export const ALL_GENERATORS: readonly Generator[] = [
  skillGenerator,
  mcpServerGenerator,
  pluginGenerator,
  marketplaceGenerator,
  commandGenerator,
  cliPluginGenerator,
];
