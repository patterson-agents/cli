---
title: Commands
description: The full patterson command surface.
sidebar:
  order: 1
---

:::note
This page is a scaffold placeholder — full reference docs land with the
docs content workstream.
:::

```text
patterson create [dir]         Scaffold from a design-system template (the wizard)
patterson init [--import]      Adopt an existing repo — your config becomes the model
patterson sync                 Re-emit every surface from the model
patterson doctor [--fix]       Drift + validity report
patterson check                Which intent reaches which agent (coverage table)

patterson agents    list · add · remove · sync
patterson skills    list · search · add · remove · update      (skills.sh ecosystem)
patterson plugins   list · add · remove · marketplace …
patterson mcp       list · add · remove · serve                (serve = be an MCP server)
patterson design    templates · pull · refresh · tokens
patterson editor    vscode · zed · devcontainer · codespaces
patterson ci        init · add <workflow> · sync
patterson new       skill · mcp-server · plugin · marketplace · command · cli-plugin
patterson tutor     [topic] · list · resume · status
```

Every read takes `--json`. Every write takes `--dry-run` and `--yes`.
Every prompt is resolvable by a flag — interactive, CI, and agent
callers share one code path.
