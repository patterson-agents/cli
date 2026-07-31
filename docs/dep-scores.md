# Dependency supply-chain scores (T001)

Scored 2026-07-31 via `socket package shallow npm pkg:npm/<name>@<version> --markdown`.
Constitution IV: any dimension < 90 requires surfaced disposition. Threshold applies
per-dimension; risk weight differs by dimension (supply-chain/vulnerability ≫
maintenance/quality on devDependencies).

| Package | SC | Maint | Qual | Vuln | Lic | <90 disposition |
| --- | --- | --- | --- | --- | --- | --- |
| zod@4.4.3 | 100 | **88** | 100 | 100 | 100 | Maintenance 88 on the ecosystem's standard schema lib (stable-by-design release cadence). ACCEPT. |
| citty@0.2.2 | 100 | **81** | 99 | 100 | **80** | UnJS CLI framework. Maintenance reflects slow release cadence; License 80 reflects metadata completeness, package is MIT. ACCEPT; revisit if stricli reaches parity. |
| @clack/prompts@1.7.0 | 99 | 95 | 100 | 100 | 100 | — |
| jsonc-parser@3.3.1 | 100 | **88** | 100 | 100 | 100 | Microsoft/VS Code's own JSONC parser; mature, low churn. ACCEPT. |
| @modelcontextprotocol/sdk@1.30.0 | 98 | 96 | 100 | 100 | 100 | [middle] recentlyPublished + gptSecurity noted; legacy line chosen deliberately (D3/S1). |
| oxlint@1.76.0 | 99 | 96 | 91 | 100 | 100 | — |
| lefthook@2.1.10 | 91 | 92 | 100 | 100 | 100 | [middle] installScripts + shellAccess = it installs a git-hook binary — that is its function. ACCEPT (devDependency). |
| @commitlint/cli@21.2.1 | 99 | 95 | **72** | 100 | 100 | Quality 72 on a build-time devDependency (policy: different risk class from supply-chain). ACCEPT. |
| @commitlint/config-conventional@21.2.0 | 100 | 94 | 100 | 100 | 100 | — |

Previously scored this session:
- skills@1.5.21 — SC **72** ([middle] recentlyPublished/unpopular/network/shell/gptSecurity).
  Used as pinned devDependency invoked via bunx, per explicit user direction; wrapper
  adds lockfile backup guard. ACCEPT (user-directed).
- @opentui/core 97 / react 97 / solid 97 / solid-js 100 — currently being REMOVED (P0).

No package hits the hard denylist. No vulnerability dimension below 100.
