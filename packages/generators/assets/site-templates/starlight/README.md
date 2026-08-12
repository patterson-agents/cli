# Patterson Starlight site

A Patterson Companies branded [Starlight](https://starlight.astro.build) documentation
site. Astro 7.1.5 and Starlight 0.41.5, pinned exactly and install-verified.

## Scaffold

```sh
bun create patterson-starlight my-docs
cd my-docs
bun run dev
```

`bun create` copies this directory into the target, runs `bun install`, and initializes
a git repository there. Three caveats, verified against Bun 1.3:

- **Point it at a new directory.** `bun create` does not refuse an existing one — it
  replaces the contents, without a prompt. A file already sitting in the target is
  gone afterward.
- **The `name` field is rewritten** to the target directory name, so the scaffolded
  project is `my-docs`, not `patterson-starlight-site`. Everything else is copied
  verbatim, `.gitignore` included.
- **The template is resolved from `~/.bun-create/patterson-starlight`.** If that copy
  is missing, `bun create` falls back to looking the name up on npm, where it does not
  exist. Register it once with
  `cp -R <plugin>/ds/templates/starlight ~/.bun-create/patterson-starlight`.

If you would rather not register anything, copy the folder directly:

```sh
cp -R "${CLAUDE_PLUGIN_ROOT}/ds/templates/starlight" my-docs
cd my-docs
bun install
bun run dev
```

## Scripts

| Script | What it does |
|---|---|
| `bun run dev` | Dev server on `http://localhost:4321` |
| `bun run build` | Static build to `dist/` |
| `bun run preview` | Serves the built `dist/` locally |

There is deliberately no `start` script. `bun create` executes a template's `start`
script when one exists, and a dev server that never exits would hang the scaffold.

## Customization points

| What | Where |
|---|---|
| Site title, description, tagline | `astro.config.mjs`, inside `starlight({ … })` |
| Deployed origin and sub-path | `astro.config.mjs`, the commented `site` and `base` fields |
| Sidebar sections | `astro.config.mjs`, `sidebar` — `guides/` and `reference/` autogenerate |
| Brand theme | `src/styles/patterson.css`, the only brand file |
| Logos | `src/assets/` for the hero, `public/` for the nav and favicon |
| Pages | `src/content/docs/`, folders drive the sidebar |

## The accent and contrast policy

Sky `#00A8E1` is the brand's signature color and the easiest one to misuse. White text
on sky fails WCAG contrast, and so does sky text on white.

- On a **light** canvas, navy `#003767` carries strong text and link blue `#147EC2`
  carries links. Sky appears only as non-text chrome, such as the header hairline and
  the focus ring.
- On a **dark** canvas, sky and its lighter tints carry the accent, text included.

Primary button hover on light is a lighter navy `#315D83`, never sky. Everything is
sentence case, with no uppercase transforms, and there is no emoji anywhere.

## The font policy

Proxima Nova is served by Adobe Fonts kit `uth1qfm`, linked from the `head` entry in
`astro.config.mjs`. Adobe's terms do not permit re-hosting Typekit payloads, so this
template ships no font binaries and no `@font-face` declarations. Arial is the
sanctioned substitute when the kit is unreachable.

## Dependencies

`astro@7.1.5` and `@astrojs/starlight@0.41.5`, pinned without a caret, are the only two
direct dependencies. Adding one to this template means supply-chain scoring it first.

### About sharp

`astro@7.1.5` declares `sharp` as an **optional** dependency, and package managers
install optional dependencies by default — so `sharp@0.35.3` does appear in `bun.lock`
and in `node_modules` after `bun install`. It is never loaded. `astro.config.mjs`
configures `passthroughImageService()`, which copies images through untouched instead of
invoking sharp, and the build log confirms it: images come out byte-for-byte the size
they went in.

This is a deliberate, documented position, not an oversight. Do not add `sharp` as a
direct dependency, and do not swap the image service back to the default. If you need
resizing or format conversion, pre-process the assets before committing them.

**Do not reach for `bun install --omit=optional` to drop it.** That flag does remove
`sharp`, but it also removes Rolldown's native binding, which Astro 7 needs to bundle —
the build then fails with `Cannot find native binding`. Verified on Bun 1.3.14. Leaving
the optional dependencies installed and the image service on passthrough is the working
configuration.
