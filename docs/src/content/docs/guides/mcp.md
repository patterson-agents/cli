---
title: MCP servers
description: Declare an MCP server once and reach every surface — and let agents drive patterson itself over MCP with `patterson mcp serve`.
sidebar:
  order: 2
---

:::note[Status]
Claude Code `.mcp.json` emission ships with the **P2a** walking skeleton
(in flight). The other surface renderings (VS Code, opencode, Zed,
Copilot) land in **P2b**, and the `patterson mcp` command group —
including `serve` — lands in **P4**. The protocol behavior documented
below is already verified (spike S1).
:::

MCP server definitions are one of the clearest cases for a canonical
model: the same server is declared in `.mcp.json`, `.vscode/mcp.json`,
`opencode.json`, and Zed's `context_servers` — four shapes, several
transport enums, and incompatible secret syntaxes. In patterson you
declare it **once** and every surface gets its native rendering.

## The command surface

```text
patterson mcp list      Servers in the model and their per-surface reach
patterson mcp add       Add a server definition to the model
patterson mcp remove    Remove a server definition
patterson mcp serve     Expose the entire patterson CLI as a stdio MCP server
```

## Declaring a server

A server definition (`McpServerDef`) carries a name, a transport, and
optional per-target settings:

- **Transports**: `stdio` (a local command as an argv array — never a
  joined shell string), or remote `http` / `sse` / `ws` with URL and
  headers. `ws` is only reachable on Claude Code; on other surfaces it
  is reported by `patterson check` rather than silently dropped.
- **Secrets are references, never values.** Headers and environment
  values take `SecretRef` nodes (env var, prompt, picker, command, or
  helper). Interpolated secret strings are rejected by the model schema,
  because the four surfaces each use a different interpolation syntax —
  strings can't round-trip, references can.
- **Reserved names are rejected** (names the consuming tools claim for
  themselves, such as `workspace`).

## What each surface receives

| Surface | Rendering |
| --- | --- |
| Claude Code | `.mcp.json`, with project-relative paths in the `${CLAUDE_PROJECT_DIR:-.}` form |
| VS Code | `.vscode/mcp.json` — top-level `servers` plus synthesized `inputs[]` for prompted secrets |
| opencode | `opencode.json` with `command` as a verbatim `string[]` argv |
| Zed | `context_servers` — no `type` discriminator field (presence discriminates); project-scope support is gated on spike S6, which decides file emission vs. setup instructions |
| Copilot coding agent | Always instruction-mode: a setup blob including the `COPILOT_MCP_*` secrets convention; `tools[]` is required, otherwise patterson warns and emits `["*"]` |

Where a surface can't express something, the gap shows up in
`patterson check` with a reason and the applied fallback — never a
silent omission.

## `patterson mcp serve` — the CLI as an MCP server

The whole command surface is defined once in a typed registry and
projected twice: as CLI subcommands and as MCP tools ("one registry,
two frontends"). `patterson mcp serve` starts a **stdio** server over
that registry, so any agent can do everything a human can:

- Tools are named `patterson_<command id>` (dots become underscores),
  listed in deterministic order, and carry `readOnlyHint` /
  `destructiveHint` annotations — read and write operations are separate
  tools.
- Anything that would prompt a human returns a structured
  **decision-required** result naming the flag that resolves it. The
  core command handlers are prompt-free by construction; a build-time
  assertion keeps prompt code out of the server's module graph entirely.
- Drifted files produce a structured **conflict list**, never an
  overwrite. Destructive operations require explicit opt-in
  (`--accept-generated`), same as on the CLI.
- stdout carries JSON-RPC exclusively; all logging goes to stderr.

## Protocol evidence (spike S1)

The server builds on `@modelcontextprotocol/sdk@1.30.0`, a choice
verified end-to-end against real Claude Code (v2.1.220) rather than
assumed:

- The wire capture showed Claude Code sending protocol version
  `2025-11-25` in `initialize`; the SDK's latest supported version is
  exactly that, echoed back verbatim. A scripted client requesting an
  unknown future version (`2026-07-28`) gets `2025-11-25` back and
  decides for itself whether to proceed — on a real negotiation failure
  patterson emits a readable stderr diagnostic naming both revisions.
- In a live headless run, Claude Code listed the spike server's tools
  and called them successfully. One operational note: project-scope
  `.mcp.json` entries need interactive trust approval, so headless runs
  use `claude -p … --mcp-config <file> --strict-mcp-config`.
- Two SDK behaviors patterson's error mapping accounts for:
  schema-invalid `tools/call` arguments come back as an `isError: true`
  tool *result* (not a protocol-level JSON-RPC error), and Claude Code
  attaches `_meta` fields to tool calls that handlers must tolerate.
