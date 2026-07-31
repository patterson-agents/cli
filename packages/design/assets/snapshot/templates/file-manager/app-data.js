// templates/file-manager/app-data.js
// Skill Studio — workspace seed, pre-approved orgs, GitHub catalog (fallback
// index), curated references, and a tiny Markdown renderer. Plain browser JS.
(() => {
  // ======================================================================
  // WORKSPACE — the skills & plugins you are building (left pane / Workspace)
  // ======================================================================
  window.PAT_TREE = [
    {
      type: 'dir', name: 'my-skills', open: true, children: [
        {
          type: 'dir', name: 'brand-deck-builder', open: true, children: [
            { type: 'file', name: 'SKILL.md', content: `---\nname: brand-deck-builder\ndescription: Build on-brand Patterson slide decks from an outline. Use when the user asks for a presentation, pitch, or executive readout in the Patterson visual system.\n---\n\n# Brand Deck Builder\n\nGenerate slide decks that follow the **Patterson Companies Design System** — navy structure, sky accents, Figtree type.\n\n## When to use\n\n- The user asks for a deck, presentation, or pitch\n- Output should carry Patterson brand voice and tokens\n\n## Workflow\n\n1. Gather the outline and audience.\n2. Pick a layout per slide (cover, section, bullets, stat, quote).\n3. Compose with the design-system deck template.\n4. Export to PPTX or PDF.\n\n> Draft this from the \`anthropics/skills\` pptx example — see the marketplace.` },
            {
              type: 'dir', name: 'reference', open: false, children: [
                { type: 'file', name: 'layouts.md', content: `# Deck Layouts\n\n- **Cover** — title, eyebrow, brand mark\n- **Section** — full-navy divider\n- **Bullets** — flush-left, max 5\n- **Stat** — one big number\n- **Quote** — serif pull quote` },
              ]
            },
          ]
        },
        { type: 'file', name: 'README.md', content: `# My Skills\n\nSkills and plugins in progress for the **Patterson** agent.\n\n## How this studio works\n\n1. **Plan** — tell the assistant what skill you need.\n2. **Search** — it searches pre-approved GitHub orgs for templates & examples.\n3. **Select** — check the boxes on the results you want in the Marketplace pane.\n4. **Customize** — the assistant copies them here and adapts them to Patterson.\n\n---\n\nInstead of writing skills from scratch, we *curate and customize* proven ones.` },
      ]
    },
    {
      type: 'dir', name: 'plugins', open: false, children: [
        {
          type: 'dir', name: 'patterson-connector', open: false, children: [
            { type: 'file', name: 'plugin.json', content: `{\n  "name": "patterson-connector",\n  "version": "0.1.0",\n  "description": "Connects the agent to the Patterson storefront + newsroom APIs.",\n  "entry": "server.py",\n  "capabilities": ["search", "fetch"]\n}` },
            { type: 'file', name: 'README.md', content: `# Patterson Connector (plugin)\n\nAn MCP-style plugin scaffold. Customize from \`modelcontextprotocol/servers\` in the marketplace.` },
          ]
        },
      ]
    },
  ];

  // ======================================================================
  // PRE-APPROVED ORGS — only these GitHub orgs may be browsed / imported
  // ======================================================================
  window.STUDIO_ORGS = [
    { login: 'anthropics', label: 'Anthropic', note: 'Official skills, plugins, cookbook & knowledge-work bundles', trusted: true },
    { login: 'github', label: 'GitHub', note: 'Awesome Copilot & agentic workflows (gh-aw)', trusted: true },
    { login: 'githubnext', label: 'GitHub Next', note: 'Experimental agentic workflows', trusted: true },
    { login: 'copilotkit', label: 'CopilotKit', note: 'In-app AI copilot toolkit', trusted: true },
    { login: 'modelcontextprotocol', label: 'Model Context Protocol', note: 'Reference MCP servers & plugin scaffolds', trusted: true },
    { login: 'patterson-tools', label: 'Patterson Tools', note: 'Internal brand & storefront skills', trusted: true },
  ];

  // ======================================================================
  // CATALOG — the searchable index of importable items across the approved
  // orgs. Used as the offline fallback and as the agent's candidate set.
  // kind: 'skill' | 'template' | 'example' | 'plugin'
  // ======================================================================
  window.STUDIO_CATALOG = [
    {
      id: 'anthropics/skills/pptx', org: 'anthropics', repo: 'skills', path: 'document-skills/pptx',
      kind: 'skill', name: 'pptx', stars: 1840, updated: '2026-05-30', lang: 'Python',
      description: 'Create & edit PowerPoint decks — native shapes, text, images. Ideal base for a branded deck builder.',
      tags: ['deck', 'presentation', 'office', 'export'],
      files: {
        'SKILL.md': `---\nname: pptx\ndescription: Create, edit and analyze PowerPoint (.pptx) presentations.\n---\n\n# PPTX\n\nBuild decks programmatically with python-pptx. Supports native text boxes, shapes, images, and speaker notes.\n\n## Workflow\n1. Parse the outline.\n2. Map each section to a slide layout.\n3. Emit the .pptx.`,
        'scripts/build_deck.py': `"""Minimal python-pptx deck builder."""\nfrom pptx import Presentation\n\ndef build(outline):\n    prs = Presentation()\n    for section in outline:\n        slide = prs.slides.add_slide(prs.slide_layouts[1])\n        slide.shapes.title.text = section["title"]\n    return prs`,
      },
    },
    {
      id: 'anthropics/skills/pdf', org: 'anthropics', repo: 'skills', path: 'document-skills/pdf',
      kind: 'skill', name: 'pdf', stars: 1620, updated: '2026-06-02', lang: 'Python',
      description: 'Extract text, tables and form fields from PDFs; fill and render new PDFs.',
      tags: ['pdf', 'extract', 'document', 'forms'],
      files: {
        'SKILL.md': `---\nname: pdf\ndescription: Read, extract and fill PDF documents.\n---\n\n# PDF\n\nExtract text and tables with pdfplumber; fill AcroForm fields; render to PDF.`,
        'scripts/extract.py': `import pdfplumber\n\ndef extract(path):\n    with pdfplumber.open(path) as pdf:\n        return "\\n".join(p.extract_text() or "" for p in pdf.pages)`,
      },
    },
    {
      id: 'anthropics/skills/artifacts-builder', org: 'anthropics', repo: 'skills', path: 'artifacts-builder',
      kind: 'skill', name: 'artifacts-builder', stars: 990, updated: '2026-06-18', lang: 'TypeScript',
      description: 'Scaffold self-contained HTML artifacts with a design system. Great starting point for brand-aware generators.',
      tags: ['html', 'frontend', 'design-system', 'artifact'],
      files: {
        'SKILL.md': `---\nname: artifacts-builder\ndescription: Build single-file HTML artifacts wired to a design system.\n---\n\n# Artifacts Builder\n\nGenerate one-file HTML that loads a token stylesheet and composes components.`,
      },
    },
    {
      id: 'anthropics/skills/skill-creator', org: 'anthropics', repo: 'skills', path: 'meta/skill-creator',
      kind: 'skill', name: 'skill-creator', stars: 2100, updated: '2026-06-25', lang: 'Markdown',
      description: 'Meta-skill that scaffolds a new SKILL.md, reference folder and scripts from a brief.',
      tags: ['meta', 'authoring', 'scaffold'],
      files: {
        'SKILL.md': `---\nname: skill-creator\ndescription: Scaffold a new skill (SKILL.md + reference + scripts) from a short brief.\n---\n\n# Skill Creator\n\nAsk for name, trigger conditions and workflow, then emit the folder.`,
      },
    },
    {
      id: 'anthropics/cookbook/rag-eval', org: 'anthropics', repo: 'cookbook', path: 'skills/retrieval/eval',
      kind: 'example', name: 'rag-eval', stars: 640, updated: '2026-04-11', lang: 'Python',
      description: 'A worked example: evaluate a retrieval skill against a golden set.',
      tags: ['rag', 'eval', 'retrieval', 'example'],
      files: { 'README.md': `# RAG Eval Example\n\nScore retrieval precision/recall against a labeled set.` },
    },
    {
      id: 'modelcontextprotocol/servers/filesystem', org: 'modelcontextprotocol', repo: 'servers', path: 'src/filesystem',
      kind: 'plugin', name: 'filesystem-server', stars: 3200, updated: '2026-06-20', lang: 'TypeScript',
      description: 'Reference MCP server exposing filesystem read/write tools. Base scaffold for a connector plugin.',
      tags: ['mcp', 'plugin', 'server', 'filesystem'],
      files: {
        'plugin.json': `{\n  "name": "filesystem-server",\n  "version": "1.0.0",\n  "capabilities": ["read_file", "write_file", "list_dir"]\n}`,
        'README.md': `# Filesystem MCP Server\n\nExposes sandboxed filesystem tools over MCP.`,
      },
    },
    {
      id: 'modelcontextprotocol/servers/fetch', org: 'modelcontextprotocol', repo: 'servers', path: 'src/fetch',
      kind: 'plugin', name: 'fetch-server', stars: 2750, updated: '2026-05-28', lang: 'Python',
      description: 'MCP server that fetches and extracts web pages. Adapt for the Patterson newsroom connector.',
      tags: ['mcp', 'plugin', 'web', 'fetch'],
      files: { 'plugin.json': `{\n  "name": "fetch-server",\n  "version": "1.0.0",\n  "capabilities": ["fetch"]\n}` },
    },

    /* ---- github/awesome-copilot ---- */
    {
      id: 'github/awesome-copilot/skills', org: 'github', repo: 'awesome-copilot', path: 'skills',
      kind: 'skill', name: 'awesome-copilot skills', stars: 8200, updated: '2026-07-10', lang: 'Markdown',
      description: 'Community-curated Copilot skills — prompts, chat modes and reusable instructions. A deep well of task patterns to adapt.',
      tags: ['copilot', 'skill', 'prompt', 'community'],
      files: {
        'README.md': `# Awesome Copilot — Skills\n\nCurated, ready-to-use skills for GitHub Copilot. Copy one and adapt its prompt & workflow to Patterson.`,
      },
    },
    {
      id: 'github/awesome-copilot/instructions', org: 'github', repo: 'awesome-copilot', path: 'instructions',
      kind: 'example', name: 'copilot instructions', stars: 8200, updated: '2026-07-10', lang: 'Markdown',
      description: 'Reusable .instructions.md files that steer Copilot per language & framework.',
      tags: ['copilot', 'instructions', 'guidance'],
      files: { 'README.md': `# Instructions\n\nDrop-in custom instructions for Copilot by language & framework.` },
    },
    {
      id: 'github/awesome-copilot/plugins', org: 'github', repo: 'awesome-copilot', path: 'plugins',
      kind: 'plugin', name: 'copilot plugins', stars: 8200, updated: '2026-07-10', lang: 'Markdown',
      description: 'Packaged Copilot plugins bundling commands, hooks and instructions.',
      tags: ['copilot', 'plugin', 'commands', 'hooks'],
      files: { 'README.md': `# Plugins\n\nPackaged Copilot plugins — commands, hooks and instructions in one folder.` },
    },

    /* ---- github/gh-aw (GitHub Agentic Workflows) ---- */
    {
      id: 'github/gh-aw', org: 'github', repo: 'gh-aw', path: '',
      kind: 'skill', name: 'gh-aw', stars: 1500, updated: '2026-07-12', lang: 'Go',
      description: 'GitHub Agentic Workflows — author, compile and run agentic workflows as GitHub Actions. Ships a top-level SKILL.md.',
      tags: ['agentic', 'workflow', 'github-actions', 'automation'],
      files: {
        'SKILL.md': `---\nname: gh-aw\ndescription: Create and run GitHub Agentic Workflows.\n---\n\n# GitHub Agentic Workflows\n\nCompile natural-language workflows into GitHub Actions lock files.`,
        'create.md': `# Creating a workflow\n\nDescribe the automation in prose; gh-aw scaffolds the compiled .lock.yml.`,
      },
    },

    /* ---- anthropics/knowledge-work-plugins ---- */
    {
      id: 'anthropics/knowledge-work-plugins/engineering', org: 'anthropics', repo: 'knowledge-work-plugins', path: 'engineering',
      kind: 'plugin', name: 'engineering', stars: 940, updated: '2026-07-05', lang: 'Markdown',
      description: 'Knowledge-work plugin bundle for engineering teams — skills plus MCP connectors.',
      tags: ['plugin', 'engineering', 'mcp', 'knowledge-work'],
      files: {
        'README.md': `# Engineering plugin\n\nSkills and connectors for engineering knowledge work.`,
        '.mcp.json': `{\n  "mcpServers": {}\n}`,
      },
    },
    {
      id: 'anthropics/knowledge-work-plugins/marketing', org: 'anthropics', repo: 'knowledge-work-plugins', path: 'marketing',
      kind: 'plugin', name: 'marketing', stars: 940, updated: '2026-07-05', lang: 'Markdown',
      description: 'Knowledge-work plugin bundle for marketing — content, campaign and brand-voice skills.',
      tags: ['plugin', 'marketing', 'content', 'knowledge-work'],
      files: { 'README.md': `# Marketing plugin\n\nContent, campaign and brand-voice skills for marketing teams.` },
    },
    {
      id: 'anthropics/knowledge-work-plugins/design', org: 'anthropics', repo: 'knowledge-work-plugins', path: 'design',
      kind: 'plugin', name: 'design', stars: 940, updated: '2026-07-05', lang: 'Markdown',
      description: 'Knowledge-work plugin bundle for design teams — asset and design-system skills.',
      tags: ['plugin', 'design', 'design-system', 'knowledge-work'],
      files: { 'README.md': `# Design plugin\n\nAsset and design-system skills for design teams.` },
    },
    {
      id: 'anthropics/knowledge-work-plugins/marketplace', org: 'anthropics', repo: 'knowledge-work-plugins', path: '.claude-plugin',
      kind: 'template', name: 'marketplace.json', stars: 940, updated: '2026-07-05', lang: 'JSON',
      description: 'The marketplace manifest listing every knowledge-work plugin — a template for your own catalog.',
      tags: ['marketplace', 'manifest', 'template'],
      files: { 'marketplace.json': `{\n  "name": "knowledge-work-plugins",\n  "plugins": ["engineering", "marketing", "design", "data", "finance", "legal"]\n}` },
    },

    /* ---- anthropics/claude-plugins-official ---- */
    {
      id: 'anthropics/claude-plugins-official/skill-creator', org: 'anthropics', repo: 'claude-plugins-official', path: 'plugins/skill-creator',
      kind: 'skill', name: 'skill-creator', stars: 1700, updated: '2026-07-08', lang: 'Markdown',
      description: 'Official skill-creator plugin — scaffolds a SKILL.md, references and scripts from a short brief.',
      tags: ['skill', 'authoring', 'scaffold', 'official'],
      files: { 'SKILL.md': `---\nname: skill-creator\ndescription: Scaffold a new skill from a brief.\n---\n\n# skill-creator\n\nAsk for name, trigger conditions and workflow; emit the folder.` },
    },
    {
      id: 'anthropics/claude-plugins-official/plugin-dev', org: 'anthropics', repo: 'claude-plugins-official', path: 'plugins/plugin-dev',
      kind: 'plugin', name: 'plugin-dev', stars: 1300, updated: '2026-07-08', lang: 'Markdown',
      description: 'Official plugin for building Claude plugins — scaffolds commands, hooks and MCP servers.',
      tags: ['plugin', 'authoring', 'mcp', 'official'],
      files: { 'SKILL.md': `---\nname: plugin-dev\ndescription: Build and package Claude plugins.\n---\n\n# plugin-dev\n\nScaffold plugin.json, commands and hooks; wire optional MCP servers.` },
    },
    {
      id: 'anthropics/claude-plugins-official/mcp-server-dev', org: 'anthropics', repo: 'claude-plugins-official', path: 'plugins/mcp-server-dev',
      kind: 'plugin', name: 'mcp-server-dev', stars: 1100, updated: '2026-07-08', lang: 'TypeScript',
      description: 'Official plugin for building MCP servers that expose tools to the agent.',
      tags: ['plugin', 'mcp', 'server', 'official'],
      files: { 'SKILL.md': `---\nname: mcp-server-dev\ndescription: Build MCP servers exposing tools.\n---\n\n# mcp-server-dev\n\nScaffold a typed MCP server and register its tools.` },
    },
    {
      id: 'anthropics/claude-plugins-official/pr-review-toolkit', org: 'anthropics', repo: 'claude-plugins-official', path: 'plugins/pr-review-toolkit',
      kind: 'plugin', name: 'pr-review-toolkit', stars: 980, updated: '2026-07-08', lang: 'Markdown',
      description: 'Official PR review plugin — commands and hooks for structured code review.',
      tags: ['plugin', 'pr', 'review', 'official'],
      files: { 'SKILL.md': `---\nname: pr-review-toolkit\ndescription: Structured PR review commands & hooks.\n---\n\n# pr-review-toolkit\n\nDrive consistent, checklist-based pull-request reviews.` },
    },

    /* ---- githubnext/agentics & githubnext/ado-aw ---- */
    {
      id: 'githubnext/agentics/workflows', org: 'githubnext', repo: 'agentics', path: 'workflows',
      kind: 'template', name: 'agentic workflows', stars: 2100, updated: '2026-07-06', lang: 'Markdown',
      description: 'Reusable agentic workflows (daily plan, PR triage, research) that run as GitHub Actions.',
      tags: ['agentic', 'workflow', 'automation', 'template'],
      files: { 'README.md': `# Agentics workflows\n\nReusable agentic workflows you can drop into a repo and run as Actions.` },
    },
    {
      id: 'githubnext/ado-aw/agency', org: 'githubnext', repo: 'ado-aw', path: 'agency',
      kind: 'example', name: 'ado-aw agency', stars: 340, updated: '2026-07-04', lang: 'Rust',
      description: 'Azure DevOps agentic workflows — agent "agency" primitives and worked examples.',
      tags: ['agentic', 'azure-devops', 'workflow', 'rust'],
      files: { 'README.md': `# ado-aw\n\nAgentic workflows for Azure DevOps — agency primitives and examples.` },
    },

    /* ---- copilotkit/copilotkit ---- */
    {
      id: 'copilotkit/copilotkit/skills', org: 'copilotkit', repo: 'copilotkit', path: 'skills',
      kind: 'skill', name: 'copilotkit skills', stars: 15000, updated: '2026-07-11', lang: 'TypeScript',
      description: 'CopilotKit skills — build in-app AI copilots with React UI plus an agent runtime.',
      tags: ['copilot', 'react', 'ui', 'agent'],
      files: { 'README.md': `# CopilotKit Skills\n\nBuild in-app copilots: React components wired to an agent runtime.` },
    },
    {
      id: 'copilotkit/copilotkit/sdk-python', org: 'copilotkit', repo: 'copilotkit', path: 'sdk-python',
      kind: 'plugin', name: 'CopilotKit Python SDK', stars: 15000, updated: '2026-07-11', lang: 'Python',
      description: 'Python SDK for wiring CopilotKit to a backend agent — actions, state and streaming.',
      tags: ['copilot', 'python', 'sdk', 'agent'],
      files: { 'README.md': `# CopilotKit Python SDK\n\nExpose backend actions & state to an in-app copilot.` },
    },
    {
      id: 'patterson-tools/brand-skills/deck-template', org: 'patterson-tools', repo: 'brand-skills', path: 'templates/deck',
      kind: 'template', name: 'patterson-deck-template', stars: 42, updated: '2026-07-01', lang: 'HTML',
      description: 'Internal: the on-brand Patterson deck template (navy dividers, sky accents). Closest match for brand-deck-builder.',
      tags: ['deck', 'brand', 'template', 'patterson'],
      files: {
        'SKILL.md': `---\nname: patterson-deck\ndescription: The Patterson-branded deck template — navy/sky, Figtree, section dividers.\n---\n\n# Patterson Deck Template\n\nUse the design-system deck starting point; keep 1-2 background colors max.`,
      },
    },
    {
      id: 'patterson-tools/brand-skills/storefront-connector', org: 'patterson-tools', repo: 'brand-skills', path: 'plugins/storefront',
      kind: 'plugin', name: 'storefront-connector', stars: 28, updated: '2026-06-15', lang: 'Python',
      description: 'Internal: connects the agent to the Patterson dental & vet storefront search API.',
      tags: ['plugin', 'storefront', 'patterson', 'search'],
      files: { 'plugin.json': `{\n  "name": "storefront-connector",\n  "capabilities": ["product_search", "order_status"]\n}` },
    },
  ];

  // ======================================================================
  // REFERENCE LIBRARY — curated links the "reference curator" tracks
  // ======================================================================
  window.STUDIO_REFS = [
    { title: 'Agent Skills — authoring guide', url: 'https://docs.anthropic.com/skills', kind: 'Docs', note: 'SKILL.md format & triggers' },
    { title: 'Model Context Protocol spec', url: 'https://modelcontextprotocol.io', kind: 'Spec', note: 'Plugin / server contract' },
    { title: 'Patterson Brand Guide 2025', url: '#', kind: 'Brand', note: 'Voice, color, type tokens' },
    { title: 'python-pptx documentation', url: 'https://python-pptx.readthedocs.io', kind: 'Library', note: 'Deck generation' },
  ];

  // ======================================================================
  // Minimal, safe Markdown → HTML (headings, lists, tables, quote, code, hr,
  // front-matter block)
  // ======================================================================
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function inline(s) {
    s = esc(s);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return s;
  }
  window.PAT_MD = function renderMarkdown(md) {
    const lines = (md || '').split('\n');
    let html = '', i = 0;
    // front matter
    if (lines[0] === '---') {
      let fm = ''; i = 1;
      while (i < lines.length && lines[i] !== '---') { fm += lines[i] + '\n'; i++; }
      i++;
      html += `<div class="md-fm"><span class="md-fm-tag">front&nbsp;matter</span><pre>${esc(fm.trim())}</pre></div>`;
    }
    while (i < lines.length) {
      let line = lines[i];
      if (/^```/.test(line)) {
        let code = ''; i++;
        while (i < lines.length && !/^```/.test(lines[i])) { code += lines[i] + '\n'; i++; }
        i++; html += `<pre class="md-code">${esc(code.replace(/\n$/, ''))}</pre>`; continue;
      }
      if (/^\|/.test(line) && /^\|/.test(lines[i + 1] || '') && /-/.test(lines[i + 1])) {
        const head = line.split('|').slice(1, -1).map((c) => c.trim());
        i += 2; const rows = [];
        while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i].split('|').slice(1, -1).map((c) => c.trim())); i++; }
        html += '<table class="md-table"><thead><tr>' + head.map((h) => `<th>${inline(h)}</th>`).join('') +
          '</tr></thead><tbody>' + rows.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table>';
        continue;
      }
      if (/^### /.test(line)) { html += `<h3>${inline(line.slice(4))}</h3>`; i++; continue; }
      if (/^## /.test(line)) { html += `<h2>${inline(line.slice(3))}</h2>`; i++; continue; }
      if (/^# /.test(line)) { html += `<h1>${inline(line.slice(2))}</h1>`; i++; continue; }
      if (/^> /.test(line)) { html += `<blockquote>${inline(line.slice(2))}</blockquote>`; i++; continue; }
      if (/^(---|\*\*\*)\s*$/.test(line)) { html += '<hr>'; i++; continue; }
      if (/^\s*[-*] /.test(line)) {
        html += '<ul>';
        while (i < lines.length && /^\s*[-*] /.test(lines[i])) {
          let item = lines[i].replace(/^\s*[-*] /, '');
          item = item.replace(/^\[( |x)\] /, (m, c) => c === 'x' ? '<span class="md-check done">✓</span> ' : '<span class="md-check">○</span> ');
          html += `<li>${inline(item)}</li>`; i++;
        }
        html += '</ul>'; continue;
      }
      if (/^\s*\d+\. /.test(line)) {
        html += '<ol>';
        while (i < lines.length && /^\s*\d+\. /.test(lines[i])) { html += `<li>${inline(lines[i].replace(/^\s*\d+\. /, ''))}</li>`; i++; }
        html += '</ol>'; continue;
      }
      if (/^\s*$/.test(line)) { i++; continue; }
      let para = line;
      while (i + 1 < lines.length && !/^\s*$/.test(lines[i + 1]) && !/^(#{1,3} |> |[-*] |\d+\. |\||```)/.test(lines[i + 1])) { para += ' ' + lines[i + 1]; i++; }
      html += `<p>${inline(para)}</p>`; i++;
    }
    return html;
  };
})();
