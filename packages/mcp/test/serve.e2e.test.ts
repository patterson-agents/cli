/**
 * E-P4 — production `mcp serve` E2E (verification 7): a scripted raw stdio
 * client round-trips initialize / tools/list / tools/call against the REAL
 * server entry (packages/mcp/src/index.ts) running in a scaffolded project.
 *
 * Also proves the non-interactive contract: a command that would prompt
 * (create without --yes) returns a structured decision-required payload
 * naming the resolving flag — never a hang, never a prompt.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SERVER_PATH = new URL("../src/index.ts", import.meta.url).pathname;

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id?: number;
  result?: Record<string, unknown>;
  error?: { code: number; message: string; data?: unknown };
}

class RawStdioClient {
  private proc: Bun.Subprocess<"pipe", "pipe", "pipe">;
  private buffer = "";
  private nextId = 1;
  private pending = new Map<number, (msg: JsonRpcResponse) => void>();

  constructor(cwd: string) {
    this.proc = Bun.spawn(["bun", SERVER_PATH], {
      cwd,
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });
    void this.readLoop();
  }

  private async readLoop(): Promise<void> {
    const decoder = new TextDecoder();
    for await (const chunk of this.proc.stdout) {
      this.buffer += decoder.decode(chunk, { stream: true });
      let idx: number;
      while ((idx = this.buffer.indexOf("\n")) !== -1) {
        const line = this.buffer.slice(0, idx).trim();
        this.buffer = this.buffer.slice(idx + 1);
        if (line.length === 0) continue;
        const msg = JSON.parse(line) as JsonRpcResponse;
        if (typeof msg.id === "number") {
          const resolve = this.pending.get(msg.id);
          if (resolve) {
            this.pending.delete(msg.id);
            resolve(msg);
          }
        }
      }
    }
  }

  private write(payload: Record<string, unknown>): void {
    this.proc.stdin.write(`${JSON.stringify(payload)}\n`);
  }

  request(method: string, params?: Record<string, unknown>, timeoutMs = 15_000): Promise<JsonRpcResponse> {
    const id = this.nextId++;
    const response = new Promise<JsonRpcResponse>((resolve, reject) => {
      this.pending.set(id, resolve);
      setTimeout(() => {
        if (this.pending.delete(id)) {
          reject(new Error(`timeout waiting for response to ${method} (id ${id})`));
        }
      }, timeoutMs);
    });
    this.write({ jsonrpc: "2.0", id, method, ...(params ? { params } : {}) });
    return response;
  }

  notify(method: string, params?: Record<string, unknown>): void {
    this.write({ jsonrpc: "2.0", method, ...(params ? { params } : {}) });
  }

  async close(): Promise<void> {
    this.proc.kill();
    await this.proc.exited;
  }
}

function toolText(res: JsonRpcResponse): { isError: boolean; body: Record<string, unknown> } {
  const result = res.result as { content: { type: string; text: string }[]; isError?: boolean };
  const text = result.content[0]?.text ?? "{}";
  return { isError: result.isError ?? false, body: JSON.parse(text) as Record<string, unknown> };
}

let root: string;
let client: RawStdioClient;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "patterson-mcp-e2e-"));
  await Bun.write(
    join(root, "patterson.config.ts"),
    [
      'import type { PattersonProjectInput } from "@patterson/core";',
      "const config: PattersonProjectInput = {",
      '  version: 1, name: "mcp-e2e", targets: ["claude-code"],',
      '  instructions: [{ id: "core", body: "Test everything.", reach: "universal" }],',
      "};",
      "export default config;",
    ].join("\n"),
  );
  client = new RawStdioClient(root);
  const init = await client.request("initialize", {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "p4-e2e-client", version: "0.0.1" },
  });
  expect(init.error).toBeUndefined();
  client.notify("notifications/initialized");
});

afterAll(async () => {
  await client.close();
  await rm(root, { recursive: true, force: true });
});

describe("mcp serve (production registry over stdio)", () => {
  test("tools/list exposes every registry command, deterministically ordered", async () => {
    const res = await client.request("tools/list", {});
    expect(res.error).toBeUndefined();
    const tools = (res.result as { tools: { name: string; annotations?: Record<string, unknown> }[] })
      .tools;
    const names = tools.map((tool) => tool.name);
    expect(names).toEqual([
      "patterson_check",
      "patterson_create",
      "patterson_design_refresh",
      "patterson_design_templates",
      "patterson_design_tokens",
      "patterson_doctor",
      "patterson_init",
      "patterson_new_claude_plugin",
      "patterson_new_cli_plugin",
      "patterson_new_command",
      "patterson_new_marketplace",
      "patterson_new_mcp_server",
      "patterson_new_plugin",
      "patterson_new_skill",
      "patterson_plugins_marketplace_list",
      "patterson_skills_add",
      "patterson_skills_list",
      "patterson_skills_remove",
      "patterson_sync",
      "patterson_tutor_list",
      "patterson_tutor_next",
      "patterson_tutor_status",
    ]);
    // Read/write annotations survive projection.
    const doctor = tools.find((tool) => tool.name === "patterson_doctor");
    expect(doctor?.annotations?.["readOnlyHint"]).toBe(true);
    const create = tools.find((tool) => tool.name === "patterson_create");
    expect(create?.annotations?.["destructiveHint"]).toBe(true);
  });

  test("patterson_sync then patterson_doctor run ok against the project", async () => {
    const synced = toolText(await client.request("tools/call", { name: "patterson_sync", arguments: {} }));
    expect(synced.isError).toBe(false);
    expect(synced.body["kind"]).toBe("ok");

    const doctored = toolText(
      await client.request("tools/call", { name: "patterson_doctor", arguments: {} }),
    );
    expect(doctored.isError).toBe(false);
    const value = doctored.body["value"] as { ok: boolean };
    expect(value.ok).toBe(true);
  });

  test("a would-prompt command returns structured decision-required, never hangs", async () => {
    const res = toolText(
      await client.request("tools/call", {
        name: "patterson_create",
        arguments: { dir: join(root, "sub"), yes: false },
      }),
    );
    expect(res.isError).toBe(true);
    expect(res.body["kind"]).toBe("decision-required");
    const decision = res.body["decision"] as { options: { flag: string }[] };
    expect(decision.options.some((option) => option.flag === "--yes")).toBe(true);
  });

  test("design tools work over MCP (offline snapshot)", async () => {
    const res = toolText(
      await client.request("tools/call", { name: "patterson_design_templates", arguments: {} }),
    );
    expect(res.isError).toBe(false);
    const value = res.body["value"] as { templates: unknown[] };
    expect(value.templates.length).toBe(11);
  });
});
