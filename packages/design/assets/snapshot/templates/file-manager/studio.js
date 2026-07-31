// templates/file-manager/studio.js
// Skill Studio engine: GitHub browsing (live api.github.com with offline
// catalog fallback) + a Claude-powered agent (plan / search / customize).
// Exposes window.Studio. Depends on app-data.js.
(() => {
  const ORGS = window.STUDIO_ORGS;
  const CATALOG = window.STUDIO_CATALOG;
  const approved = new Set(ORGS.map((o) => o.login));

  // -------------------------------------------------- GitHub (best-effort)
  async function ghJSON(url) {
    const r = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
    if (!r.ok) throw new Error('gh ' + r.status);
    return r.json();
  }

  // List repos for a pre-approved org. Live first, catalog fallback.
  async function listOrgRepos(org, live) {
    if (!approved.has(org)) throw new Error('Org not pre-approved: ' + org);
    if (live) {
      try {
        const repos = await ghJSON(`https://api.github.com/orgs/${org}/repos?per_page=30&sort=updated`);
        return repos.map((r) => ({ name: r.name, description: r.description || '', stars: r.stargazers_count, updated: (r.updated_at || '').slice(0, 10), live: true }));
      } catch (e) { /* fall through */ }
    }
    // fallback: distinct repos present in catalog for this org
    const seen = {};
    CATALOG.filter((c) => c.org === org).forEach((c) => {
      seen[c.repo] = seen[c.repo] || { name: c.repo, description: '', stars: 0, updated: '', live: false, count: 0 };
      seen[c.repo].stars = Math.max(seen[c.repo].stars, c.stars);
      seen[c.repo].updated = c.updated > seen[c.repo].updated ? c.updated : seen[c.repo].updated;
      seen[c.repo].count++;
    });
    return Object.values(seen);
  }

  // Items (skills/templates/examples/plugins) inside an org/repo.
  function repoItems(org, repo) {
    return CATALOG.filter((c) => c.org === org && c.repo === repo);
  }

  // Fetch a single file's content — live raw first, catalog fallback.
  async function getFile(item, filePath, live) {
    if (live) {
      try {
        const r = await fetch(`https://raw.githubusercontent.com/${item.org}/${item.repo}/HEAD/${item.path}/${filePath}`);
        if (r.ok) return await r.text();
      } catch (e) { /* fall through */ }
    }
    return (item.files && item.files[filePath]) || '';
  }

  // -------------------------------------------------- Claude agent
  const MODEL = undefined; // default (haiku) — reliable within rate limits
  const hasClaude = () => typeof window !== 'undefined' && window.claude && typeof window.claude.complete === 'function';

  function catalogSummary() {
    return CATALOG.map((c) => `- id:${c.id} | ${c.kind} | ${c.name} (${c.org}/${c.repo}) — ${c.description} [tags: ${c.tags.join(', ')}]`).join('\n');
  }

  function extractJSON(text) {
    const m = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try { return JSON.parse(m[1] || m[0]); } catch (e) { return null; }
  }

  // PLAN: given a brief, return { planMd, rec:[ids], skillName, skillSlug, query }
  async function planSkill(brief) {
    const system = `You are the planning agent inside "Skill Studio", a curator that builds Claude Agent Skills and plugins by COPYING and CUSTOMIZING proven examples from pre-approved GitHub orgs — never from scratch.\n\nApproved orgs: ${ORGS.map((o) => o.login).join(', ')}.\n\nGiven the user's brief and the CATALOG of importable items, respond with:\n1. A concise plan in Markdown (## Plan) — 3-6 steps, name the base(s) you'd copy and what you'd change for the Patterson brand.\n2. A fenced \`\`\`json block: {"skillName","skillSlug","query","rec":["<catalog id>", ...]}. Only put REAL catalog ids in rec (2-4 best matches). Keep skillSlug kebab-case.`;
    const user = `BRIEF: ${brief}\n\nCATALOG:\n${catalogSummary()}`;
    if (!hasClaude()) {
      // offline heuristic fallback
      const words = brief.toLowerCase();
      const rec = CATALOG.filter((c) => c.tags.some((t) => words.includes(t)) || words.includes(c.name)).slice(0, 3).map((c) => c.id);
      return {
        planMd: `## Plan\n\n1. Search the pre-approved orgs for a matching base.\n2. Copy the closest skill/template into \`my-skills/\`.\n3. Rewrite the SKILL.md description & workflow for Patterson.\n4. Swap in Patterson tokens/voice; add a reference file.\n\n*(Offline heuristic — connect to Claude for a tailored plan.)*`,
        rec: rec.length ? rec : [CATALOG[0].id], skillName: 'New Skill', skillSlug: 'new-skill', query: brief,
      };
    }
    const text = await window.claude.complete({ model: MODEL, system, max_tokens: 1400, messages: [{ role: 'user', content: user }] });
    const json = extractJSON(text) || {};
    const planMd = text.replace(/```json[\s\S]*?```/i, '').trim();
    const rec = Array.isArray(json.rec) ? json.rec.filter((id) => CATALOG.some((c) => c.id === id)) : [];
    return { planMd, rec, skillName: json.skillName || 'New Skill', skillSlug: json.skillSlug || 'new-skill', query: json.query || brief };
  }

  // CUSTOMIZE: adapt selected catalog items into a Patterson skill.
  // Returns { files: {relPath: content}, notes }
  async function customize(items, brief, skillSlug, live, selMap) {
    // gather source files — if selMap {itemId:[rels]} is given, only those files
    const sources = [];
    for (const it of items) {
      let names = Object.keys(it.files || {});
      if (selMap && selMap[it.id] && selMap[it.id].length) names = names.filter((n) => selMap[it.id].includes(n));
      for (const fp of names) sources.push({ item: it, path: fp, content: await getFile(it, fp, live) });
    }
    if (!hasClaude() || sources.length === 0) {
      const files = {};
      sources.forEach((s) => { files[`my-skills/${skillSlug}/${s.path}`] = s.content; });
      if (!files[`my-skills/${skillSlug}/SKILL.md`]) files[`my-skills/${skillSlug}/SKILL.md`] = `---\nname: ${skillSlug}\ndescription: ${brief}\n---\n\n# ${skillSlug}\n\nCustomized for Patterson. (Connect Claude to auto-adapt.)`;
      return { files, notes: 'Copied verbatim (offline).' };
    }
    const system = `You are the customizer inside Skill Studio. You are given source files copied from pre-approved GitHub examples and a brief. Rewrite them into a single cohesive Agent Skill for the PATTERSON brand (navy/sky, Figtree, voice: trusted expertise, unrivaled support). Keep working code; adapt names, descriptions, defaults and copy. Respond ONLY with a fenced \`\`\`json block: {"files": {"<relative path>": "<full file content>"}, "notes": "<1-2 lines on what you changed>"}. Paths are relative to the skill folder (e.g. "SKILL.md", "scripts/build.py").`;
    const srcText = sources.map((s) => `### ${s.item.id} :: ${s.path}\n\`\`\`\n${s.content}\n\`\`\``).join('\n\n');
    const user = `BRIEF: ${brief}\nSKILL SLUG: ${skillSlug}\n\nSOURCE FILES:\n${srcText}`;
    const text = await window.claude.complete({ model: MODEL, system, max_tokens: 4000, messages: [{ role: 'user', content: user }] });
    const json = extractJSON(text) || {};
    const files = {};
    if (json.files && typeof json.files === 'object') {
      Object.entries(json.files).forEach(([p, c]) => { files[`my-skills/${skillSlug}/${p.replace(/^\/+/, '')}`] = String(c); });
    }
    if (Object.keys(files).length === 0) sources.forEach((s) => { files[`my-skills/${skillSlug}/${s.path}`] = s.content; });
    return { files, notes: json.notes || 'Customized for Patterson.' };
  }

  // General assistant chat with workspace context.
  async function chat(history, ctx) {
    if (!hasClaude()) {
      return ctx.file
        ? `I can see \`${ctx.file}\`. Connect me to Claude and I'll plan, search, and customize skills for you. Meanwhile try the **Plan a skill** action.`
        : `Connect me to Claude to plan and customize skills. Open a file or describe the skill you want to build.`;
    }
    const system = `You are the Skill Studio assistant for the Patterson design system. You help authors PLAN, CURATE and CUSTOMIZE Claude skills & plugins by copying proven examples from pre-approved orgs (${ORGS.map((o) => o.login).join(', ')}) rather than writing from scratch. Be concise. When the user wants to build something, suggest they use "Plan a skill" so you can search the marketplace. Current open file: ${ctx.file || 'none'}.${ctx.fileBody ? '\n\nFILE CONTENT:\n' + ctx.fileBody.slice(0, 4000) : ''}`;
    const messages = history.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text }));
    return await window.claude.complete({ model: MODEL, system, max_tokens: 1200, messages });
  }

  window.Studio = { ORGS, CATALOG, approved, listOrgRepos, repoItems, getFile, planSkill, customize, chat, hasClaude, byId: (id) => CATALOG.find((c) => c.id === id) };
})();
