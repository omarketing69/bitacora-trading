import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Trade } from "@/types/trade";
import { toast } from "sonner";

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

    const { error } = await supabase
      .from("trades")
      .update({
        motivo_salida: updates.motivo_salida ?? null,
        notas: updates.notas ?? null,
      })
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

  return { trades, loading, importTrades, deleteTrade, updateTrade, refetch: fetchTrades };
}
