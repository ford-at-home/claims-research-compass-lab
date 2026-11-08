// Minimal MCP Streamable HTTP client (JSON-RPC 2.0): initialize, tools/list, tools/call.
/* eslint-disable @typescript-eslint/no-explicit-any */
export class McpHttpClient {
  private sessionId: string | null = null;
  private nextId = 1;
  constructor(
    private url: string,
    private headers: Record<string, string>,
  ) {}

  private async rpc(method: string, params: unknown, notify = false): Promise<any> {
    const id = notify ? undefined : this.nextId++;
    const res = await fetch(this.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        ...(this.sessionId ? { "mcp-session-id": this.sessionId } : {}),
        ...this.headers,
      },
      body: JSON.stringify({ jsonrpc: "2.0", method, params, ...(id !== undefined ? { id } : {}) }),
      signal: AbortSignal.timeout(90_000),
    });
    const sid = res.headers.get("mcp-session-id");
    if (sid) this.sessionId = sid;
    if (notify) return null;
    const text = await res.text();
    if (!res.ok) throw new Error(`MCP ${method} HTTP ${res.status}: ${text.slice(0, 300)}`);
    let msg: any = null;
    if ((res.headers.get("content-type") ?? "").includes("text/event-stream")) {
      for (const block of text.split(/\n\n/)) {
        const data = block.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("\n");
        if (!data) continue;
        try {
          const m = JSON.parse(data);
          if (m.id === id) msg = m;
        } catch {
          /* ignore */
        }
      }
    } else msg = JSON.parse(text);
    if (!msg) throw new Error(`MCP ${method}: no response for id ${id}`);
    if (msg.error) throw new Error(`MCP ${method} error ${msg.error.code}: ${msg.error.message}`);
    return msg.result;
  }

  async initialize() {
    const r = await this.rpc("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "claims-research-lab", version: "1.0.0" } });
    await this.rpc("notifications/initialized", {}, true);
    return r;
  }
  listTools() {
    return this.rpc("tools/list", {});
  }
  callTool(name: string, args: Record<string, unknown>) {
    return this.rpc("tools/call", { name, arguments: args });
  }
}

export function toolText(result: any): string {
  return (result?.content ?? []).filter((c: any) => c?.type === "text").map((c: any) => c.text).join("\n");
}

/** Fill tool arguments from its advertised inputSchema using only public values. */
export function buildToolArgs(schema: any, values: { text: string; queries: string[]; urls: string[] }): Record<string, unknown> {
  const props: Record<string, any> = schema?.properties ?? {};
  const out: Record<string, unknown> = {};
  for (const [k, p] of Object.entries(props)) {
    const isArr = p?.type === "array";
    if (/^(search_queries|queries)$/.test(k)) out[k] = values.queries;
    else if (/^urls$/.test(k)) out[k] = values.urls;
    else if (/^url$/.test(k)) out[k] = values.urls[0];
    else if (/^(objective|query|question|input|prompt|task)$/.test(k)) out[k] = isArr ? [values.text] : values.text;
  }
  return out;
}
