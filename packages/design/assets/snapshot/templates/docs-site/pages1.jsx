/* Patterson Docs — authored pages (part 1): Foundations, Tutorials, How-to */
window.DOCS_PAGES = window.DOCS_PAGES || {};

Object.assign(window.DOCS_PAGES, {

'foundations': {
  group: 'Foundations', title: 'The Diátaxis approach',
  lead: 'Patterson Docs is organised with Diátaxis — a systematic framework that identifies four distinct documentation needs and structures content around them.',
  blocks: [
    ['compass', 'Diátaxis identifies four modes of documentation — **tutorials**, **how-to guides**, **reference** and **explanation** — each serving a different user need. Good documentation keeps them distinct.'],
    ['p', 'Diátaxis is based on the principle that documentation must serve the needs of its users, and that those needs are defined by the nature of *craft* itself. Every page in this site belongs to exactly one of the four modes, and never tries to do the job of another.'],
    ['h2', 'The four modes'],
    ['table', ['Mode', 'User need', 'Serves', 'Form'],
      [['Tutorials', 'Learning', 'Acquiring the craft', 'Informs action'],
       ['How-to guides', 'A goal', 'Applying the craft', 'Informs action'],
       ['Reference', 'Information', 'Applying the craft', 'Informs cognition'],
       ['Explanation', 'Understanding', 'Acquiring the craft', 'Informs cognition']]],
    ['links', 'Explore each mode', 'Every section below opens with a landing page that introduces its contents.', [
      ['Tutorials', '#/tutorials', 'Lessons that take a newcomer by the hand.'],
      ['How-to guides', '#/how-to', 'Directions to achieve a specific goal.'],
      ['Reference', '#/reference', 'Dry, accurate technical description.'],
      ['Explanation', '#/explanation', 'Discussion that deepens understanding.'],
    ]],
    ['links', 'Source', null, [
      ['diataxis.fr — Foundations', 'https://diataxis.fr/foundations/'],
      ['diataxis.fr — Start here', 'https://diataxis.fr/start-here/'],
    ]],
  ],
},

'foundations-dimensions': {
  group: 'Foundations', title: 'Two dimensions of craft',
  lead: 'Why exactly four modes — not three, not five. The answer comes from a two-dimensional map of skill.',
  blocks: [
    ['p', 'A craft contains both **action** (knowing *how*, what we do) and **cognition** (knowing *that*, what we think). Separately, a practitioner both **acquires** their craft and **applies** it. These two independent axes divide the territory of skill into four quarters — and there simply is no other territory to cover.'],
    ['h2', 'Action / cognition'],
    ['p', 'Practical knowledge and theoretical knowledge are counterparts: distinct, but bound up with each other. Documentation that informs action (tutorials, how-to guides) is a different thing from documentation that informs cognition (reference, explanation).'],
    ['h2', 'Acquisition / application'],
    ['p', 'Being *at study* (acquiring skill) and being *at work* (applying it) are likewise counterparts. A user learning the craft has different needs from the same user getting a job done.'],
    ['info', 'A complete map', 'Because the two dimensions define the whole territory, there are necessarily four quarters — this is not an arbitrary number. Map action×acquisition to tutorials, action×application to how-to guides, cognition×application to reference, and cognition×acquisition to explanation.'],
    ['links', 'Source', null, [
      ['diataxis.fr — Foundations', 'https://diataxis.fr/foundations/'],
      ['diataxis.fr — The map', 'https://diataxis.fr/map/'],
    ]],
  ],
},

'foundations-hierarchies': {
  group: 'Foundations', title: 'Complex hierarchies',
  lead: 'How to structure large documentation sets without muddling the four modes.',
  blocks: [
    ['p', 'For most products a straightforward arrangement works: a home landing page, then a landing page for each of the four modes, with content beneath. Each landing page contains an overview of what lies within — it introduces the material, it does not merely list it.'],
    ['code', 'text', `Home                      <- landing page
    Tutorials             <- landing page
    How-to guides         <- landing page
        Install           <- landing page
            Docker
            Linux container
    Reference             <- landing page
    Explanation           <- landing page`],
    ['h2', 'The problem of lists'],
    ['warning', 'Keep lists short', 'Lists longer than about seven items are hard to read unless they have a mechanical order. If a table of contents grows past that, break it into smaller, introduced groups — exactly what the sidebars in this site do.'],
    ['h2', 'Two-dimensional problems'],
    ['p', 'Sometimes the Diátaxis structure meets another structure — different user types (users, developers, contributors) or different deployment targets. Diátaxis is **an approach, not four boxes**: let the structure be as complex as it needs to be, as long as it never muddles the four forms and purposes. Document the product *as it is for the user*.'],
    ['links', 'Source', null, [
      ['diataxis.fr — Complex hierarchies', 'https://diataxis.fr/complex-hierarchies/'],
    ]],
  ],
},

/* ---------------- TUTORIALS ---------------- */
'tutorials': {
  group: 'Tutorials', title: 'Tutorials',
  lead: 'A tutorial is a lesson. It takes a newcomer by the hand through a series of steps to complete a project of some kind, and gives them the confidence to explore further.',
  blocks: [
    ['compass', 'Learning-oriented · the user is **acquiring** the craft · the documentation **informs action**.'],
    ['p', 'Tutorials are learning-oriented. Their job is to allow the newcomer to get started; they are a lesson, not a manual. The learner follows along and, by doing, gains familiarity. Below are guided paths through the tools documented on this site.'],
    ['links', 'Get started with Claude Code', 'The fastest way in — install, run your first session, and see the agentic loop in action.', [
      ['Quickstart', 'https://code.claude.com/docs/en/quickstart.md', 'Welcome to Claude Code — your first ten minutes.'],
      ['Web quickstart', 'https://code.claude.com/docs/en/web-quickstart.md', 'Run Claude Code in the cloud from a browser.'],
      ['Desktop quickstart', 'https://code.claude.com/docs/en/desktop-quickstart.md', 'Install the desktop app and start coding.'],
      ['Agent SDK quickstart', 'https://code.claude.com/docs/en/agent-sdk/quickstart.md', 'Build an agent in Python or TypeScript.'],
    ]],
    ['links', 'GitHub Copilot CLI for Beginners', 'A source-faithful mirror of the companion course — eight chapters from install to capstone.', [
      ['00 · Quick Start', 'https://awesome-copilot.github.com/learning-hub/cli-for-beginners/00-quick-start/'],
      ['01 · First Steps', 'https://awesome-copilot.github.com/learning-hub/cli-for-beginners/01-setup-and-first-steps/'],
      ['02 · Context & Conversations', 'https://awesome-copilot.github.com/learning-hub/cli-for-beginners/02-context-and-conversations/'],
      ['03 · Development Workflows', 'https://awesome-copilot.github.com/learning-hub/cli-for-beginners/03-development-workflows/'],
      ['04 · Specialized AI Assistants', 'https://awesome-copilot.github.com/learning-hub/cli-for-beginners/04-agents-and-custom-instructions/'],
      ['05 · Automate Repetitive Tasks', 'https://awesome-copilot.github.com/learning-hub/cli-for-beginners/05-skills/'],
      ['06 · Connect to APIs & DBs', 'https://awesome-copilot.github.com/learning-hub/cli-for-beginners/06-mcp-servers/'],
      ['07 · Putting It All Together', 'https://awesome-copilot.github.com/learning-hub/cli-for-beginners/07-putting-it-all-together/'],
    ]],
    ['links', 'Ecosystem', 'First lessons for the wider agentic ecosystem.', [
      ['Agent Skills — Quickstart', 'https://agentskills.io/skill-creation/quickstart.md', 'Create your first skill and see it work in VS Code.'],
      ['MCP Apps — Quickstart', 'https://apps.extensions.modelcontextprotocol.io/api/documents/Quickstart.html', 'Build your first interactive MCP App.'],
      ['GitHub — Hello World', 'https://docs.github.com/en/get-started/start-your-journey/hello-world', 'Learn the pull-request workflow.'],
    ]],
  ],
},

'tut-first-session': {
  group: 'Tutorials', title: 'Your first Claude Code session',
  lead: 'In this lesson you will install Claude Code, point it at a project, and make your first change — start to finish.',
  blocks: [
    ['compass', 'Follow every step in order. The goal is not to understand everything, but to *do it once* and gain confidence.'],
    ['h2', 'Step 1 — Install'],
    ['p', 'Install the CLI, then check it responds.'],
    ['code', 'bash', `curl -fsSL https://claude.ai/install.sh | bash
claude --version`],
    ['h2', 'Step 2 — Start a session in your project'],
    ['ol', [
      'Open a terminal in a git repository you know well.',
      'Run `claude` to start an interactive session.',
      'When prompted, sign in with your Anthropic account.',
    ]],
    ['h2', 'Step 3 — Ask for a small change'],
    ['p', 'Type a plain-language request. Claude reads the relevant files, proposes a diff, and asks before it writes.'],
    ['code', 'text', `> add a --version flag to the CLI and print the value from package.json`],
    ['tip', 'You are in control', 'Claude shows every edit as a diff and waits for your approval. Press Shift+Tab to cycle permission modes when you want it to move faster.'],
    ['h2', 'What you just learned'],
    ['p', 'You installed the tool, ran the agentic loop once, and reviewed a change. That is the whole rhythm of Claude Code — everything else is variations on it. Next, browse the **How-to guides** for specific goals.'],
    ['links', 'Keep going', null, [
      ['Common workflows', 'https://code.claude.com/docs/en/common-workflows.md'],
      ['How Claude Code works', 'https://code.claude.com/docs/en/how-claude-code-works.md'],
    ]],
  ],
},

/* ---------------- HOW-TO ---------------- */
'how-to': {
  group: 'How-to guides', title: 'How-to guides',
  lead: 'A how-to guide addresses a real-world goal or problem, by providing practical directions to help the user who is already working achieve it.',
  blocks: [
    ['compass', 'Task-oriented · the user is **applying** the craft · the documentation **informs action**.'],
    ['p', 'How-to guides are goal-oriented recipes. Unlike a tutorial, they assume some competence and can leave things out. They answer the question "how do I…?". Two guides are fully written on this site; the rest link to the canonical source.'],
    ['links', 'Install & set up', null, [
      ['Use Claude Code in VS Code (Linux)', '#/ht-vscode', 'Install the extension and configure it on Linux.'],
      ['Development containers', '#/ht-devcontainer', 'Run Claude Code in a consistent, isolated container.'],
      ['Advanced setup', 'https://code.claude.com/docs/en/setup.md'],
      ['JetBrains IDEs', 'https://code.claude.com/docs/en/jetbrains.md'],
    ]],
    ['links', 'Everyday workflows (Claude Code)', null, [
      ['Common workflows', 'https://code.claude.com/docs/en/common-workflows.md'],
      ['Automate actions with hooks', 'https://code.claude.com/docs/en/hooks-guide.md'],
      ['Connect to MCP servers', 'https://code.claude.com/docs/en/mcp-quickstart.md'],
      ['Run parallel sessions with worktrees', 'https://code.claude.com/docs/en/worktrees.md'],
      ['Claude Code GitHub Actions', 'https://code.claude.com/docs/en/github-actions.md'],
    ]],
    ['links', 'Customize GitHub Copilot', null, [
      ['Building custom agents', 'https://awesome-copilot.github.com/learning-hub/building-custom-agents/'],
      ['Creating effective skills', 'https://awesome-copilot.github.com/learning-hub/creating-effective-skills/'],
      ['Defining custom instructions', 'https://awesome-copilot.github.com/learning-hub/defining-custom-instructions/'],
      ['Installing & using plugins', 'https://awesome-copilot.github.com/learning-hub/installing-and-using-plugins/'],
    ]],
    ['links', 'Build MCP Apps', 'Let your coding agent scaffold an app with one of the four bundled skills.', [
      ['create-mcp-app', 'https://github.com/modelcontextprotocol/ext-apps/blob/main/plugins/mcp-apps/skills/create-mcp-app/SKILL.md'],
      ['migrate-oai-app', 'https://github.com/modelcontextprotocol/ext-apps/blob/main/plugins/mcp-apps/skills/migrate-oai-app/SKILL.md'],
      ['add-app-to-server', 'https://github.com/modelcontextprotocol/ext-apps/blob/main/plugins/mcp-apps/skills/add-app-to-server/SKILL.md'],
      ['convert-web-app', 'https://github.com/modelcontextprotocol/ext-apps/blob/main/plugins/mcp-apps/skills/convert-web-app/SKILL.md'],
    ]],
  ],
},

'ht-vscode': {
  group: 'How-to guides', title: 'Use Claude Code in VS Code',
  badge: 'Linux',
  lead: 'Install and configure the Claude Code extension for VS Code, and get AI coding assistance with inline diffs, @-mentions, plan review, and keyboard shortcuts.',
  blocks: [
    ['info', 'This guide covers Linux', 'The extension is identical across platforms; the steps below note the Linux-specific requirements. On macOS and Windows the install is the same but skip the dependency step.'],
    ['h2', 'Prerequisites'],
    ['ul', [
      'A 64-bit Linux distribution (Ubuntu 20.04+, Debian, Fedora, or equivalent).',
      '`glibc` 2.31 or newer — required by the native binary.',
      'VS Code 1.98 or newer (the desktop build, not a web-only host).',
    ]],
    ['h2', 'Step 1 — Install the extension'],
    ['ol', [
      'Open VS Code and go to the **Extensions** view (`Ctrl+Shift+X`).',
      'Search for **Claude Code** and install the official Anthropic extension.',
      'Reload the window if prompted.',
    ]],
    ['p', 'The extension bundles the Claude Code CLI. On first launch it downloads the native binary for your architecture into `~/.claude/`.'],
    ['h2', 'Step 2 — Sign in'],
    ['p', 'Open the Claude Code panel from the activity bar and click **Sign in**. On Linux the browser callback sometimes cannot reach `localhost`; when that happens, choose **Paste code** and copy the OAuth code from the browser back into VS Code.'],
    ['code', 'bash', `# Verify the CLI is on your PATH (optional, for terminal use)
claude --version
claude doctor   # diagnoses common Linux install problems`],
    ['warning', 'Missing shared libraries', 'If the binary fails to start with a `libz` or `libstdc++` error, install the base build tooling: `sudo apt install build-essential` on Debian/Ubuntu, or `sudo dnf groupinstall "Development Tools"` on Fedora.'],
    ['h2', 'Step 3 — Work in the editor'],
    ['ul', [
      '**Inline diffs** — proposed edits appear directly in the file; accept or reject per hunk.',
      '**@-mentions** — type `@` to attach a file, symbol, or selection as context.',
      '**Plan review** — for larger tasks Claude drafts a plan you approve before it edits.',
      '**Keyboard shortcuts** — `Ctrl+Esc` opens Claude Code; remap it under *File → Preferences → Keyboard Shortcuts*.',
    ]],
    ['tip', 'Match your terminal too', 'If you also use the CLI, set `Shift+Enter` for newlines and enable the terminal bell so you get notified when Claude finishes a long task.'],
    ['links', 'Related', null, [
      ['Use Claude Code in VS Code (full reference)', 'https://code.claude.com/docs/en/vs-code.md'],
      ['Configure your terminal', 'https://code.claude.com/docs/en/terminal-config.md'],
      ['Troubleshoot installation and login', 'https://code.claude.com/docs/en/troubleshoot-install.md'],
    ]],
  ],
},

'ht-devcontainer': {
  group: 'How-to guides', title: 'Development containers',
  lead: 'Run Claude Code inside a dev container for consistent, isolated environments across your team — and understand how dev containers work with your editor.',
  blocks: [
    ['compass', 'This page is part **how-to** (set one up) and part **explanation** (how it works). Diátaxis allows a page to lean across a boundary when that serves the reader — as long as each part is clearly what it is.'],
    ['h2', 'Why a dev container'],
    ['p', 'A development container is a Docker container configured as a full-featured development environment. It pins the OS, tools, and dependencies so every teammate — and every CI run — works in the same place. For agentic tools it adds a second benefit: **isolation**, so you can safely give Claude more autonomy.'],
    ['h2', 'How dev containers work with your editor'],
    ['ol', [
      'Your project contains a `.devcontainer/` folder with a `devcontainer.json` and usually a `Dockerfile`.',
      'The editor’s Dev Containers support (the VS Code **Dev Containers** extension, or any editor that implements the open `devcontainer` spec) reads that config.',
      'It builds or pulls the image, starts the container, and **reopens your workspace inside it** — your files are mounted, your extensions run in the container.',
      'Claude Code runs *inside* the container, so the commands it executes and the packages it installs never touch your host machine.',
    ]],
    ['info', 'The reference container', 'Anthropic ships a reference dev container with a Node.js base image, common CLI tools, persisted shell history, and a firewall init script that restricts network egress to an allowlist (npm, GitHub, and the Anthropic API).'],
    ['h2', 'Set one up'],
    ['ol', [
      'Copy the reference `.devcontainer/` into your repository root.',
      'Install the **Dev Containers** extension in VS Code.',
      'Run **Dev Containers: Reopen in Container** from the command palette.',
      'Once inside, run `claude` as usual.',
    ]],
    ['code', 'json', `// .devcontainer/devcontainer.json (excerpt)
{
  "name": "Claude Code Sandbox",
  "build": { "dockerfile": "Dockerfile" },
  "runArgs": ["--cap-add=NET_ADMIN", "--cap-add=NET_RAW"],
  "postCreateCommand": "sudo /usr/local/bin/init-firewall.sh"
}`],
    ['warning', 'Isolation is not a guarantee', 'The firewall reduces the blast radius of a mistake or a prompt-injection, but a container is not a security boundary against a determined attacker. Review the allowlist and keep secrets out of the image.'],
    ['tip', 'Safer autonomous runs', 'Because the container limits what a command can reach, this is the recommended place to use broader permission modes for long, hands-off tasks.'],
    ['links', 'Related', null, [
      ['Development containers (source)', 'https://code.claude.com/docs/en/devcontainer.md'],
      ['Choose a sandbox environment', 'https://code.claude.com/docs/en/sandbox-environments.md'],
      ['Configure the sandboxed Bash tool', 'https://code.claude.com/docs/en/sandboxing.md'],
      ['Security', 'https://code.claude.com/docs/en/security.md'],
    ]],
  ],
},

});
