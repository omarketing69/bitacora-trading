import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import type { Trade } from "@/types/trade";
import { toast } from "sonner";
import { ESTADO_ABIERTA } from "@/lib/psych/protocol";

export type PsychSession = Database["public"]["Tables"]["psych_sessions"]["Row"];
export type PsychEventType =
  | "pre_entrada"
  | "resultado"
  | "impulso"
  | "pausa_inicio"
  | "cierre"
  | "nota";

export interface ChecklistData {
  items: Record<string, boolean>;
  saldo_inicial: number;
  payout_minimo: number;
  advertencia_aceptada?: boolean;
}

export interface StartSessionInput {
  modo: "REAL" | "DEMO";
  checklist: ChecklistData;
  puntaje: number;
  emocion: string;
  intensidad: number;
}

export interface EntryInput {
  activo: string;
  direccion: "Compra" | "Venta";
  stake: number;
  payout: number;
  expiracionSeg: number;
  emaSenal: string;
  contexto15m: string;
  emocion: string;
  intensidad: number;
  cumpleReglas: boolean;
  notas?: string;
  /** Si viene, la entrada se suma a un ciclo existente como paso siguiente. */
  cicloId?: string;
  paso?: number;
  /** Para registrar una entrada que ya ocurrió (ej. confesar una entrada impulsiva). */
  fechaEntrada?: Date;
  /** Si ya se conoce el resultado, la entrada se guarda cerrada. */
  resultado?: Resultado;
}

export type Resultado = "ganada" | "perdida" | "empate";

export { ESTADO_ABIERTA };

/** P/L de una opción binaria: gana stake × payout, pierde el stake completo. */
export function calcularPnl(stake: number, payoutPct: number, resultado: Resultado): number {
  if (resultado === "ganada") return Math.round(stake * payoutPct) / 100;
  if (resultado === "perdida") return -stake;
  return 0;
}

export function usePsychSession(trades: Trade[], refetchTrades: () => Promise<void>) {
  const { user } = useAuth();
  const [session, setSession] = useState<PsychSession | null>(null);
  const [history, setHistory] = useState<PsychSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setSession(null);
      setHistory([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("psych_sessions")
      .select("*")
      .order("iniciada_en", { ascending: false })
      .limit(60);
    if (error) {
      console.error("Error cargando sesiones:", error);
      toast.error("No se pudieron cargar las sesiones del entrenador");
    } else {
      const rows = data ?? [];
      setHistory(rows);
      setSession(rows.find((s) => !s.cerrada_en) ?? null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const logEvent = useCallback(
    async (
      tipo: PsychEventType,
      extra: { emocion?: string; intensidad?: number; trade_id?: string; datos?: Json } = {},
      sesionId?: string
    ) => {
      const sid = sesionId ?? session?.id;
      if (!user || !sid) return;
      const { error } = await supabase.from("psych_events").insert({
        user_id: user.id,
        sesion_id: sid,
        tipo,
        emocion: extra.emocion ?? null,
        intensidad: extra.intensidad ?? null,
        trade_id: extra.trade_id ?? null,
        datos: extra.datos ?? {},
      });
      if (error) console.error("Error registrando evento:", error);
    },
    [user, session?.id]
  );

  const sessionTrades = session ? trades.filter((t) => t.sesion_id === session.id) : [];

  const saldoActual = (() => {
    const checklist = (session?.checklist ?? {}) as unknown as Partial<ChecklistData>;
    const inicial = Number(checklist.saldo_inicial) || 0;
    return inicial + sessionTrades.reduce((s, t) => s + (t.estado === ESTADO_ABIERTA ? 0 : t.resultado_usd), 0);
  })();

  const startSession = async (input: StartSessionInput) => {
    if (!user) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("psych_sessions")
      .insert({
        user_id: user.id,
        plataforma: "IQ Option",
        modo: input.modo,
        checklist: input.checklist as unknown as Json,
        puntaje_preparacion: input.puntaje,
        emocion_inicial: input.emocion,
        intensidad_inicial: input.intensidad,
      })
      .select()
      .single();
    setBusy(false);
    if (error || !data) {
      console.error("Error iniciando sesión:", error);
      toast.error("No se pudo iniciar la sesión");
      return;
    }
    setSession(data);
    setHistory((h) => [data, ...h]);
    toast.success("Sesión iniciada. Opera solo lo que cumpla tus reglas.");
  };

  const registerEntry = async (input: EntryInput) => {
    if (!user || !session) return;
    setBusy(true);
    const entrada = input.fechaEntrada ?? new Date();
    const salida = new Date(entrada.getTime() + input.expiracionSeg * 1000);
    const id = `iq-${crypto.randomUUID()}`;
    const cicloId = input.cicloId ?? `ciclo-${crypto.randomUUID()}`;
    const pnl = input.resultado ? calcularPnl(input.stake, input.payout, input.resultado) : 0;
    const { error } = await supabase.from("trades").insert({
      id,
      user_id: user.id,
      plataforma: "IQ Option",
      broker: "IQ Option",
      modo: session.modo,
      origen: "manual",
      fecha_entrada: entrada.toISOString(),
      fecha_salida: salida.toISOString(),
      instrumento: input.activo,
      moneda: "USD",
      direccion: input.direccion,
      stake_usd: input.stake,
      resultado_usd: pnl,
      saldo_antes: saldoActual,
      saldo_despues: saldoActual + pnl,
      riesgo_pct_cuenta: saldoActual > 0 ? Math.round((input.stake / saldoActual) * 10000) / 100 : null,
      tf_principal: "M5",
      payout_pct: input.payout,
      expiracion_seg: input.expiracionSeg,
      estado: input.resultado ?? ESTADO_ABIERTA,
      ciclo_id: cicloId,
      paso: input.paso ?? 1,
      ema_senal: input.emaSenal || null,
      contexto_15m: input.contexto15m || null,
      estado_emocional: input.emocion,
      intensidad_emocional: input.intensidad,
      cumplio_reglas: input.cumpleReglas,
      sesion_id: session.id,
      notas: input.notas || null,
    });
    if (error) {
      setBusy(false);
      console.error("Error registrando entrada:", error);
      toast.error("No se pudo registrar la entrada");
      return;
    }
    await logEvent("pre_entrada", {
      emocion: input.emocion,
      intensidad: input.intensidad,
      trade_id: id,
      datos: { cumple_reglas: input.cumpleReglas, paso: input.paso ?? 1, ciclo_id: cicloId },
    });
    await refetchTrades();
    setBusy(false);
  };

  const registerResult = async (trade: Trade, resultado: Resultado) => {
    if (!user) return;
    setBusy(true);
    const pnl = calcularPnl(trade.stake_usd, trade.payout_pct ?? 0, resultado);
    const { error } = await supabase
      .from("trades")
      .update({
        estado: resultado,
        resultado_usd: pnl,
        saldo_despues: trade.saldo_antes + pnl,
        resultado_pct_cuenta:
          trade.saldo_antes > 0 ? Math.round((pnl / trade.saldo_antes) * 10000) / 100 : null,
        motivo_salida: "Expiración",
      })
      .eq("id", trade.id);
    if (error) {
      setBusy(false);
      console.error("Error registrando resultado:", error);
      toast.error("No se pudo guardar el resultado");
      return;
    }
    await logEvent("resultado", { trade_id: trade.id, datos: { resultado, pnl } });
    await refetchTrades();
    setBusy(false);
  };

  const startPause = async (hasta: string, motivo: string) => {
    if (!session || session.pausa_hasta) return;
    const { data } = await supabase
      .from("psych_sessions")
      .update({ pausa_hasta: hasta })
      .eq("id", session.id)
      .select()
      .single();
    if (data) setSession(data);
    await logEvent("pausa_inicio", { datos: { motivo, hasta } });
  };

  const closeSession = async (input: { motivo: string; emocionFinal: string; reflexion: string }) => {
    if (!session) return;
    setBusy(true);
    const { error } = await supabase
      .from("psych_sessions")
      .update({
        cerrada_en: new Date().toISOString(),
        motivo_cierre: input.motivo,
        emocion_final: input.emocionFinal,
        reflexion: input.reflexion || null,
      })
      .eq("id", session.id);
    setBusy(false);
    if (error) {
      console.error("Error cerrando sesión:", error);
      toast.error("No se pudo cerrar la sesión");
      return;
    }
    await logEvent("cierre", { emocion: input.emocionFinal, datos: { motivo: input.motivo } });
    toast.success("Sesión cerrada. Buen trabajo respetando el protocolo.");
    await load();
  };

  return {
    session,
    history,
    loading,
    busy,
    sessionTrades,
    saldoActual,
    startSession,
    registerEntry,
    registerResult,
    startPause,
    closeSession,
    logEvent,
  };
}
