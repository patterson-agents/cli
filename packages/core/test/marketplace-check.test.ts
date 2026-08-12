/**
 * `marketplace.manifests-diverged` — the drift check behind the dual-manifest
 * emission convention (spec 002).
 *
 * Verified fact (Constitution V): githubnext/ado-aw ships
 * `.claude-plugin/marketplace.json` and `.github/plugin/marketplace.json` with
 * identical bytes (both sha256 f7010cf379fbc2977a06fc099de8c34b80a0a1e6197491a23eccafa03cf1630e,
 * confirmed with `cmp` against the vendored copy under
 * patterson-agents.archive/vendored/github.com/githubnext/ado-aw/). Cross-vendor
 * support is a copy, not a transform — so a byte difference between the two is
 * a defect, and this check is what reports it.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  MARKETPLACE_MANIFEST_PATHS,
  marketplaceChecks,
  marketplaceManifestsDivergedCheck,
} from "../src/checks/index.ts";

const dirs: string[] = [];
async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "patterson-mkt-check-"));
  dirs.push(dir);
  return dir;
}
afterEach(async () => {
  while (dirs.length > 0) await rm(dirs.pop() as string, { recursive: true, force: true });
});

const MANIFEST = `${JSON.stringify({ name: "demo", plugins: [] }, null, 2)}\n`;

async function seed(root: string, claude: string | null, github: string | null): Promise<void> {
  if (claude !== null) await Bun.write(join(root, MARKETPLACE_MANIFEST_PATHS.claude), claude);
  if (github !== null) await Bun.write(join(root, MARKETPLACE_MANIFEST_PATHS.github), github);
}

describe("marketplace.manifests-diverged", () => {
  test("is registered in the marketplaceChecks export with a stable id", () => {
    expect(marketplaceManifestsDivergedCheck.id).toBe("marketplace.manifests-diverged");
    expect(marketplaceChecks).toContain(marketplaceManifestsDivergedCheck);
  });

  test("both manifests byte-identical: no findings", async () => {
    const root = await tempDir();
    await seed(root, MANIFEST, MANIFEST);
    expect(await marketplaceManifestsDivergedCheck.run({ cwd: root })).toEqual([]);
  });

  test("both manifests exist and differ: one error finding naming both paths", async () => {
    const root = await tempDir();
    await seed(root, MANIFEST, MANIFEST.replace('"demo"', '"drifted"'));
    const findings = await marketplaceManifestsDivergedCheck.run({ cwd: root });
    expect(findings).toHaveLength(1);
    const finding = findings[0];
    expect(finding?.severity).toBe("error");
    expect(finding?.message).toContain(MARKETPLACE_MANIFEST_PATHS.claude);
    expect(finding?.message).toContain(MARKETPLACE_MANIFEST_PATHS.github);
    expect(finding?.path).toBe(MARKETPLACE_MANIFEST_PATHS.claude);
    expect(finding?.fix).toBeTruthy();
  });

  test("whitespace-only difference still counts (byte identity, not JSON equality)", async () => {
    const root = await tempDir();
    await seed(root, MANIFEST, `${MANIFEST}\n`);
    const findings = await marketplaceManifestsDivergedCheck.run({ cwd: root });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("error");
  });

  test("only one manifest present: silent (single-path repos are legal)", async () => {
    const onlyClaude = await tempDir();
    await seed(onlyClaude, MANIFEST, null);
    expect(await marketplaceManifestsDivergedCheck.run({ cwd: onlyClaude })).toEqual([]);

    const onlyGithub = await tempDir();
    await seed(onlyGithub, null, MANIFEST);
    expect(await marketplaceManifestsDivergedCheck.run({ cwd: onlyGithub })).toEqual([]);
  });

  test("no manifests at all: silent (most projects are not marketplaces)", async () => {
    const root = await tempDir();
    expect(await marketplaceManifestsDivergedCheck.run({ cwd: root })).toEqual([]);
  });
});
