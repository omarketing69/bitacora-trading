import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";

export default defineTool({
  name: "get_trade_stats",
  title: "Get trade stats",
  description: "Summarize the signed-in user's performance: P&L, win rate, best/worst trade and profit factor.",
  inputSchema: {
    from: z.string().optional().describe("Start date (YYYY-MM-DD), inclusive."),
    to: z.string().optional().describe("End date (YYYY-MM-DD), inclusive."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    let q = supabaseForUser(ctx).from("trades").select("resultado_usd");
    if (from) q = q.gte("fecha_entrada", `${from}T00:00:00Z`);
    if (to) q = q.lte("fecha_entrada", `${to}T23:59:59Z`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const r = (data ?? []).map((t) => Number(t.resultado_usd) || 0);
    const wins = r.filter((x) => x > 0);
    const losses = r.filter((x) => x < 0);
    const grossWin = wins.reduce((a, b) => a + b, 0);
    const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0));
    const stats = {
      total_trades: r.length,
      winning_trades: wins.length,
      losing_trades: losses.length,
      win_rate_pct: r.length ? (wins.length / r.length) * 100 : 0,
      total_pnl_usd: r.reduce((a, b) => a + b, 0),
      best_trade_usd: r.length ? Math.max(...r) : 0,
      worst_trade_usd: r.length ? Math.min(...r) : 0,
      profit_factor: grossLoss > 0 ? grossWin / grossLoss : null,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(stats) }],
      structuredContent: { stats },
    };
  },
});
