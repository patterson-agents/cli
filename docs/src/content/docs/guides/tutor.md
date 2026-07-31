---
title: The tutor
description: Hands-on AI-fluency lessons validated against your real project — with license-respecting content and preparation for official certifications.
sidebar:
  order: 3
---

:::note[Status]
The tutor is a **P7** deliverable — the last major phase before polish —
because it consumes every other subsystem (the model, emitters, checks,
and the MCP surface). Everything on this page describes planned,
spec'd behavior, not shipped functionality. The tutor is also an
explicit cut line: removing it deletes zero code in earlier phases.
:::

```sh
patterson tutor           # pick a track and go
patterson tutor [topic]   # jump straight to a topic
patterson tutor list      # tracks and lessons
patterson tutor resume    # continue where you left off
patterson tutor status    # progress overview
```

The tutor teaches AI-assisted development the way GitHub Skills does —
by making you perform real actions and checking that they actually
happened — but it runs locally, against **your** project.

## Tracks

| Track | What you learn |
| --- | --- |
| AI-fluency foundations | The 4Ds framework and the fundamentals of working effectively with AI |
| Claude Code | Configuring and using Claude Code in a real project |
| Copilot | GitHub Copilot instructions, agents, and workflows |
| MCP | Building and consuming Model Context Protocol servers |

## Validated steps, not quizzes

Each lesson is a sequence of steps: a short narrative, an action to
perform in your real project, and a validation. Validations check what
**actually changed on disk** — the tutor owns no validators of its own;
every step's check points into the same core check registry that powers
`patterson doctor`. That design has teeth:

- A learner who didn't perform the action **cannot pass the step** — no
  false positives on skipped work is a stated success criterion.
- In the MCP track, your lesson's server must answer a **real JSON-RPC
  handshake** to pass.
- Lessons declare their prerequisites. A lesson that needs version
  control in a directory without it is skipped with an explanation and
  an offer to initialize — never a mysterious failure.

Progress is per-project and resumable: it persists in
`.patterson/tutor-progress.json`, and `patterson tutor resume` picks up
exactly where you stopped.

## Licensing and the link-out policy

Tutor content borrows from the best existing curricula **lawfully**.
The project constitution (Principle VI) sets three tiers, and every
lesson records its `sources[]` — URL, license, and how the source is
used — in its frontmatter:

| Source license | Policy |
| --- | --- |
| MIT / CC-BY (e.g. the MCP docs, GitHub Skills, VS Code docs) | Adapted or quoted, always with attribution |
| CC BY-NC(-SA) (e.g. Anthropic's courses and AI Fluency materials) | Taught as **concepts** with attribution and link-outs — never vendored |
| Unlicensed (e.g. the prompt-engineering interactive tutorial) | Link-only, with independently re-created exercises |

So when a lesson reaches material patterson can't ship, it doesn't
paraphrase around the license — it teaches the underlying concept, tells
you where the original lives, and sends you there.

## Certification preparation — never issuance

Certification tracks **prepare** you for official credentials; patterson
never issues credentials of its own. Tracks that map to an official
course or exam link out to the source with proper attribution —
Anthropic Academy, GitHub Skills, and Microsoft Learn — and the tutor's
language is always "preparation for", by constitutional rule.
