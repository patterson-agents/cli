// S1 spike verification (1): scripted raw JSON-RPC stdio client against
// spike/server.ts. Deliberately does NOT use the SDK Client class — the point
// is to observe the wire behavior a real MCP host would see.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";

const SERVER_PATH = new URL("./server.ts", import.meta.url).pathname;

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id?: number;
  result?: Record<string, unknown>;
  error?: { code: number; message: string; data?: unknown };
}

/** Minimal newline-delimited JSON-RPC client over a spawned stdio server. */
class RawStdioClient {
  private proc: Bun.Subprocess<"pipe", "pipe", "pipe">;
  private buffer = "";
  private nextId = 1;
  private pending = new Map<number, (msg: JsonRpcResponse) => void>();

  constructor() {
    this.proc = Bun.spawn(["bun", SERVER_PATH], {
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

  request(
    method: string,
    params?: Record<string, unknown>,
    timeoutMs = 5_000,
  ): Promise<JsonRpcResponse> {
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

const CLIENT_INFO = { name: "s1-spike-raw-client", version: "0.0.1" };

describe("S1 spike: initialize → tools/list → tools/call over raw stdio", () => {
  let client: RawStdioClient;

  beforeAll(() => {
    client = new RawStdioClient();
  });

  afterAll(async () => {
    await client.close();
  });

  test("initialize negotiates the requested (supported) protocol version", async () => {
    const res = await client.request("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: CLIENT_INFO,
    });
    expect(res.error).toBeUndefined();
    const result = res.result as {
      protocolVersion: string;
      serverInfo: { name: string; version: string };
      capabilities: Record<string, unknown>;
    };
    expect(result.protocolVersion).toBe("2025-06-18");
    expect(result.serverInfo.name).toBe("patterson-spike");
    expect(result.capabilities).toHaveProperty("tools");
    client.notify("notifications/initialized");
  });

  test("tools/list exposes both dummy tools with JSON Schema inputs and annotations", async () => {
    const res = await client.request("tools/list", {});
    expect(res.error).toBeUndefined();
    const tools = (res.result as {
      tools: {
        name: string;
        description?: string;
        inputSchema: { type: string; properties?: Record<string, unknown>; required?: string[] };
        annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean };
      }[];
    }).tools;
    expect(tools.map((t) => t.name).toSorted()).toEqual([
      "patterson_spike_add",
      "patterson_spike_echo",
    ]);

    const add = tools.find((t) => t.name === "patterson_spike_add");
    expect(add).toBeDefined();
    expect(add?.inputSchema.type).toBe("object");
    expect(Object.keys(add?.inputSchema.properties ?? {}).toSorted()).toEqual(["a", "b"]);
    expect(add?.inputSchema.required?.toSorted()).toEqual(["a", "b"]);
    expect(add?.annotations?.readOnlyHint).toBe(true);

    const echo = tools.find((t) => t.name === "patterson_spike_echo");
    expect(echo).toBeDefined();
    expect(Object.keys(echo?.inputSchema.properties ?? {}).toSorted()).toEqual([
      "message",
      "upper",
    ]);
    expect(echo?.inputSchema.required).toEqual(["message"]);
  });

  test("tools/call patterson_spike_add returns the sum", async () => {
    const res = await client.request("tools/call", {
      name: "patterson_spike_add",
      arguments: { a: 2, b: 3 },
    });
    expect(res.error).toBeUndefined();
    const result = res.result as {
      content: { type: string; text?: string }[];
      isError?: boolean;
    };
    expect(result.isError ?? false).toBe(false);
    expect(result.content).toEqual([{ type: "text", text: "5" }]);
  });

  test("tools/call patterson_spike_echo honors optional flag", async () => {
    const res = await client.request("tools/call", {
      name: "patterson_spike_echo",
      arguments: { message: "hello patterson", upper: true },
    });
    expect(res.error).toBeUndefined();
    const result = res.result as { content: { type: string; text?: string }[] };
    expect(result.content).toEqual([{ type: "text", text: "HELLO PATTERSON" }]);
  });

  test("tools/call with zod-invalid arguments is rejected, not silently accepted", async () => {
    const res = await client.request("tools/call", {
      name: "patterson_spike_add",
      arguments: { a: "not-a-number", b: 3 },
    });
    // Observed sdk@1.30.0 behavior: zod validation failure comes back as an
    // isError:true tool RESULT (text "MCP error -32602: Input validation
    // error: ..."), NOT as a JSON-RPC protocol-level error object.
    expect(res.error).toBeUndefined();
    const result = res.result as {
      content: { type: string; text?: string }[];
      isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("-32602");
    expect(result.content[0]?.text).toContain("patterson_spike_add");
  });
});

describe("S1 spike: future-client version negotiation", () => {
  test("a 2026-07-28-era client is answered with the SDK's latest supported version", async () => {
    const client = new RawStdioClient();
    try {
      const res = await client.request("initialize", {
        protocolVersion: "2026-07-28",
        capabilities: {},
        clientInfo: CLIENT_INFO,
      });
      expect(res.error).toBeUndefined();
      const result = res.result as { protocolVersion: string };
      // sdk@1.30.0: SUPPORTED_PROTOCOL_VERSIONS = [2025-11-25, 2025-06-18,
      // 2025-03-26, 2024-11-05, 2024-10-07]; unknown requested versions fall
      // back to LATEST_PROTOCOL_VERSION. Per spec the client then decides
      // whether to proceed — real Claude Code accepts this (see research.md S1).
      expect(result.protocolVersion).toBe("2025-11-25");
    } finally {
      await client.close();
    }
  });
});
