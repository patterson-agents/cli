/**
 * Registry wiring (Constitution III) + the citty frontend projection.
 */
import { describe, expect, test } from "bun:test";

import { buildRegistry } from "../src/commands/registry.ts";
import { makeCreateCommand } from "../src/commands/create.ts";
import { cittyArgsFor, fieldsOf, kebabCase, parseDecisionFlag } from "../src/commands/frontend.ts";
import { makeDoctorCommand } from "../src/commands/doctor.ts";
import { stubDeps } from "./helpers.ts";

describe("command registry wiring", () => {
  test("all commands are registered, sorted by id", () => {
    const registry = buildRegistry(stubDeps());
    expect(registry.list().map((descriptor) => descriptor.id)).toEqual([
      "check",
      "create",
      "design.refresh",
      "design.templates",
      "design.tokens",
      "doctor",
      "init",
      "plugins.marketplace.list",
      "skills.add",
      "skills.list",
      "skills.remove",
      "sync",
    ]);
  });

  test("descriptors resolve by id and by CLI path", () => {
    const registry = buildRegistry(stubDeps());
    expect(registry.resolve("create")?.path).toEqual(["create"]);
    expect(registry.resolveByPath(["sync"])?.id).toBe("sync");
  });

  test("annotations: reads are read-only, writes gate destructive flags", () => {
    const registry = buildRegistry(stubDeps());
    const annotation = (id: string) => registry.resolve(id)?.annotations;
    expect(annotation("doctor")).toEqual({ readOnlyHint: true, destructiveHint: false });
    expect(annotation("check")).toEqual({ readOnlyHint: true, destructiveHint: false });
    expect(annotation("create")).toEqual({ readOnlyHint: false, destructiveHint: true });
    expect(annotation("sync")).toEqual({ readOnlyHint: false, destructiveHint: true });
    expect(annotation("init")).toEqual({ readOnlyHint: false, destructiveHint: false });
  });
});

describe("citty frontend projection", () => {
  test("zod input schema drives flag metadata", () => {
    const create = makeCreateCommand(stubDeps());
    const fields = Object.fromEntries(fieldsOf(create.inputSchema).map((f) => [f.key, f]));
    expect(fields["yes"]?.kind).toBe("boolean");
    expect(fields["force"]?.kind).toBe("boolean");
    expect(fields["install"]?.kind).toBe("boolean");
    expect(fields["install"]?.defaultValue).toBe(true);
    expect(fields["agents"]?.kind).toBe("array");
    expect(fields["template"]?.defaultValue).toBe("skeleton");
  });

  test("positionals, aliases, and --json projection", () => {
    const create = makeCreateCommand(stubDeps());
    const args = cittyArgsFor(create, { positionals: ["dir"], aliases: { yes: "y" } });
    expect(args["dir"]).toEqual({ type: "positional", required: false, default: "." });
    expect(args["yes"]).toMatchObject({ type: "boolean", alias: "y" });
    // create is a write descriptor: no --json.
    expect(args["json"]).toBeUndefined();

    const doctor = makeDoctorCommand(stubDeps());
    const doctorArgs = cittyArgsFor(doctor);
    expect(doctorArgs["json"]).toMatchObject({ type: "boolean" });
  });

  test("camelCase schema keys become kebab-case flags", () => {
    expect(kebabCase("acceptGenerated")).toBe("accept-generated");
    expect(kebabCase("dryRun")).toBe("dry-run");
  });

  test("decision flags fold back into schema input", () => {
    expect(parseDecisionFlag("--yes")).toEqual({ key: "yes", value: true });
    expect(parseDecisionFlag("--accept-generated")).toEqual({ key: "acceptGenerated", value: true });
    expect(parseDecisionFlag("--link-mode=symlink")).toEqual({ key: "linkMode", value: "symlink" });
  });
});
