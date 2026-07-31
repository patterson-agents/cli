/**
 * WizardState persistence — `.patterson/wizard.json`.
 *
 * The driver saves after every completed step so `--resume` (D10: resume is a
 * first-class property of the create flow) can pick up mid-wizard. A corrupt
 * or foreign file is treated as absent, never a crash. This path is not on
 * the never-write list and is wholly owned by the wizard.
 */
import { rm } from "node:fs/promises";
import { join } from "node:path";

import type { WizardState } from "./types.ts";

export const WIZARD_STATE_FILE = ".patterson/wizard.json";

/** Absolute path of the wizard state file for a project root. */
export function wizardStatePath(cwd: string): string {
  return join(cwd, WIZARD_STATE_FILE);
}

export function freshWizardState(): WizardState {
  return { version: 1, completedSteps: [] };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/** Structural check for a persisted state blob (light — create re-validates). */
function isWizardState(value: unknown): value is WizardState {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  if (record["version"] !== 1) return false;
  if (!isStringArray(record["completedSteps"])) return false;
  for (const key of ["template", "name"]) {
    if (record[key] !== undefined && typeof record[key] !== "string") return false;
  }
  if (record["agents"] !== undefined && !isStringArray(record["agents"])) return false;
  return true;
}

/**
 * Load persisted wizard state, or undefined when the file is missing,
 * unparsable, or not shaped like WizardState.
 */
export async function loadWizardState(cwd: string): Promise<WizardState | undefined> {
  const file = Bun.file(wizardStatePath(cwd));
  if (!(await file.exists())) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    return undefined;
  }
  return isWizardState(parsed) ? parsed : undefined;
}

/** Persist wizard state (creates `.patterson/` as needed). */
export async function saveWizardState(cwd: string, state: WizardState): Promise<void> {
  await Bun.write(wizardStatePath(cwd), `${JSON.stringify(state, null, 2)}\n`);
}

/** Remove the state file (after a successful create). Missing file is fine. */
export async function clearWizardState(cwd: string): Promise<void> {
  await rm(wizardStatePath(cwd), { force: true });
}
