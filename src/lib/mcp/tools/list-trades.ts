import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";
import { toTradeJson } from "../trade-json";

export default defineTool({
  name: "list_trades",
  title: "List trades",
  description: "List the signed-in user's trades, newest first, optionally filtered by date range.",
  inputSchema: {
    from: z.string().optional().describe("Start date (YYYY-MM-DD), inclusive."),
    to: z.string().optional().describe("End date (YYYY-MM-DD), inclusive."),
    limit: z.number().int().min(1).max(200).optional().describe("Max trades to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    let q = supabaseForUser(ctx)
      .from("trades")
      .select("*")
      .order("fecha_entrada", { ascending: false })
      .limit(limit ?? 50);
    if (from) q = q.gte("fecha_entrada", `${from}T00:00:00Z`);
    if (to) q = q.lte("fecha_entrada", `${to}T23:59:59Z`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const trades = (data ?? []).map(toTradeJson);
    return {
      content: [{ type: "text", text: JSON.stringify(trades) }],
      structuredContent: { trades },
    };
  },
});
