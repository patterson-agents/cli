# Template — Patterson TutorialKit Theme

A standalone, brand-accurate preview of the **TutorialKit** shell themed in the
Patterson Companies design system — the top bar, breadcrumbs, lesson content with
all five callouts, primary/secondary buttons, a nav card, the file tree, the code
editor, and the terminal.

## Run it

Open `index.html`. No install, no WebContainer — it's a static mock so you can
review the brand instantly and share it.

## Theme switcher

The top-bar dropdown swaps `data-theme` on `<html>` across the four themes the
theme file defines:

- **Light** — Patterson corporate light (navy chrome, sky accent).
- **Dark (Navy)** — deep Patterson navy canvas.
- **Dental** — sky-forward flavor; primary actions turn sky.
- **Veterinary** — teal/green flavor (Patterson animal-health hues).

## How it stays honest

Every color in this page is a `var(--tk-*)` reference — the exact variables
TutorialKit reads. The page links the **canonical theme file** (`theme.css`, alongside it)
rather than copying any values, so the preview and the real theme can never drift. Change a token in `theme.css` and
this preview updates with it.

## Using the theme for real

Drop `theme.css` into the root of any TutorialKit project (and `public/logo.svg` +
`public/logo-dark.svg` for the wordmark) to brand it. It defines all 98 `--tk-*`
variables across four themes; nothing else is required to brand the platform.

## Fidelity notes

Layout and chrome recreate TutorialKit's structure from its theming reference; the
real app is React + CodeMirror + xterm. Syntax highlighting here is a hand-marked
approximation using the brand accent colors. The wordmark is the design system's
white lockup on the navy top bar.
