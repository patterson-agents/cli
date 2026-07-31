/**
 * Shared JSON-RPC/MCP handshake validator (E-P5; imported by the mcp-server
 * generator's post-validation and by the P7 tutor's mcp track).
 *
 * Spawns a stdio MCP server and walks the wire protocol a real host walks:
 * initialize → notifications/initialized → tools/list → (optional)
 * tools/call. Pure observation — a structured report, never an exception,
 * comes back for both healthy and broken servers.
 */

export interface HandshakeStep {
  step: "spawn" | "initialize" | "tools/list" | "tools/call";
  ok: boolean;
  detail?: string;
}

export interface HandshakeReport {
  ok: boolean;
  steps: HandshakeStep[];
  /** Tool names from tools/list (empty when that step failed). */
  tools: string[];
  protocolVersion?: string;
  serverName?: string;
}

export interface HandshakeOptions {
  cwd?: string;
  /** Per-request timeout (default 10s). */
  timeoutMs?: number;
  /** When set, a tools/call round-trip is attempted with these arguments. */
  call?: { tool: string; args: Record<string, unknown> };
  /** Protocol version to request (default: the S1-verified 2025-11-25). */
  protocolVersion?: string;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id?: number;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

/** Validate a stdio MCP server end-to-end. argv example: ["bun", "src/index.ts"]. */
export async function validateMcpHandshake(
  argv: [string, ...string[]],
  options: HandshakeOptions = {},
): Promise<HandshakeReport> {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const steps: HandshakeStep[] = [];
  const report: HandshakeReport = { ok: false, steps, tools: [] };

  let proc: Bun.Subprocess<"pipe", "pipe", "pipe">;
  try {
    proc = Bun.spawn(argv, {
      cwd: options.cwd ?? process.cwd(),
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });
    steps.push({ step: "spawn", ok: true });
  } catch (cause) {
    steps.push({
      step: "spawn",
      ok: false,
      detail: cause instanceof Error ? cause.message : String(cause),
    });
    return report;
  }

  let buffer = "";
  let nextId = 1;
  const pending = new Map<number, (msg: JsonRpcResponse) => void>();
  const readLoop = (async () => {
    const decoder = new TextDecoder();
    for await (const chunk of proc.stdout) {
      buffer += decoder.decode(chunk, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (line.length === 0) continue;
        try {
          const msg = JSON.parse(line) as JsonRpcResponse;
          if (typeof msg.id === "number") pending.get(msg.id)?.(msg);
        } catch {
          // Non-JSON on stdout is itself a protocol violation; initialize
          // will time out and report it.
        }
      }
    }
  })();
  void readLoop;

  function request(method: string, params?: Record<string, unknown>): Promise<JsonRpcResponse | null> {
    const id = nextId++;
    return new Promise((resolve) => {
      pending.set(id, (msg) => {
        pending.delete(id);
        resolve(msg);
      });
      setTimeout(() => {
        if (pending.delete(id)) resolve(null);
      }, timeoutMs);
      proc.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, ...(params ? { params } : {}) })}\n`);
    });
  }

  try {
    const init = await request("initialize", {
      protocolVersion: options.protocolVersion ?? "2025-11-25",
      capabilities: {},
      clientInfo: { name: "patterson-handshake-validator", version: "1.0.0" },
    });
    if (!init || init.error) {
      steps.push({
        step: "initialize",
        ok: false,
        detail: init?.error?.message ?? `no response within ${timeoutMs}ms`,
      });
      return report;
    }
    const initResult = init.result as {
      protocolVersion?: string;
      serverInfo?: { name?: string };
    };
    report.protocolVersion = initResult.protocolVersion;
    report.serverName = initResult.serverInfo?.name;
    steps.push({ step: "initialize", ok: true, detail: `protocol ${initResult.protocolVersion}` });
    proc.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);

    const list = await request("tools/list", {});
    if (!list || list.error) {
      steps.push({
        step: "tools/list",
        ok: false,
        detail: list?.error?.message ?? `no response within ${timeoutMs}ms`,
      });
      return report;
    }
    const tools = (list.result as { tools?: { name: string }[] }).tools ?? [];
    report.tools = tools.map((tool) => tool.name);
    steps.push({ step: "tools/list", ok: true, detail: `${tools.length} tool(s)` });

    if (options.call) {
      const call = await request("tools/call", {
        name: options.call.tool,
        arguments: options.call.args,
      });
      const callResult = call?.result as { isError?: boolean } | undefined;
      const callOk = call !== null && !call.error && !(callResult?.isError ?? false);
      steps.push({
        step: "tools/call",
        ok: callOk,
        detail: call?.error?.message ?? (callOk ? options.call.tool : "tool returned isError"),
      });
      if (!callOk) return report;
    }

    report.ok = true;
    return report;
  } finally {
    proc.kill();
    await proc.exited;
  }
}
