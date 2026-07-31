/* ============================================================
   Patterson Docs — content model
   Sitemap follows Diátaxis (diataxis.fr): four needs — Tutorials,
   How-to guides, Reference, Explanation — arranged in a complex
   hierarchy (diataxis.fr/complex-hierarchies).
   External links imported from the sources named in the brief.
   ============================================================ */

/* Sidebars keyed by top-nav section. Item shape:
   { text, id }            -> internal authored page (routes to #/id)
   { text, href }          -> external link (opens new tab)
   { text, items:[...] }   -> collapsible group (landing page = first child or group id)
   A group may carry `id` to make its heading a landing page. */

window.DOCS_SIDEBARS = {
  foundations: [
    { text: 'Foundations', items: [
      { text: 'The Diátaxis approach', id: 'foundations' },
      { text: 'Two dimensions of craft', id: 'foundations-dimensions' },
      { text: 'Complex hierarchies', id: 'foundations-hierarchies' },
    ]},
    { text: 'The four modes', items: [
      { text: 'Tutorials', id: 'tutorials' },
      { text: 'How-to guides', id: 'how-to' },
      { text: 'Reference', id: 'reference' },
      { text: 'Explanation', id: 'explanation' },
    ]},
    { text: 'Reference', items: [
      { text: 'diataxis.fr — Start here', href: 'https://diataxis.fr/start-here/' },
      { text: 'The compass', href: 'https://diataxis.fr/compass/' },
      { text: 'The map', href: 'https://diataxis.fr/map/' },
      { text: 'Quality', href: 'https://diataxis.fr/quality/' },
    ]},
  ],

  tutorials: [
    { text: 'Tutorials', items: [
      { text: 'About tutorials', id: 'tutorials' },
      { text: 'Your first session', id: 'tut-first-session' },
    ]},
    { text: 'Claude Code · getting started', items: [
      { text: 'Quickstart', href: 'https://code.claude.com/docs/en/quickstart.md' },
      { text: 'Web quickstart', href: 'https://code.claude.com/docs/en/web-quickstart.md' },
      { text: 'Desktop quickstart', href: 'https://code.claude.com/docs/en/desktop-quickstart.md' },
      { text: 'Agent SDK quickstart', href: 'https://code.claude.com/docs/en/agent-sdk/quickstart.md' },
    ]},
    { text: 'Copilot CLI for Beginners', items: [
      { text: '00 · Quick Start', href: 'https://awesome-copilot.github.com/learning-hub/cli-for-beginners/00-quick-start/' },
      { text: '01 · First Steps', href: 'https://awesome-copilot.github.com/learning-hub/cli-for-beginners/01-setup-and-first-steps/' },
      { text: '02 · Context & Conversations', href: 'https://awesome-copilot.github.com/learning-hub/cli-for-beginners/02-context-and-conversations/' },
      { text: '03 · Development Workflows', href: 'https://awesome-copilot.github.com/learning-hub/cli-for-beginners/03-development-workflows/' },
      { text: '04 · Specialized AI Assistants', href: 'https://awesome-copilot.github.com/learning-hub/cli-for-beginners/04-agents-and-custom-instructions/' },
      { text: '05 · Automate Repetitive Tasks', href: 'https://awesome-copilot.github.com/learning-hub/cli-for-beginners/05-skills/' },
      { text: '06 · Connect to APIs & DBs', href: 'https://awesome-copilot.github.com/learning-hub/cli-for-beginners/06-mcp-servers/' },
      { text: '07 · Putting It All Together', href: 'https://awesome-copilot.github.com/learning-hub/cli-for-beginners/07-putting-it-all-together/' },
    ]},
    { text: 'Ecosystem tutorials', items: [
      { text: 'Agent Skills — Quickstart', href: 'https://agentskills.io/skill-creation/quickstart.md' },
      { text: 'MCP Apps — Quickstart', href: 'https://apps.extensions.modelcontextprotocol.io/api/documents/Quickstart.html' },
      { text: 'GitHub — Hello World', href: 'https://docs.github.com/en/get-started/start-your-journey/hello-world' },
    ]},
  ],

  'how-to': [
    { text: 'How-to guides', items: [
      { text: 'About how-to guides', id: 'how-to' },
    ]},
    { text: 'Install & set up', items: [
      { text: 'Use Claude Code in VS Code', id: 'ht-vscode', badge: 'Linux' },
      { text: 'Development containers', id: 'ht-devcontainer' },
      { text: 'Advanced setup', href: 'https://code.claude.com/docs/en/setup.md' },
      { text: 'JetBrains IDEs', href: 'https://code.claude.com/docs/en/jetbrains.md' },
    ]},
    { text: 'Everyday workflows (Claude Code)', items: [
      { text: 'Common workflows', href: 'https://code.claude.com/docs/en/common-workflows.md' },
      { text: 'Automate actions with hooks', href: 'https://code.claude.com/docs/en/hooks-guide.md' },
      { text: 'Connect to MCP servers', href: 'https://code.claude.com/docs/en/mcp-quickstart.md' },
      { text: 'Run parallel sessions with worktrees', href: 'https://code.claude.com/docs/en/worktrees.md' },
      { text: 'GitHub Actions', href: 'https://code.claude.com/docs/en/github-actions.md' },
      { text: 'Extend Claude with skills', href: 'https://code.claude.com/docs/en/skills.md' },
    ]},
    { text: 'Customize GitHub Copilot', items: [
      { text: 'Building custom agents', href: 'https://awesome-copilot.github.com/learning-hub/building-custom-agents/' },
      { text: 'Creating effective skills', href: 'https://awesome-copilot.github.com/learning-hub/creating-effective-skills/' },
      { text: 'Defining custom instructions', href: 'https://awesome-copilot.github.com/learning-hub/defining-custom-instructions/' },
      { text: 'Installing & using plugins', href: 'https://awesome-copilot.github.com/learning-hub/installing-and-using-plugins/' },
      { text: 'Automating with hooks', href: 'https://awesome-copilot.github.com/learning-hub/automating-with-hooks/' },
      { text: 'Using the Copilot coding agent', href: 'https://awesome-copilot.github.com/learning-hub/using-copilot-coding-agent/' },
    ]},
    { text: 'Build MCP Apps', items: [
      { text: 'create-mcp-app skill', href: 'https://github.com/modelcontextprotocol/ext-apps/blob/main/plugins/mcp-apps/skills/create-mcp-app/SKILL.md' },
      { text: 'migrate-oai-app skill', href: 'https://github.com/modelcontextprotocol/ext-apps/blob/main/plugins/mcp-apps/skills/migrate-oai-app/SKILL.md' },
      { text: 'add-app-to-server skill', href: 'https://github.com/modelcontextprotocol/ext-apps/blob/main/plugins/mcp-apps/skills/add-app-to-server/SKILL.md' },
      { text: 'convert-web-app skill', href: 'https://github.com/modelcontextprotocol/ext-apps/blob/main/plugins/mcp-apps/skills/convert-web-app/SKILL.md' },
    ]},
    { text: 'GitHub how-tos', items: [
      { text: 'Set up the GitHub MCP server', href: 'https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp-in-your-ide/set-up-the-github-mcp-server' },
      { text: 'Extend Copilot Chat with MCP', href: 'https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp-in-your-ide/extend-copilot-chat-with-mcp' },
      { text: 'Connect with SSH', href: 'https://docs.github.com/en/authentication/connecting-to-github-with-ssh' },
      { text: 'Create a GitHub Pages site', href: 'https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site' },
    ]},
  ],

  reference: [
    { text: 'Reference', items: [
      { text: 'About reference', id: 'reference' },
    ]},
    { text: 'Claude Code · plugins', items: [
      { text: 'Plugins reference', id: 'ref-plugins', badge: 'imported' },
      { text: 'Create plugins', href: 'https://code.claude.com/docs/en/plugins.md' },
      { text: 'Plugin marketplaces', href: 'https://code.claude.com/docs/en/plugin-marketplaces.md' },
      { text: 'Discover & install plugins', href: 'https://code.claude.com/docs/en/discover-plugins.md' },
    ]},
    { text: 'Claude Code · reference', items: [
      { text: 'Prompt library', id: 'ref-prompt-library', badge: 'imported' },
      { text: 'CLI reference', href: 'https://code.claude.com/docs/en/cli-reference.md' },
      { text: 'Settings', href: 'https://code.claude.com/docs/en/settings.md' },
      { text: 'Environment variables', href: 'https://code.claude.com/docs/en/env-vars.md' },
      { text: 'Hooks reference', href: 'https://code.claude.com/docs/en/hooks.md' },
      { text: 'Tools reference', href: 'https://code.claude.com/docs/en/tools-reference.md' },
      { text: 'Slash commands', href: 'https://code.claude.com/docs/en/commands.md' },
      { text: 'Interactive mode', href: 'https://code.claude.com/docs/en/interactive-mode.md' },
      { text: 'Glossary', href: 'https://code.claude.com/docs/en/glossary.md' },
      { text: 'Error reference', href: 'https://code.claude.com/docs/en/errors.md' },
    ]},
    { text: 'Agent SDK reference', items: [
      { text: 'TypeScript', href: 'https://code.claude.com/docs/en/agent-sdk/typescript.md' },
      { text: 'Python', href: 'https://code.claude.com/docs/en/agent-sdk/python.md' },
      { text: 'Overview', href: 'https://code.claude.com/docs/en/agent-sdk/overview.md' },
    ]},
    { text: 'Agent Skills & MCP Apps', items: [
      { text: 'Agent Skills — Specification', href: 'https://agentskills.io/specification.md' },
      { text: 'MCP Apps — Specification (2026-01-26)', href: 'https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx' },
      { text: 'MCP Apps — API Docs', href: 'https://apps.extensions.modelcontextprotocol.io/api/' },
      { text: 'ext-apps — SDK packages', id: 'ref-mcp-sdk' },
    ]},
    { text: 'GitHub APIs', items: [
      { text: 'REST API', href: 'https://docs.github.com/en/rest' },
      { text: 'GraphQL API', href: 'https://docs.github.com/en/graphql' },
      { text: 'Actions — Workflow syntax', href: 'https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax' },
      { text: 'GitHub CLI', href: 'https://docs.github.com/en/github-cli/github-cli' },
    ]},
    { text: 'Copilot catalogs', items: [
      { text: 'Custom agents catalog', id: 'ref-copilot-agents' },
      { text: 'Instructions catalog', id: 'ref-copilot-instructions' },
      { text: 'Terminology glossary', href: 'https://awesome-copilot.github.com/learning-hub/github-copilot-terminology-glossary/' },
    ]},
  ],

  explanation: [
    { text: 'Explanation', items: [
      { text: 'About explanation', id: 'explanation' },
    ]},
    { text: 'How Claude Code works', items: [
      { text: 'Development containers', id: 'ht-devcontainer', badge: 'imported' },
      { text: 'How Claude Code works', href: 'https://code.claude.com/docs/en/how-claude-code-works.md' },
      { text: 'How the agent loop works', href: 'https://code.claude.com/docs/en/agent-sdk/agent-loop.md' },
      { text: 'The context window', href: 'https://code.claude.com/docs/en/context-window.md' },
      { text: 'How Claude remembers your project', href: 'https://code.claude.com/docs/en/memory.md' },
      { text: 'Best practices', href: 'https://code.claude.com/docs/en/best-practices.md' },
      { text: 'Security', href: 'https://code.claude.com/docs/en/security.md' },
    ]},
    { text: 'Concepts — Copilot', items: [
      { text: 'What are agents, skills & instructions', href: 'https://awesome-copilot.github.com/learning-hub/what-are-agents-skills-instructions/' },
      { text: 'Understanding Copilot context', href: 'https://awesome-copilot.github.com/learning-hub/understanding-copilot-context/' },
      { text: 'Understanding MCP servers', href: 'https://awesome-copilot.github.com/learning-hub/understanding-mcp-servers/' },
      { text: 'Agentic workflows', href: 'https://awesome-copilot.github.com/learning-hub/agentic-workflows/' },
      { text: 'Agents and subagents', href: 'https://awesome-copilot.github.com/learning-hub/agents-and-subagents/' },
    ]},
    { text: 'Concepts — Skills & MCP Apps', items: [
      { text: 'Agent Skills — Overview', href: 'https://agentskills.io/home.md' },
      { text: 'Best practices for skill creators', href: 'https://agentskills.io/skill-creation/best-practices.md' },
      { text: 'Evaluating skill output quality', href: 'https://agentskills.io/skill-creation/evaluating-skills.md' },
      { text: 'Why MCP Apps?', id: 'exp-mcp-apps' },
    ]},
  ],
};

/* Top-nav definition (VitePress-style). */
window.DOCS_NAV = [
  { text: 'Foundations', section: 'foundations', to: '#/foundations' },
  { text: 'Tutorials', section: 'tutorials', to: '#/tutorials' },
  { text: 'How-to', section: 'how-to', to: '#/how-to' },
  { text: 'Reference', section: 'reference', to: '#/reference' },
  { text: 'Explanation', section: 'explanation', to: '#/explanation' },
];

/* Which top-nav section each authored page belongs to (drives sidebar + active nav). */
window.DOCS_PAGE_SECTION = {
  'home': null,
  'foundations': 'foundations',
  'foundations-dimensions': 'foundations',
  'foundations-hierarchies': 'foundations',
  'tutorials': 'tutorials',
  'tut-first-session': 'tutorials',
  'how-to': 'how-to',
  'ht-vscode': 'how-to',
  'ht-devcontainer': 'how-to',
  'reference': 'reference',
  'ref-plugins': 'reference',
  'ref-prompt-library': 'reference',
  'ref-mcp-sdk': 'reference',
  'ref-copilot-agents': 'reference',
  'ref-copilot-instructions': 'reference',
  'explanation': 'explanation',
  'exp-mcp-apps': 'explanation',
};
