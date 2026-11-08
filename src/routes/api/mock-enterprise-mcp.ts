import { createFileRoute } from "@tanstack/react-router";
import { handleMockEnterpriseRpc } from "@/lib/claims/mock-enterprise";

// Internal MCP (Streamable HTTP, JSON responses) for synthetic enterprise context.
// Only the app backend holds the token; it is never sent to Parallel or the browser.
export const Route = createFileRoute("/api/mock-enterprise-mcp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env["MOCK_ENTERPRISE_MCP_TOKEN"];
        if (!token || request.headers.get("x-mock-enterprise-token") !== token) return new Response("Unauthorized", { status: 401 });
        let msg: unknown;
        try {
          msg = await request.json();
        } catch {
          return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400 });
        }
        const out = handleMockEnterpriseRpc(msg);
        if (out === null) return new Response(null, { status: 202 });
        return Response.json(out, { headers: { "mcp-session-id": "mock-enterprise-session" } });
      },
    },
  },
});
