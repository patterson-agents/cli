/**
 * CLI frontend projection (contracts/command-registry.md, CLI projection).
 *
 * A registry CommandDescriptor becomes a citty command: the zod inputSchema
 * drives flag parsing, `--json` is added to every read descriptor, exit codes
 * follow the contract (0 ok / 1 error / 2 conflicts / 3 decision-required),
 * and `decision-required` results are resolved by an @clack prompt in
 * interactive sessions (each option maps to a flag — processArgument pattern).
 */
import { isCancel, select } from "@clack/prompts";
import type { ArgDef, ArgsDef, CommandDef as CittyCommandDef } from "citty";
import { z } from "zod";

import {
  exitCodeFor,
  type AnyCommandDescriptor,
  type CommandCtx,
  type CommandIo,
  type CommandResult,
} from "@patterson/core";

// ---------------------------------------------------------------------------
// zod → citty args
// ---------------------------------------------------------------------------

interface FieldInfo {
  key: string;
  flag: string;
  kind: "boolean" | "string" | "array" | "enum";
  options?: string[];
  defaultValue?: unknown;
}

export function kebabCase(key: string): string {
  return key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

function unwrapField(schema: z.ZodType): { inner: z.ZodType; defaultValue?: unknown } {
  let current: z.ZodType = schema;
  let defaultValue: unknown;
  for (;;) {
    if (current instanceof z.ZodDefault) {
      const def = (current as unknown as { def?: { defaultValue?: unknown } }).def;
      defaultValue = typeof def?.defaultValue === "function" ? def.defaultValue() : def?.defaultValue;
      current = current.unwrap() as z.ZodType;
      continue;
    }
    if (current instanceof z.ZodOptional || current instanceof z.ZodNullable) {
      current = current.unwrap() as z.ZodType;
      continue;
    }
    return { inner: current, defaultValue };
  }
}

/** Introspect a zod object schema into per-field flag metadata. */
export function fieldsOf(schema: z.ZodType): FieldInfo[] {
  if (!(schema instanceof z.ZodObject)) return [];
  const shape = schema.shape as Record<string, z.ZodType>;
  return Object.entries(shape).map(([key, fieldSchema]) => {
    const { inner, defaultValue } = unwrapField(fieldSchema);
    const info: FieldInfo = { key, flag: kebabCase(key), kind: "string" };
    if (defaultValue !== undefined) info.defaultValue = defaultValue;
    if (inner instanceof z.ZodBoolean) info.kind = "boolean";
    else if (inner instanceof z.ZodArray) info.kind = "array";
    else if (inner instanceof z.ZodEnum) {
      info.kind = "enum";
      info.options = (inner.options as unknown[]).map(String);
    }
    return info;
  });
}

export interface FrontendConfig {
  /** Schema keys surfaced as positional CLI arguments (in order). */
  positionals?: string[];
  /** Flag aliases, keyed by schema key (e.g. { yes: "y" }). */
  aliases?: Record<string, string>;
  description?: string;
}

function toArgDef(field: FieldInfo, config: FrontendConfig): ArgDef {
  if (config.positionals?.includes(field.key)) {
    return {
      type: "positional",
      required: false,
      ...(typeof field.defaultValue === "string" ? { default: field.defaultValue } : {}),
    };
  }
  const alias = config.aliases?.[field.key];
  if (field.kind === "boolean") {
    return {
      type: "boolean",
      ...(typeof field.defaultValue === "boolean" ? { default: field.defaultValue } : {}),
      ...(alias !== undefined ? { alias } : {}),
    };
  }
  // Arrays and enums parse as strings; validation happens in the zod schema.
  return {
    type: "string",
    ...(typeof field.defaultValue === "string" ? { default: field.defaultValue } : {}),
    ...(alias !== undefined ? { alias } : {}),
  };
}

/** Build the citty ArgsDef for a descriptor (plus --json on read descriptors). */
export function cittyArgsFor(descriptor: AnyCommandDescriptor, config: FrontendConfig = {}): ArgsDef {
  const args: ArgsDef = {};
  for (const field of fieldsOf(descriptor.inputSchema as z.ZodType)) {
    args[field.flag] = toArgDef(field, config);
  }
  if (descriptor.annotations.readOnlyHint) {
    args["json"] = { type: "boolean", description: "Print the outputSchema-shaped JSON result" };
  }
  return args;
}

// ---------------------------------------------------------------------------
// Arg collection (citty parsed args → schema input)
// ---------------------------------------------------------------------------

function collectRawInput(
  descriptor: AnyCommandDescriptor,
  parsedArgs: Record<string, unknown>,
): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  for (const field of fieldsOf(descriptor.inputSchema as z.ZodType)) {
    let value = parsedArgs[field.flag] ?? parsedArgs[field.key];
    if (value === undefined) continue;
    if (field.kind === "array") {
      value = Array.isArray(value)
        ? value
        : String(value)
            .split(",")
            .map((part) => part.trim())
            .filter((part) => part.length > 0);
    }
    raw[field.key] = value;
  }
  return raw;
}

// ---------------------------------------------------------------------------
// Result rendering + exit codes
// ---------------------------------------------------------------------------

function renderResult(result: CommandResult<unknown>, io: CommandIo, json: boolean): void {
  switch (result.kind) {
    case "ok": {
      if (json) {
        io.out(JSON.stringify(result.value, null, 2));
        return;
      }
      if (result.report) {
        io.out(result.report.summary);
        for (const detail of result.report.details ?? []) io.out(`  - ${detail}`);
      } else {
        io.out("ok");
      }
      return;
    }
    case "conflicts": {
      if (json) {
        io.out(JSON.stringify({ conflicts: result.conflicts, resolvingFlag: result.resolvingFlag }, null, 2));
        return;
      }
      io.err(`${result.conflicts.length} drift conflict(s) — hand-edited content was kept, not overwritten:`);
      for (const conflict of result.conflicts) io.err(`  - ${conflict.message}`);
      io.err(`Re-run with ${result.resolvingFlag} to overwrite (a backup is taken first).`);
      return;
    }
    case "decision-required": {
      if (json) {
        io.out(JSON.stringify({ decision: result.decision }, null, 2));
        return;
      }
      io.err(result.decision.question);
      for (const option of result.decision.options) io.err(`  ${option.flag}  ${option.label}`);
      return;
    }
    case "error": {
      if (json) {
        io.out(JSON.stringify({ code: result.code, message: result.message, hint: result.hint }, null, 2));
        return;
      }
      io.err(`error[${result.code}]: ${result.message}`);
      if (result.hint !== undefined) io.err(`hint: ${result.hint}`);
      return;
    }
  }
}

/** Parse a decision option's flag ("--yes", "--link-mode=symlink") into schema input. */
export function parseDecisionFlag(flag: string): { key: string; value: unknown } {
  const stripped = flag.replace(/^--/, "");
  const eq = stripped.indexOf("=");
  const name = eq === -1 ? stripped : stripped.slice(0, eq);
  const key = name.replace(/-([a-z])/g, (_m, char: string) => char.toUpperCase());
  return { key, value: eq === -1 ? true : stripped.slice(eq + 1) };
}

const consoleIo: CommandIo = {
  out(text) {
    console.log(text);
  },
  err(text) {
    console.error(text);
  },
};

/**
 * Run a descriptor against raw (already citty-parsed) args: validate, execute,
 * resolve interactive decisions, render, and set the process exit code.
 */
export async function runDescriptor(
  descriptor: AnyCommandDescriptor,
  parsedArgs: Record<string, unknown>,
  io: CommandIo = consoleIo,
): Promise<CommandResult<unknown>> {
  const json = parsedArgs["json"] === true;
  const raw = collectRawInput(descriptor, parsedArgs);
  const nonInteractive =
    json || raw["yes"] === true || !process.stdout.isTTY || process.env["CI"] === "true";

  const schema = descriptor.inputSchema as z.ZodType;
  const ctx: CommandCtx = { cwd: process.cwd(), nonInteractive, io };

  let result: CommandResult<unknown>;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    result = { kind: "error", code: "INVALID_ARGS", message: z.prettifyError(parsed.error) };
  } else {
    try {
      result = await descriptor.run(parsed.data, ctx);
      // Interactive decision loop: every option maps to a flag; prompt, fold
      // the chosen flag back into the args, and re-invoke (bounded).
      let rounds = 0;
      while (result.kind === "decision-required" && !nonInteractive && rounds < 5) {
        rounds += 1;
        const choice = await select({
          message: result.decision.question,
          options: result.decision.options.map((option) => ({
            value: option.flag,
            label: `${option.label} (${option.flag})`,
          })),
        });
        if (isCancel(choice)) {
          result = { kind: "error", code: "CANCELLED", message: "Aborted." };
          break;
        }
        const { key, value } = parseDecisionFlag(choice as string);
        const reparsed = schema.safeParse({ ...raw, [key]: value });
        if (!reparsed.success) {
          result = { kind: "error", code: "INVALID_ARGS", message: z.prettifyError(reparsed.error) };
          break;
        }
        result = await descriptor.run(reparsed.data, ctx);
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      result = { kind: "error", code: "INTERNAL", message };
    }
  }

  renderResult(result, io, json);
  process.exitCode = exitCodeFor(result);
  return result;
}

/** Project a registry descriptor into a citty command definition. */
export function cittyCommandFor(
  descriptor: AnyCommandDescriptor,
  config: FrontendConfig = {},
): CittyCommandDef<ArgsDef> {
  return {
    meta: {
      name: descriptor.path.at(-1) ?? descriptor.id,
      description: config.description ?? descriptor.summary,
    },
    args: cittyArgsFor(descriptor, config),
    async run({ args }) {
      await runDescriptor(descriptor, args as Record<string, unknown>);
    },
  };
}
