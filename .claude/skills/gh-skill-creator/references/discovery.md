# Search Before Scaffold: the discovery ladder

Generation is the last resort. Before drafting any SKILL.md, script, or reference file, walk this ladder top to bottom and harvest everything reusable. The target for any new skill is five to ten merged upstream artifacts (existing skills, templates, references, scripts) with net-new prose limited to glue: selection logic, integration notes, and deltas the upstreams do not cover.

This reference is itself assembled from upstream sources. See SOURCES.md at the fork root for provenance.

## Rung 1: Installed skills

The cheapest source is what is already on disk. Scan every skill directory the runtime exposes and grep the frontmatter before assuming a gap exists.

```sh
# Common install locations across runtimes
for d in ~/.claude/skills .claude/skills /mnt/skills/public /mnt/skills/user /mnt/skills/examples /mnt/skills/plugins; do
  [ -d "$d" ] && grep -H "^description:" "$d"/*/SKILL.md 2>/dev/null
done
```

A partial match is still a match. An installed skill that covers 60 percent of the request is a base to extend, not a reason to start over. Copy it to a writable location, preserve its name and structure, and layer the delta.

## Rung 2: The skills.sh registry

The registry behind `npx skills` has a public search API and ranks by install count, which is a useful proxy for battle-testing.

```sh
# Interactive search
npx skills@latest find "<query>"

# Direct API (no install required)
curl -s "https://skills.sh/api/search?q=<query>&limit=10"

# List a repo's skills without installing, then harvest selectively
npx skills add <owner>/<repo> --list
npx skills add <owner>/<repo> --skill <name> --copy
```

`skills add` accepts GitHub URLs, direct tree paths to a single skill, GitLab URLs, arbitrary git remotes, and local paths. Use `--copy` when harvesting for a merge so the files are editable rather than symlinked.

## Rung 3: The aitmpl catalog

The claude-code-templates catalog covers components skills do not: agents, slash commands, hooks, MCP configs, and settings presets. The live catalog is a single JSON document.

```sh
curl -s "https://www.aitmpl.com/components.json" > /tmp/aitmpl-catalog.json
jq '[.skills[]?, .agents[]?, .commands[]? | select(.name | test("<term>"; "i"))] | .[0:10]' /tmp/aitmpl-catalog.json
```

Cache it for the session; refresh at most daily. Install single components with `npx claude-code-templates@latest --skill <name>` (or `--agent`, `--command`, `--mcp`, `--hook`). When bundling several, emit an upstream-native `workflow.yaml` under `.claude/workflows/` rather than inventing a parallel bundle format.

## Rung 4: Stack detection

When the request is "the right skills for this project" rather than a named capability, let the stack detector propose the set before authoring anything.

```sh
npx autoskills --dry-run    # preview only; never apply without review
```

## Rung 5: Curated indexes and known orgs

Search these before generic GitHub search; they are pre-filtered for quality.

| Source                              | What it holds                                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `anthropics/skills`                 | Canonical first-party skills (docx, pdf, pptx, xlsx, mcp-builder, skill-creator upstream)                                      |
| `anthropics/claude-code` (plugins/) | First-party plugins, including plugin-dev itself                                                                               |
| `vercel-labs/agent-skills`          | Registry-backed skill collection; `skills.sh.json` manifest documents the layout convention                                    |
| `ComposioHQ/awesome-claude-skills`  | Curated third-party index, organized by domain, with per-entry repo links                                                      |
| `obra/superpowers`                  | Large workflow-skill collection frequently indexed by the awesome list                                                         |
| User orgs                           | `danielbodnar`, `bitbuilder-io`, and the bodnar-skills marketplace; check these for prior in-house art before external sources |

Harvest from an index by following its links, not by pasting its prose: the entry descriptions are advertising copy, the linked SKILL.md is the artifact.

## Rung 6: GitHub search

The generic fallback. Repository and topic search work unauthenticated; code search requires a token, so prefer the former unless `gh` is authenticated.

```sh
# Repo search scoped by topic
curl -s "https://api.github.com/search/repositories?q=<term>+topic:claude-skill&per_page=10"
curl -s "https://api.github.com/search/repositories?q=<term>+claude+skill&per_page=10"

# With gh CLI (authenticated): find SKILL.md files directly
gh search code "filename:SKILL.md <term>" --limit 10
```

## Rung 7: Ground truth

Before adapting any harvested artifact, fetch the current format specification rather than trusting remembered structure. Schemas change.

```sh
curl -s https://agentskills.io/llms.txt                 # doc index
curl -s https://agentskills.io/specification.md         # SKILL.md format spec
curl -s https://agentskills.io/skill-creation/best-practices.md
```

## The merge protocol

Once candidates are in hand, merging follows four steps borrowed from decomposition practice:

1. **Harvest.** Clone or copy the candidate artifacts into a working directory. Shallow, sparse clones for large repos.
2. **Distill.** Separate portable patterns from instance-specific content. Names, paths, org-specific URLs, and hardcoded credentials never survive the merge; workflows, reference structures, scripts, and schemas do. Copying verbatim is acceptable only for artifacts whose license permits it and whose content is already generic.
3. **Adapt.** Integrate the distilled material into the target skill: unify voice, resolve conflicting instructions in favor of the more specific source, rewrite descriptions for the new trigger surface, and rewire relative reference paths.
4. **Attribute.** Record every merged source in a provenance block (below). Respect upstream licenses; carry LICENSE and notice files forward when required.

## Provenance block

Every skill built or extended through this workflow records its inputs in a `SOURCES.md` at the skill root (or a `## Provenance` section in SKILL.md for small skills):

```markdown
## Provenance

| Source                          | Ref      | Taken                        | Changed               |
| ------------------------------- | -------- | ---------------------------- | --------------------- |
| anthropics/skills/skill-creator | <commit> | eval loop, packaging scripts | added discovery phase |
| vercel-labs/skills              | <commit> | search API contract          | none (referenced)     |
```

## Exit criteria for the discovery phase

Proceed to drafting only when one of these holds:

- Five or more upstream artifacts are harvested and staged for merge, or
- The ladder has been walked end to end and returned fewer than five relevant results, in which case state which rungs were searched, what was found, and why generation is filling the remainder. Silent from-scratch generation is a workflow violation.
