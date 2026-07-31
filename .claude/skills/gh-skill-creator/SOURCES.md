# Provenance

This fork (gh-skill-creator, renamed from skill-creator) was assembled by merging the following sources. Net-new content is limited to the Search Before Scaffold section in SKILL.md and the glue prose in references/discovery.md.

| Source                                                         | Ref     | Taken                                                                                                    | Changed                                                                |
| -------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| anthropics/skills (skill-creator upstream, via installed copy) | 9d2f1ae | Entire skill: workflow, scripts, eval-viewer, agents, references                                         | Added discovery phase, reuse-first description, discovery.md reference |
| anthropics/claude-code (plugin-dev)                            | d4d8fbb | Phase-gated command structure informing the mandatory-phase pattern                                      | Adapted as Search Before Scaffold gating                               |
| vercel-labs/skills (skills.sh CLI)                             | 3176ae4 | Search API contract (/api/search), add/find/use command surface, source formats                          | Distilled into Rung 2                                                  |
| davila7/claude-code-templates (aitmpl)                         | e9313e6 | components.json catalog, per-component install flags                                                     | Distilled into Rung 3                                                  |
| vercel-labs/agent-skills                                       | f8a72b9 | Registry repo layout, skills.sh.json manifest convention                                                 | Referenced in Rung 5                                                   |
| ComposioHQ/awesome-claude-skills                               | 92568c1 | Curated index structure; harvest-via-links guidance                                                      | Referenced in Rung 5                                                   |
| danielbodnar skill-installer (installed)                       | local   | Tool-selection table (skills vs autoskills vs claude-code-templates), dry-run-first flags, install paths | Distilled into Rungs 2-4                                               |
| danielbodnar aitmpl-compose (installed)                        | local   | Catalog URL and 24h cache rule, workflow.yaml over parallel formats                                      | Distilled into Rung 3                                                  |
| danielbodnar agent-skills-decomposer (installed)               | local   | Harvest/distill/leakage discipline, ground-and-bind live-spec fetching                                   | Distilled into merge protocol and Rung 7                               |
| agentskills.io                                                 | live    | llms.txt doc index, specification.md as format ground truth                                              | Referenced in Rung 7                                                   |

## Port note

The original Python tooling (scripts/*.py, eval-viewer/generate_review.py, 2,412 lines) was ported to Bun TypeScript with behavior parity: same CLI flags, same JSON schemas, same HTML output. Zip creation moved from the Python zipfile module to fflate; the review server moved from http.server to Bun.serve; YAML parsing uses Bun.YAML. Linting and formatting are enforced by oxlint 1.73 and oxfmt 0.58 (`bun run check`).
