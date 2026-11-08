import { createFileRoute } from "@tanstack/react-router";
import { handleMockEnterpriseRpc } from "@/lib/claims/mock-enterprise";

// Internal MCP (Streamable HTTP, JSON responses) for synthetic enterprise context.
// App authentication protects synthetic internal context; no separate insurer credential is needed.
export const Route = createFileRoute("/api/mock-enterprise-mcp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authorization = request.headers.get("authorization");
        const bearer = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
        if (!bearer) return new Response("Unauthorized", { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.auth.getUser(bearer);
        if (error || !data.user) return new Response("Unauthorized", { status: 401 });
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
