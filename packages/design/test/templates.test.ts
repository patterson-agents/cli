/**
 * E-P3 — design snapshot API + template materializer tests, against the REAL
 * vendored snapshot (no fixtures: the snapshot IS the fixture, byte-verified
 * at pull time).
 */
import { describe, expect, test } from "bun:test";

import {
  getDesignTemplate,
  listDesignTemplates,
  loadDsManifest,
  materializeDesignTemplate,
  SHARED_ASSETS_DIR,
  snapshotInfo,
} from "../src/index.ts";

describe("snapshot info (FR-014)", () => {
  test("reports pulledAt, projectId and a non-negative age", async () => {
    const info = await snapshotInfo();
    expect(info.projectId).toBe("3534f94f-a7e6-4612-81d4-6e830716f07d");
    expect(info.pulledAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(info.fileCount).toBeGreaterThan(100);
    expect(info.ageDays).toBeGreaterThanOrEqual(0);
  });

  test("age is computed in whole days from pulledAt", async () => {
    const info = await snapshotInfo(new Date("2099-01-01T12:00:00Z"));
    expect(info.ageDays).toBeGreaterThan(365 * 20);
  });
});

describe("design template listing", () => {
  test("lists every manifest template with a folder-derived slug", async () => {
    const manifest = await loadDsManifest();
    const templates = await listDesignTemplates();
    expect(templates.length).toBe(manifest.templates.length);
    expect(templates.length).toBe(11);
    for (const template of templates) {
      expect(template.folder.endsWith(`/${template.name}`)).toBe(true);
      expect(template.label.length).toBeGreaterThan(0);
    }
    // Slug-sorted, unique.
    const names = templates.map((t) => t.name);
    expect(names).toEqual([...names].toSorted());
    expect(new Set(names).size).toBe(names.length);
  });

  test("getDesignTemplate resolves a known slug and rejects unknowns", async () => {
    const docs = await getDesignTemplate("docs-site");
    expect(docs?.label).toBe("Docs Site");
    expect(await getDesignTemplate("no-such-template")).toBeNull();
  });
});

describe("materializeDesignTemplate", () => {
  test("docs-site: template files at root, shared assets under design-system/, refs rewritten", async () => {
    const { files, warnings } = await materializeDesignTemplate("docs-site");
    const paths = files.map((file) => file.path);

    expect(paths).toContain("index.html");
    expect(paths).toContain(`${SHARED_ASSETS_DIR}/styles.css`);
    expect(paths).not.toContain(".thumbnail");

    const index = files.find((file) => file.path === "index.html");
    expect(index?.content).toContain(`${SHARED_ASSETS_DIR}/styles.css`);
    expect(index?.content).not.toContain("../../styles.css");

    // Deterministic ordering.
    expect(paths).toEqual([...paths].toSorted());
    // Missing-asset warnings never fail materialization.
    expect(Array.isArray(warnings)).toBe(true);
  });

  test("every listed template materializes without throwing", async () => {
    for (const template of await listDesignTemplates()) {
      const { files } = await materializeDesignTemplate(template.name);
      expect(files.length).toBeGreaterThan(0);
    }
  });

  test("missing shared assets produce warnings, not failures", async () => {
    // corporate-page references brand images absent from the snapshot
    // (CORS-restricted at pull time — assets/brand/README.md).
    const { warnings } = await materializeDesignTemplate("corporate-page");
    expect(warnings.some((warning) => warning.includes("missing from the vendored snapshot"))).toBe(
      true,
    );
  });

  test("unknown slug throws with the available list", async () => {
    expect(materializeDesignTemplate("nope")).rejects.toThrow(/Available:.*docs-site/);
  });
});
