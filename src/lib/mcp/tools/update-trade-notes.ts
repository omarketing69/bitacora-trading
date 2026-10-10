import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";
import { toTradeJson } from "../trade-json";

export default defineTool({
  name: "update_trade_notes",
  title: "Update trade notes",
  description: "Update the asset type, direction, entry reason, context, exit reason or notes of one of the user's trades.",
  inputSchema: {
    id: z.string().min(1).describe("Trade ID."),
    tipo_activo: z.string().optional().describe("Asset, e.g. 'Boom 1000' or 'Crash 1000'."),
    direccion: z.enum(["Compra", "Venta"]).optional().describe("Trade direction."),
    entrada_por: z.string().optional().describe("Entry reason."),
    contexto: z.string().optional().describe("Technical context."),
    motivo_salida: z.string().optional().describe("Exit reason."),
    notas: z.string().optional().describe("Free-form notes."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    const update: Record<string, string> = {};
    if (input.tipo_activo !== undefined) update.posicion_en_canal = input.tipo_activo;
    if (input.direccion !== undefined) update.direccion = input.direccion;
    if (input.entrada_por !== undefined) update.entrada_por = input.entrada_por;
    if (input.contexto !== undefined) update.contexto_1h = input.contexto;
    if (input.motivo_salida !== undefined) update.motivo_salida = input.motivo_salida;
    if (input.notas !== undefined) update.notas = input.notas;
    if (Object.keys(update).length === 0) {
      return { content: [{ type: "text", text: "No fields to update" }], isError: true };
    }
    const { data, error } = await supabaseForUser(ctx)
      .from("trades")
      .update(update)
      .eq("id", input.id)
      .select()
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Trade not found" }], isError: true };
    const trade = toTradeJson(data);
    return {
      content: [{ type: "text", text: JSON.stringify(trade) }],
      structuredContent: { trade },
    };
  },
});
