/**
 * JSONC key-path merger.
 *
 * Uses jsonc-parser's modify/applyEdits so comments and unknown (user-owned)
 * keys are preserved byte-for-byte outside the edited spans.
 */
import {
  applyEdits,
  findNodeAtLocation,
  getNodeValue,
  modify,
  parseTree,
  type JSONPath,
} from "jsonc-parser";

const FORMATTING = { insertSpaces: true, tabSize: 2, eol: "\n" } as const;

/**
 * Render a key path as an RFC 6901-style JSON pointer for provenance records
 * ("~" → "~0", "/" → "~1"), e.g. ["mcpServers","docs"] → "/mcpServers/docs".
 */
export function formatKeyPath(path: readonly (string | number)[]): string {
  return `/${path.map((segment) => String(segment).replaceAll("~", "~0").replaceAll("/", "~1")).join("/")}`;
}

/** Read the current value at a key path in a JSONC document. */
export function readValueAt(text: string, path: readonly (string | number)[]): { present: boolean; value?: unknown } {
  const tree = parseTree(text, undefined, { allowTrailingComma: true });
  if (!tree) return { present: false };
  const node = findNodeAtLocation(tree, [...path] as JSONPath);
  if (!node) return { present: false };
  return { present: true, value: getNodeValue(node) as unknown };
}

/** Set (or create) the value at a key path, preserving comments and formatting. */
export function setValueAt(text: string, path: readonly (string | number)[], value: unknown): string {
  const edits = modify(text, [...path] as JSONPath, value, { formattingOptions: { ...FORMATTING } });
  return applyEdits(text, edits);
}
