/* Patterson Docs — authored pages (part 2): Reference, Explanation */
window.DOCS_PAGES = window.DOCS_PAGES || {};

Object.assign(window.DOCS_PAGES, {

'reference': {
  group: 'Reference', title: 'Reference',
  lead: 'Reference guides are technical descriptions of the machinery and how to operate it. They are information-oriented: austere, accurate, and complete.',
  blocks: [
    ['compass', 'Information-oriented · the user is **applying** the craft · the documentation **informs cognition**.'],
    ['p', 'Reference material describes the product. It states facts — options, flags, schemas, return values — and resists the temptation to explain or instruct. The user consults it while working, the way you consult a map, not a travel guide.'],
    ['links', 'Claude Code — plugins', null, [
      ['Plugins reference', '#/ref-plugins', 'Schemas, CLI commands, and component specs.'],
      ['Create plugins', 'https://code.claude.com/docs/en/plugins.md'],
      ['Plugin marketplaces', 'https://code.claude.com/docs/en/plugin-marketplaces.md'],
    ]],
    ['links', 'Claude Code — reference', null, [
      ['Prompt library', '#/ref-prompt-library', 'Copy-paste prompts, tagged by task and role.'],
      ['CLI reference', 'https://code.claude.com/docs/en/cli-reference.md'],
      ['Settings', 'https://code.claude.com/docs/en/settings.md'],
      ['Environment variables', 'https://code.claude.com/docs/en/env-vars.md'],
      ['Hooks reference', 'https://code.claude.com/docs/en/hooks.md'],
      ['Tools reference', 'https://code.claude.com/docs/en/tools-reference.md'],
    ]],
    ['links', 'Agent Skills & MCP Apps', null, [
      ['Agent Skills — Specification', 'https://agentskills.io/specification.md'],
      ['MCP Apps — Specification (2026-01-26)', 'https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx'],
      ['MCP Apps — API Docs', 'https://apps.extensions.modelcontextprotocol.io/api/'],
      ['ext-apps — SDK packages', '#/ref-mcp-sdk'],
    ]],
    ['links', 'GitHub APIs & Copilot catalogs', null, [
      ['REST API', 'https://docs.github.com/en/rest'],
      ['GraphQL API', 'https://docs.github.com/en/graphql'],
      ['Custom agents catalog', '#/ref-copilot-agents'],
      ['Instructions catalog', '#/ref-copilot-instructions'],
    ]],
  ],
},

'ref-plugins': {
  group: 'Reference', title: 'Plugins reference',
  badge: 'imported',
  lead: 'Complete technical reference for the Claude Code plugin system: directory layout, manifest schemas, component specifications, and CLI commands.',
  blocks: [
    ['h2', 'Plugin structure'],
    ['p', 'A plugin is a directory containing a manifest and one or more component folders. The manifest lives at `.claude-plugin/plugin.json`.'],
    ['code', 'text', `my-plugin/
├── .claude-plugin/
│   └── plugin.json          # required manifest
├── commands/                # slash commands (*.md)
├── agents/                  # subagent definitions (*.md)
├── skills/                  # Agent Skills (SKILL.md + assets)
├── hooks/                   # hooks.json + scripts
└── .mcp.json                # bundled MCP servers`],
    ['h2', 'plugin.json'],
    ['table', ['Field', 'Type', 'Description'],
      [['`name`', 'string', 'Unique plugin identifier (required).'],
       ['`version`', 'string', 'Semantic version, e.g. `1.2.0`.'],
       ['`description`', 'string', 'One-line summary shown in the marketplace.'],
       ['`author`', 'object', '`{ name, email, url }`.'],
       ['`commands` / `agents` / `skills`', 'string[]', 'Override default component paths.'],
       ['`mcpServers`', 'object', 'Inline MCP server definitions, or a path to `.mcp.json`.']]],
    ['code', 'json', `{
  "name": "patterson-toolkit",
  "version": "1.0.0",
  "description": "Internal helpers for Patterson engineers",
  "author": { "name": "Platform Team" }
}`],
    ['h2', 'marketplace.json'],
    ['p', 'A marketplace is a repository that lists installable plugins. Its manifest sits at `.claude-plugin/marketplace.json`.'],
    ['code', 'json', `{
  "name": "patterson-marketplace",
  "plugins": [
    { "name": "patterson-toolkit", "source": "./plugins/toolkit" },
    { "name": "security-guidance", "source": "github:anthropics/security" }
  ]
}`],
    ['h2', 'Component paths & variables'],
    ['table', ['Variable', 'Resolves to'],
      [['`${CLAUDE_PLUGIN_ROOT}`', 'Absolute path to the installed plugin directory.'],
       ['`${CLAUDE_PROJECT_DIR}`', 'The user’s current project root.']]],
    ['info', 'Components are additive', 'Installing a plugin merges its commands, agents, skills, hooks, and MCP servers into the session. Nothing is overwritten — plugin components live alongside project- and user-level ones.'],
    ['h2', 'CLI commands'],
    ['table', ['Command', 'Effect'],
      [['`/plugin marketplace add <repo>`', 'Register a marketplace.'],
       ['`/plugin install <name>@<marketplace>`', 'Install a plugin.'],
       ['`/plugin list`', 'List installed plugins.'],
       ['`/plugin uninstall <name>`', 'Remove a plugin.']]],
    ['code', 'bash', `/plugin marketplace add modelcontextprotocol/ext-apps
/plugin install mcp-apps@modelcontextprotocol-ext-apps`],
    ['warning', 'Version constraints', 'Declare dependency ranges in `plugin.json` so your plugin keeps working when an upstream plugin ships a breaking change. Managed deployments can require an approved version range.'],
    ['links', 'Related', null, [
      ['Plugins reference (source)', 'https://code.claude.com/docs/en/plugins-reference.md'],
      ['Create plugins', 'https://code.claude.com/docs/en/plugins.md'],
      ['Create & distribute a marketplace', 'https://code.claude.com/docs/en/plugin-marketplaces.md'],
      ['Constrain plugin dependency versions', 'https://code.claude.com/docs/en/plugin-dependencies.md'],
    ]],
  ],
},

'ref-prompt-library': {
  group: 'Reference', title: 'Prompt library',
  badge: 'imported',
  lead: 'Copy-paste prompts for Claude Code, tagged by task and role. Grab one, adapt the placeholders, and paste it into a session.',
  blocks: [
    ['info', 'How to read this page', 'Each card is a starting prompt. Replace `<PLACEHOLDERS>` with your specifics. These are patterns, not magic strings — edit freely.'],
    ['h2', 'Explore a codebase'],
    ['code', 'text', `> give me a tour of this repo: the entry points, the main
  modules, and how a request flows through them. Cite files.`],
    ['code', 'text', `> where is <FEATURE> implemented? List the files and the key
  functions, then explain how they fit together.`],
    ['h2', 'Fix a bug'],
    ['code', 'text', `> this test is failing: <PASTE TEST NAME + OUTPUT>.
  Reproduce it, find the root cause, and propose the smallest fix.`],
    ['h2', 'Refactor'],
    ['code', 'text', `> extract the duplicated validation in <FILE A> and <FILE B>
  into a single helper, then update both call sites. Keep behavior identical.`],
    ['h2', 'Write tests'],
    ['code', 'text', `> add unit tests for <MODULE>. Cover the happy path plus the
  edge cases you find. Match the style of the existing tests.`],
    ['h2', 'Review a change'],
    ['code', 'text', `> review the staged diff for correctness, security, and
  readability. Be specific and cite line numbers.`],
    ['h2', 'Roles'],
    ['table', ['Role', 'Framing prompt'],
      [['Reviewer', '`> act as a senior reviewer. Challenge my assumptions.`'],
       ['Mentor', '`> explain your reasoning as you go so I learn the codebase.`'],
       ['Planner', '`> don’t write code yet — draft a plan and wait for my OK.`']]],
    ['tip', 'Turn a good prompt into a command', 'When you reuse a prompt often, save it as a slash command or a skill so it is one keystroke away for the whole team.'],
    ['links', 'Related', null, [
      ['Prompt library (source)', 'https://code.claude.com/docs/en/prompt-library.md'],
      ['GitHub Copilot Chat Cookbook', 'https://docs.github.com/en/copilot/tutorials/copilot-chat-cookbook'],
      ['Common workflows', 'https://code.claude.com/docs/en/common-workflows.md'],
    ]],
  ],
},

/* collection pages — metadata; groups rendered from DOCS_COLLECTIONS */
'ref-mcp-sdk': { group: 'Reference', title: 'ext-apps — SDK reference', lead: 'The MCP Apps SDK, its example servers, and starter templates.', collection: 'ref-mcp-sdk' },
'ref-copilot-agents': { group: 'Reference', title: 'Copilot — custom agents catalog', lead: 'Specialized GitHub Copilot agents, imported from Awesome Copilot.', collection: 'ref-copilot-agents' },
'ref-copilot-instructions': { group: 'Reference', title: 'Copilot — instructions catalog', lead: 'Coding-standard instruction files, imported from Awesome Copilot.', collection: 'ref-copilot-instructions' },

/* ---------------- EXPLANATION ---------------- */
'explanation': {
  group: 'Explanation', title: 'Explanation',
  lead: 'Explanation clarifies and illuminates a topic. It is understanding-oriented: discussion that provides context, weighs alternatives, and connects ideas.',
  blocks: [
    ['compass', 'Understanding-oriented · the user is **acquiring** the craft · the documentation **informs cognition**.'],
    ['p', 'Explanation is discursive. It can be read away from the product — on the sofa, not at the keyboard. It answers "why?": why the design is the way it is, how the pieces relate, what trade-offs were made. It deliberately steps back from the how-to.'],
    ['links', 'How Claude Code works', null, [
      ['Development containers', '#/ht-devcontainer', 'How isolation works with your editor.'],
      ['How Claude Code works', 'https://code.claude.com/docs/en/how-claude-code-works.md'],
      ['How the agent loop works', 'https://code.claude.com/docs/en/agent-sdk/agent-loop.md'],
      ['The context window', 'https://code.claude.com/docs/en/context-window.md'],
      ['How Claude remembers your project', 'https://code.claude.com/docs/en/memory.md'],
      ['Best practices', 'https://code.claude.com/docs/en/best-practices.md'],
    ]],
    ['links', 'Concepts — Copilot', null, [
      ['What are agents, skills & instructions', 'https://awesome-copilot.github.com/learning-hub/what-are-agents-skills-instructions/'],
      ['Understanding Copilot context', 'https://awesome-copilot.github.com/learning-hub/understanding-copilot-context/'],
      ['Understanding MCP servers', 'https://awesome-copilot.github.com/learning-hub/understanding-mcp-servers/'],
      ['Agentic workflows', 'https://awesome-copilot.github.com/learning-hub/agentic-workflows/'],
    ]],
    ['links', 'Concepts — Skills & MCP Apps', null, [
      ['Why MCP Apps?', '#/exp-mcp-apps', 'What problem interactive UIs solve.'],
      ['Agent Skills — Overview', 'https://agentskills.io/home.md'],
      ['Best practices for skill creators', 'https://agentskills.io/skill-creation/best-practices.md'],
    ]],
  ],
},

'exp-mcp-apps': {
  group: 'Explanation', title: 'Why MCP Apps?',
  lead: 'Model Context Protocol tools return text and structured data. That is enough for many cases — but not when the answer wants to be interactive.',
  blocks: [
    ['p', 'MCP tools return text and structured data. That works well until you need a chart, a form, a design canvas, or a video player. **MCP Apps** provide a standardized way to deliver interactive UIs from MCP servers, rendered inline in the conversation, in context, in any compliant host.'],
    ['h2', 'How it works'],
    ['ol', [
      '**Tool definition** — your tool declares a `ui://` resource containing its HTML interface.',
      '**Tool call** — the model calls the tool on your server.',
      '**Host renders** — the host fetches the resource and displays it in a sandboxed iframe.',
      '**Bidirectional communication** — the host passes tool data to the UI via notifications, and the UI can call other tools back through the host.',
    ]],
    ['info', 'An extension, not a fork', 'MCP Apps is an extension to the core MCP specification. Host support varies — Claude, ChatGPT, VS Code, Goose, Postman and others implement it to differing degrees.'],
    ['h2', 'Why standardize it'],
    ['p', 'Before MCP Apps, each host invented its own way to embed rich tool output, so a UI built for one client did not run in another. A shared protocol means one View — a chart, a dashboard — renders the same across every compliant host, and server authors write it once.'],
    ['links', 'Go deeper', null, [
      ['MCP Apps — repository', 'https://github.com/modelcontextprotocol/ext-apps'],
      ['Specification (2026-01-26)', 'https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx'],
      ['Quickstart', 'https://apps.extensions.modelcontextprotocol.io/api/documents/Quickstart.html'],
      ['SDK packages', '#/ref-mcp-sdk'],
    ]],
  ],
},

});
