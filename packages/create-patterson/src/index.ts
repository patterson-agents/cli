#!/usr/bin/env bun
/**
 * create-patterson — the canonical scaffold door (plan.md "three doors, one
 * implementation"):
 *
 *   bunx create-patterson [dir] [flags]   (canonical)
 *   bun create patterson [dir]            (npm-registry door, same package)
 *   bun create <owner>/<repo>             (GitHub door; the repo's bun-create
 *                                          postinstall runs this bin --resume)
 *
 * The shim delegates straight to `patterson create` — interactive wizard in a
 * TTY, flag-driven otherwise; `--resume` continues .patterson/wizard.json and
 * is a no-op on a fresh directory (fresh state), which is what makes it safe
 * as the bun-create postinstall.
 */
import { runCreateFromArgv } from "@patterson/cli";

await runCreateFromArgv(process.argv.slice(2));
