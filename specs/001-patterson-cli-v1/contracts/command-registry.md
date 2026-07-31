# Contract: Command Registry (CLI ↔ MCP parity)

The registry is the single definition point for every operation (Constitution III).

## Descriptor

```ts
interface CommandDescriptor<In, Out> {
  id: string;                    // "skills.add", "design.templates", "new.mcp-server"
  path: string[];                // CLI grouping: ["skills","add"]
  summary: string;               // one line; also the MCP tool description opener
  inputSchema: ZodType<In>;      // zod v4; also drives flag parsing + MCP schema
  outputSchema: ZodType<Out>;    // machine-readable result (--json / MCP result)
  annotations: {
    readOnlyHint: boolean;       // read and write ops are SEPARATE descriptors
    destructiveHint: boolean;    // true ⇒ CLI requires --force/--accept-generated
  };
  run(args: In, ctx: CommandCtx): Promise<CommandResult<Out>>;
}
```

## CommandResult — the decision-required protocol

```ts
type CommandResult<Out> =
  | { kind: "ok"; value: Out; report?: Report }
  | { kind: "conflicts"; conflicts: DriftConflict[]; resolvingFlag: "--accept-generated" }
  | { kind: "decision-required"; decision: {
        id: string; question: string;
        options: { flag: string; label: string }[];   // every option maps to a flag
      } }
  | { kind: "error"; code: string; message: string; hint?: string };
```

Rules:
- Core handlers are prompt-free. The CLI frontend converts `decision-required` into a
  @clack prompt and re-invokes with the chosen flag; the MCP frontend returns it
  verbatim as a structured tool result.
- `conflicts` in non-interactive mode ⇒ process exit ≠ 0 (CLI) / isError result with
  structured list (MCP). Never silent.
- Every prompt in the wizard is backed by a flag (`processArgument` pattern) so the
  same descriptor serves interactive, CI, and agent callers.

## MCP projection

- Transport: stdio only in v1. All logging → stderr. stdout is JSON-RPC exclusively.
- Startup assertion: importing the mcp entry point with a prompt-capable module in the
  graph is a build-time error (no @clack in the closure).
- Tool naming: `patterson_<id with dots→underscores>`; deterministic ordering
  (sorted by id) for prompt-cache stability.
- Tool count budget: coarse tools; if the surface exceeds ~30 leaves, collapse to
  `search_actions` + `execute_action` (registry supports both projections).
- `readOnlyHint`/`destructiveHint` map to MCP tool annotations.
- SDK: `@modelcontextprotocol/sdk@^1.30` (legacy line) pending S1 evidence recorded
  in research.md; on version-negotiation failure emit a readable stderr diagnostic
  naming both protocol revisions.

## CLI projection

- citty nested commands from `path[]`, lazy-loaded per group.
- `--json` on every read descriptor (prints `outputSchema`-shaped JSON).
- `--dry-run` on every write descriptor (returns planned FileOps, writes nothing).
- Exit codes: 0 ok; 1 error; 2 conflicts-preserved; 3 decision-required (non-interactive).
