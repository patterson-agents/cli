---
title: One canonical model
description: Why patterson compiles a single model to every agent surface.
sidebar:
  order: 1
---

:::note
This page is a scaffold placeholder — full guides land with the docs
content workstream.
:::

Every AI coding tool reinvents the same concepts with incompatible file
formats. **patterson holds one canonical model and compiles it to every
surface** — then keeps watching, so hand edits are never lost, drift is
always reported, and "add an MCP server everywhere" is one command
instead of four file edits.

Three design rules make it trustworthy:

1. **Pure compilation** — every emitted file is a function of the model.
   Same model, same bytes, every time.
2. **Provenance everywhere** — if you hand-edit an emitted file,
   patterson keeps your edit, reports the conflict, and exits non-zero
   in automation.
3. **Declared reachability** — when a concept can't round-trip to a
   surface, `patterson check` tells you instead of silently dropping it.
