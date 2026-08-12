---
layout: home

hero:
  name: Patterson Docs
  text: Documentation in the Patterson brand
  tagline: Trusted Expertise. Unrivaled Support.
  image:
    light: /patterson-logo-navy.svg
    dark: /patterson-logo-white.svg
    alt: Patterson Companies
  actions:
    - theme: brand
      text: Get started
      link: /getting-started
    - theme: alt
      text: Brand tokens
      link: /guides/brand-tokens

features:
  - title: On brand by default
    details: Every Patterson token is mapped onto VitePress's theme variables in one file. The default theme is extended, not forked, so the branding survives VitePress upgrades.
  - title: One dependency, verified
    details: VitePress ^2.0.0-alpha.19, install-verified, with a committed lockfile that reproduces the checked build. One dependency, nothing native to compile.
  - title: Diataxis structure
    details: Start here, Guides, and Reference are wired into the nav and sidebar, ready for task-shaped how-tos and lookup-shaped reference.
  - title: Light and dark
    details: Both themes are tuned. Navy and link blue carry the accent on white; sky and light blue carry it on dark. Sky is never text on a light canvas.
---

## What this is

A Patterson Companies branded [VitePress](https://vitepress.dev) documentation site.
You write Markdown. The navy chrome, the accent policy, Proxima Nova, the 5px shape
language, and the sky focus ring come with it.

## Run it

```sh
bun install
bun run docs:dev
```

The site builds to `docs/.vitepress/dist/` with `bun run docs:build`, and
`bun run docs:preview` serves that build locally.

## Where to go next

Read [Getting started](/getting-started) to add your first page.
[Brand tokens](/guides/brand-tokens) covers the palette and shape rules.
[Theming](/guides/theming) explains how the VitePress mapping works and where to
change it.
