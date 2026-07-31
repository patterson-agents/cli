---
title: Getting started
description: Scaffold a branded, agent-ready project with one command.
sidebar:
  order: 1
---

:::note
This page is a scaffold placeholder — full guides land with the docs
content workstream.
:::

## Install

```sh
bun create patterson-agents/cli
```

## First commands

```text
patterson create [dir]    Scaffold from a design-system template (the wizard)
patterson init            Adopt an existing repo — your config becomes the model
patterson sync            Re-emit every surface from the model
patterson doctor          Drift + validity report
```

Every read takes `--json`. Every write takes `--dry-run` and `--yes`.
