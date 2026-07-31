---
title: Agent parity
description: One typed command registry surfaces every operation as both a CLI subcommand and an MCP tool — with structured decisions instead of prompts.
sidebar:
  order: 3
---

patterson configures AI agents, so AI agents must be able to drive patterson —
with exactly the powers and exactly the safety rails a human gets. That is not
an integration bolted on afterward; it is a structural rule: **every command
is defined once, in a typed registry, and surfaces automatically as both a CLI
subcommand and an MCP tool.**

:::note[Status]
The command registry shipped in P1, and the MCP handshake was spike-verified
end to end against a real Claude Code client before the registry contract was
frozen. The self-exposing server command (`patterson mcp serve`) lands in P4;
until then the registry's MCP projection exists in the codebase but is not
yet a shipped user-facing command.
:::

## The registry

Each operation is a single descriptor:

```ts
interface CommandDescriptor<In, Out> {
  id: string;              // "skills.add", "design.templates"
  path: string[];          // CLI grouping: ["skills", "add"]
  summary: string;         // one line; also the MCP tool description opener
  inputSchema: ZodType<In>;   // drives CLI flag parsing AND the MCP tool schema
  outputSchema: ZodType<Out>; // machine-readable result (--json / MCP result)
  annotations: {
    readOnlyHint: boolean;    // read and write ops are SEPARATE descriptors
    destructiveHint: boolean; // true ⇒ requires explicit opt-in (--force / --accept-generated)
  };
  run(args: In, ctx: CommandCtx): Promise<CommandResult<Out>>;
}
```

Two properties do the heavy lifting:

- **One schema, two frontends.** The same zod input schema parses CLI flags
  and generates the MCP tool's JSON Schema. Divergence between what the CLI
  accepts and what an agent can send is a bug class eliminated by
  construction.
- **Reads and writes are separate descriptors**, annotated with
  `readOnlyHint`/`destructiveHint`. An agent can see, before calling, whether
  a tool inspects or mutates — and destructive operations require an explicit
  opt-in flag from every caller, human or agent.

## The two projections

**CLI** — citty builds the nested command tree from `path[]`. Every read
command takes `--json`; every write command takes `--dry-run`. Exit codes are
part of the contract: `0` ok, `1` error, `2` conflicts preserved, `3`
decision required in a non-interactive run.

**MCP** — the whole registry is exposed as a stdio MCP server. Tools are named
`patterson_<id>` (dots → underscores) and listed in deterministic sorted order
for prompt-cache stability. stdout carries JSON-RPC exclusively; all logging
goes to stderr. The read/write annotations map directly onto MCP tool
annotations.

The registry contract was frozen only after a named spike verified the
handshake against a **real Claude Code client**: server listed, tools
enumerated, a read tool and a write tool called successfully over stdio.

## Decision-required: prompts become data

Core command handlers are **prompt-free** — there is no interactive code in
the core layer at all (importing the MCP entry point with a prompt-capable
module in its graph is a build-time error). Instead, a handler that needs a
human choice returns a structured outcome:

```ts
type CommandResult<Out> =
  | { kind: "ok"; value: Out; report?: Report }
  | { kind: "conflicts"; conflicts: DriftConflict[];
      resolvingFlag: "--accept-generated" }
  | { kind: "decision-required"; decision: {
        id: string; question: string;
        options: { flag: string; label: string }[];  // every option maps to a flag
      } }
  | { kind: "error"; code: string; message: string; hint?: string };
```

The two frontends resolve it differently:

- The **CLI** converts `decision-required` into an interactive prompt, then
  re-invokes the command with the chosen flag.
- The **MCP server** returns the decision verbatim as a structured tool
  result — question, options, and the exact flag that resolves each one. The
  calling agent decides (or asks its human) and calls again with the flag.

Because every option maps to a flag, interactive, CI, and agent callers share
one code path — there is no behavior an agent can't reach and no prompt a
script can't answer.

## Safety is symmetric

The same guarantees hold regardless of who is calling:

- **Nothing destructive without explicit opt-in.** `destructiveHint: true`
  operations require `--force` or `--accept-generated` from agents exactly as
  from humans.
- **Drift never clobbers.** An agent invoking `sync` against a hand-edited
  file gets a structured conflict list and an untouched file — the MCP
  equivalent of the CLI's keep-report-exit-non-zero behavior. See
  [drift safety](/concepts/drift-safety/).

The result: an agent connected over MCP can complete every read operation and
every non-conflicting write operation without human intervention — and can
never do, by accident, anything a human couldn't do without typing a
consent flag.
