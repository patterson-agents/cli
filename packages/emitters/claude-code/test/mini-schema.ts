/**
 * Minimal draft-07 JSON-schema checker (test oracle helper, T022/T023).
 *
 * Deliberately tiny and dependency-free: just enough to verify that emitted
 * settings keys exist in the vendored schema's `properties` and that basic
 * types match ($ref into $defs, anyOf, const, enum, type, properties +
 * additionalProperties, items). NOT a general validator.
 */

interface SchemaNode {
  $ref?: string;
  anyOf?: SchemaNode[];
  const?: unknown;
  enum?: unknown[];
  type?: string | string[];
  properties?: Record<string, SchemaNode>;
  additionalProperties?: boolean | SchemaNode;
  items?: SchemaNode;
  required?: string[];
}

export interface RootSchema extends SchemaNode {
  $defs?: Record<string, SchemaNode>;
}

function resolve(node: SchemaNode, root: RootSchema): SchemaNode {
  if (node.$ref === undefined) return node;
  const match = /^#\/\$defs\/(.+)$/.exec(node.$ref);
  const resolved = match?.[1] === undefined ? undefined : root.$defs?.[match[1]];
  if (resolved === undefined) throw new Error(`mini-schema: unresolvable $ref "${node.$ref}"`);
  return resolved;
}

function typeMatches(value: unknown, type: string): boolean {
  switch (type) {
    case "object":
      return typeof value === "object" && value !== null && !Array.isArray(value);
    case "array":
      return Array.isArray(value);
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number";
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "boolean":
      return typeof value === "boolean";
    case "null":
      return value === null;
    default:
      return true;
  }
}

/** Collect mismatches of `value` against `node`; empty array = valid (for this subset). */
export function checkAgainstSchema(
  value: unknown,
  node: SchemaNode,
  root: RootSchema,
  path = "$",
): string[] {
  const schema = resolve(node, root);
  const errors: string[] = [];

  if (schema.anyOf !== undefined) {
    const branchErrors = schema.anyOf.map((branch) => checkAgainstSchema(value, branch, root, path));
    if (!branchErrors.some((errs) => errs.length === 0)) {
      errors.push(`${path}: no anyOf branch matched (${branchErrors.map((e) => e[0]).join(" | ")})`);
    }
    return errors;
  }

  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${path}: expected const ${JSON.stringify(schema.const)}, got ${JSON.stringify(value)}`);
  }
  if (schema.enum !== undefined && !schema.enum.includes(value)) {
    errors.push(`${path}: ${JSON.stringify(value)} not in enum`);
  }
  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => typeMatches(value, type))) {
      errors.push(`${path}: expected type ${types.join("|")}, got ${JSON.stringify(value)}`);
      return errors;
    }
  }

  if (Array.isArray(value) && schema.items !== undefined) {
    value.forEach((item, index) => {
      errors.push(...checkAgainstSchema(item, schema.items as SchemaNode, root, `${path}[${index}]`));
    });
  }

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    for (const required of schema.required ?? []) {
      if (!(required in record)) errors.push(`${path}: missing required key "${required}"`);
    }
    for (const key of Object.keys(record)) {
      const propSchema = schema.properties?.[key];
      if (propSchema !== undefined) {
        errors.push(...checkAgainstSchema(record[key], propSchema, root, `${path}.${key}`));
        continue;
      }
      if (schema.additionalProperties === false) {
        errors.push(`${path}: key "${key}" not allowed (additionalProperties: false)`);
      } else if (typeof schema.additionalProperties === "object") {
        errors.push(...checkAgainstSchema(record[key], schema.additionalProperties, root, `${path}.${key}`));
      }
    }
  }

  return errors;
}

/** Build a plain settings object from merge-tier KeyPathPatch entries (for oracle validation). */
export function materializePatch(
  patch: readonly { keyPath: readonly (string | number)[]; value: unknown }[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const entry of patch) {
    let cursor: Record<string, unknown> = out;
    entry.keyPath.slice(0, -1).forEach((segment) => {
      const key = String(segment);
      const next = cursor[key];
      if (typeof next === "object" && next !== null) {
        cursor = next as Record<string, unknown>;
        return;
      }
      const created: Record<string, unknown> = {};
      cursor[key] = created;
      cursor = created;
    });
    const leaf = entry.keyPath.at(-1);
    if (leaf !== undefined) cursor[String(leaf)] = entry.value;
  }
  return out;
}
