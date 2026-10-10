import type { Database } from "@/integrations/supabase/types";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Trade } from "@/types/trade";
import { toast } from "sonner";

const CAMPOS_BINARIAS = [
  "plataforma", "broker", "modo", "origen", "bot", "estrategia", "categoria_estrategia", "senal",
  "payout_pct", "expiracion_seg", "precio_entrada", "precio_cierre", "estado", "ciclo_id", "paso",
  "tipo_paso", "id_externo", "ema_senal", "contexto_15m", "estado_emocional", "intensidad_emocional",
  "cumplio_reglas", "sesion_id",
] as const;

function soloDefinidos(t: Trade): Partial<Database["public"]["Tables"]["trades"]["Insert"]> {
  const out: Record<string, unknown> = {};
  for (const campo of CAMPOS_BINARIAS) {
    const v = t[campo];
    if (v !== undefined && v !== null && v !== "") out[campo] = v;
  }
  return out as Partial<Database["public"]["Tables"]["trades"]["Insert"]>;
}

export function useTrades() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrades = useCallback(async () => {
    if (!user) {
      setTrades([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .order("fecha_entrada", { ascending: false });

    if (error) {
      console.error("Error fetching trades:", error);
      toast.error("Error al cargar operaciones");
    } else {
      // Map database fields to Trade interface
      const mappedTrades: Trade[] = (data || []).map((t) => ({
        id: t.id,
        fecha_entrada: t.fecha_entrada,
        fecha_salida: t.fecha_salida,
        instrumento: t.instrumento,
        moneda: t.moneda,
        direccion: t.direccion as "Compra" | "Venta",
        stake_usd: Number(t.stake_usd),
        resultado_usd: Number(t.resultado_usd),
        saldo_antes: Number(t.saldo_antes),
        saldo_despues: Number(t.saldo_despues),
        riesgo_pct_cuenta: Number(t.riesgo_pct_cuenta) || 0,
        resultado_pct_cuenta: Number(t.resultado_pct_cuenta) || 0,
        tf_principal: t.tf_principal || "",
        contexto_1h: t.contexto_1h || "",
        posicion_en_canal: t.posicion_en_canal || "",
        tipo_setup: t.tipo_setup || "",
        entrada_por: t.entrada_por || "",
        stop_plan_usd: Number(t.stop_plan_usd) || 0,
        tp_plan_usd: Number(t.tp_plan_usd) || 0,
        motivo_salida: t.motivo_salida || "",
        notas: t.notas || "",
        plataforma: t.plataforma || "Deriv",
        broker: t.broker ?? undefined,
        modo: t.modo ?? undefined,
        origen: t.origen ?? undefined,
        bot: t.bot ?? undefined,
        estrategia: t.estrategia ?? undefined,
        categoria_estrategia: t.categoria_estrategia ?? undefined,
        senal: t.senal ?? undefined,
        payout_pct: t.payout_pct == null ? undefined : Number(t.payout_pct),
        expiracion_seg: t.expiracion_seg == null ? undefined : Number(t.expiracion_seg),
        precio_entrada: t.precio_entrada == null ? undefined : Number(t.precio_entrada),
        precio_cierre: t.precio_cierre == null ? undefined : Number(t.precio_cierre),
        estado: t.estado ?? undefined,
        ciclo_id: t.ciclo_id ?? undefined,
        paso: t.paso == null ? undefined : Number(t.paso),
        tipo_paso: (t.tipo_paso as Trade["tipo_paso"]) ?? undefined,
        id_externo: t.id_externo ?? undefined,
        ema_senal: t.ema_senal ?? undefined,
        contexto_15m: t.contexto_15m ?? undefined,
        estado_emocional: t.estado_emocional ?? undefined,
        intensidad_emocional: t.intensidad_emocional == null ? undefined : Number(t.intensidad_emocional),
        cumplio_reglas: t.cumplio_reglas,
        sesion_id: t.sesion_id ?? undefined,
      }));
      setTrades(mappedTrades);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  const importTrades = async (newTrades: Trade[]) => {
    if (!user) {
      toast.error("Debes iniciar sesión para importar trades");
      return;
    }

    // Prepare trades for insertion
    const tradesToInsert = newTrades.map((t) => ({
      id: t.id,
      user_id: user.id,
      fecha_entrada: t.fecha_entrada,
      fecha_salida: t.fecha_salida,
      instrumento: t.instrumento,
      moneda: t.moneda || "USD",
      direccion: t.direccion,
      stake_usd: t.stake_usd,
      resultado_usd: t.resultado_usd,
      saldo_antes: t.saldo_antes,
      saldo_despues: t.saldo_despues,
      riesgo_pct_cuenta: t.riesgo_pct_cuenta || null,
      resultado_pct_cuenta: t.resultado_pct_cuenta || null,
      tf_principal: t.tf_principal || null,
      contexto_1h: t.contexto_1h || null,
      posicion_en_canal: t.posicion_en_canal || null,
      tipo_setup: t.tipo_setup || null,
      entrada_por: t.entrada_por || null,
      stop_plan_usd: t.stop_plan_usd || null,
      tp_plan_usd: t.tp_plan_usd || null,
      motivo_salida: t.motivo_salida || null,
      notas: t.notas || null,
      // Campos nuevos solo si vienen con valor: así el importador sigue funcionando
      // aunque la migración de IQ Option aún no se haya aplicado en Supabase.
      ...soloDefinidos(t),
    }));

    const { error } = await supabase
      .from("trades")
      .upsert(tradesToInsert, { onConflict: "id" });

    if (error) {
      console.error("Error importing trades:", error);
      toast.error("Error al importar operaciones");
    } else {
      toast.success(`${newTrades.length} trade(s) importado(s)`);
      await fetchTrades();
    }
  };

  const deleteTrade = async (tradeId: string) => {
    const { error } = await supabase
      .from("trades")
      .delete()
      .eq("id", tradeId);

    if (error) {
      console.error("Error deleting trade:", error);
      toast.error("Error al eliminar operación");
    } else {
      toast.success("Operación eliminada");
      await fetchTrades();
    }
  };

  const updateTrade = async (tradeId: string, updates: Partial<Trade>) => {
    if (!user) {
      toast.error("Debes iniciar sesión para editar trades");
      return false;
    }

    // Build update object with only the fields that were provided
    const updateData: Database["public"]["Tables"]["trades"]["Update"] = {};
    
    if ('motivo_salida' in updates) {
      updateData.motivo_salida = updates.motivo_salida || null;
    }
    if ('notas' in updates) {
      updateData.notas = updates.notas || null;
    }
    if ('posicion_en_canal' in updates) {
      updateData.posicion_en_canal = updates.posicion_en_canal || null;
    }
    if ('direccion' in updates) {
      updateData.direccion = updates.direccion ?? null;
    }
    if ('entrada_por' in updates) {
      updateData.entrada_por = updates.entrada_por || null;
    }
    if ('contexto_1h' in updates) {
      updateData.contexto_1h = updates.contexto_1h || null;
    }

    const { error } = await supabase
      .from("trades")
      .update(updateData)
      .eq("id", tradeId);

    if (error) {
      console.error("Error updating trade:", error);
      toast.error("Error al actualizar operación");
      return false;
    } else {
      toast.success("Operación actualizada");
      await fetchTrades();
      return true;
    }
  };

  const deleteAllTrades = async () => {
    if (!user) {
      toast.error("Debes iniciar sesión para borrar trades");
      return false;
    }

    const { error } = await supabase
      .from("trades")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting all trades:", error);
      toast.error("Error al borrar historial");
      return false;
    } else {
      toast.success("Historial borrado correctamente");
      setTrades([]);
      return true;
    }
  };

  return { trades, loading, importTrades, deleteTrade, updateTrade, deleteAllTrades, refetch: fetchTrades };
}
