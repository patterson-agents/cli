# Contract: Emitter

Every emitter package implements:

```ts
interface Emitter {
  id: TargetId | "cross";
  compile(ir: PattersonProject, snapshot: FsSnapshot): FileOp[];
  // FsSnapshot = read-only view of current target files (for merge computation).
  // Emitters MUST NOT read anything else (Constitution I) and MUST NOT write.
}
```

The core emit engine (not the emitter) owns: provenance recording, drift comparison,
sentinel management, key-path surgery, `instruct` rendering into SETUP.md, backups,
and the never-write guard. Emitters produce *intent*; the engine applies it safely.

## Obligations

1. **Determinism**: same IR + snapshot ⇒ byte-identical FileOps (sorted keys, stable
   ordering, no timestamps in content — timestamps live in EmissionRecord only).
2. **Tier honesty**: each FileOp declares own/merge/instruct truthfully per the
   verified config matrix (research corpus §1). A merge-tier path emitted as "own" is
   a contract violation caught by fixture tests.
3. **Reachability**: an emitter receiving an entity it cannot express MUST return a
   `CoverageGap {entityId, targetId, reason, fallbackApplied}` (engine aggregates into
   `patterson check`). Silent drops are contract violations.
4. **Per-surface landmines** (encoded as fixture tests per emitter):
   - claude-code: C8 per-key merge semantics table; settings whitelist from S2 source;
     `${CLAUDE_PROJECT_DIR:-.}` form in .mcp.json; skills as symlink/copy per linkMode.
   - copilot: `.agent.md` era (not chatmodes); `applyTo` comma-string; coding-agent =
     instruct-only with `tools[]` + `COPILOT_MCP_*` secrets blob.
   - opencode: `command: string[]`; `skills.paths: [".agents/skills"]` always;
     `.opencode/` hostile-co-writer (never own-tier); `template` required on commands.
   - zed: no `type` discriminator; C7 chain scan incl. foreign `.cursorrules` etc.;
     S6 decides file vs instruct for context_servers.
   - vscode: top-level `servers` + synthesized `inputs[]`; JSONC comments preserved.
   - devcontainer(+codespaces): C10 lifecycle value-type preservation; C15 secrets
     prompt-only warning; badge; prebuild note; features require confirmation.
   - github-actions: `permissions: {}` at workflow level; `persist-credentials: false`;
     C13 Node-24 provenance step; S7 gate on monorepo release.

## Cross-cutting (packages/emitters/cross)

- **C7 chain guard**: scans the full Zed first-match chain on disk (foreign files
  included); reports the winning file; offers folds/renames as decisions.
- **Coverage reporter**: aggregates CoverageGaps into the `check` table.

## Fixture test shape (per emitter)

`test/fixtures/<case>/{ir.json, before/, expected/, expected-gaps.json}` — golden
comparison of compile output + gap list; round-trip test: emit → hand-edit → emit ⇒
edit preserved + conflict reported.
