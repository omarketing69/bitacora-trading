import { useEffect, useMemo, useRef, useState } from "react";
import { Brain, CheckCircle2, Loader2, Plus, Timer, XCircle, MinusCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/tradeCalculations";
import type { Trade } from "@/types/trade";
import { usePsychSession, type ChecklistData, type EntryInput } from "@/hooks/usePsychSession";
import { agruparCiclos, cicloAbierto, evaluarSesion, ESTADO_ABIERTA, type Ciclo } from "@/lib/psych/protocol";
import { PreSessionChecklist } from "./PreSessionChecklist";
import { EntryForm, type EntryMode } from "./EntryForm";
import { PauseScreen } from "./PauseScreen";
import { CloseSession } from "./CloseSession";
import { emocionPorId } from "./constants";

/** Pasos máximos por ciclo (entrada inicial + 1 mejora de entrada). */
export const MAX_PASOS = 2;

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

interface Props {
  trades: Trade[];
  refetch: () => Promise<void>;
}

export function PsychCoach({ trades, refetch }: Props) {
  const ps = usePsychSession(trades, refetch);
  const now = useNow();
  const [form, setForm] = useState<EntryMode | null>(null);
  const [cierreManual, setCierreManual] = useState(false);
  const pausaSolicitada = useRef<string | null>(null);

  const session = ps.session;
  const ciclos = useMemo(() => agruparCiclos(ps.sessionTrades), [ps.sessionTrades]);
  const cerrados = ciclos.filter((c) => !cicloAbierto(c));
  const abierto = ciclos.find(cicloAbierto);

  const estado = session
    ? evaluarSesion(
        cerrados,
        {
          limiteCiclosPerdidos: session.limite_ciclos_perdidos,
          limiteCiclosGanados: session.limite_ciclos_ganados,
          pausaMinutos: session.pausa_minutos,
        },
        now
      )
    : null;

  const motivoBloqueo = estado && estado.tipo !== "activa" ? estado.motivo : null;
  const requierePausa = motivoBloqueo === "limite_perdida" || motivoBloqueo === "recuperacion";
  const pausaHasta = session?.pausa_hasta ? new Date(session.pausa_hasta) : null;
  const enPausa = requierePausa && (!pausaHasta || now < pausaHasta);

  // La pausa empieza cuando registras la pérdida (no cuando expiró la opción).
  useEffect(() => {
    if (!session || !requierePausa || session.pausa_hasta || !motivoBloqueo) return;
    if (pausaSolicitada.current === session.id) return;
    pausaSolicitada.current = session.id;
    const hasta = new Date(Date.now() + session.pausa_minutos * 60_000).toISOString();
    ps.startPause(hasta, motivoBloqueo);
  }, [session, requierePausa, motivoBloqueo, ps]);

  if (ps.loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (ps.dbPendiente) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Falta activar el entrenador en la base de datos</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          El código del entrenador ya está instalado, pero tu base de datos todavía no tiene las tablas nuevas. Tu
          bitácora sigue funcionando normal mientras tanto.
        </p>
        <p className="text-sm text-muted-foreground">
          Para activarlo, pídele a Lovable: <span className="text-foreground">"Aplica la migración
          supabase/migrations/20261010180000_iq_option_psychotrading.sql"</span>.
        </p>
      </div>
    );
  }

  if (!session) {
    const ultimoSaldo = trades.find((t) => t.plataforma === "IQ Option" && t.estado !== ESTADO_ABIERTA)?.saldo_despues ?? 0;
    return <PreSessionChecklist busy={ps.busy} saldoSugerido={ultimoSaldo} onStart={ps.startSession} />;
  }

  const checklist = (session.checklist ?? {}) as unknown as Partial<ChecklistData>;
  const payoutMinimo = Number(checklist.payout_minimo) || 0;
  const ultimo = ps.sessionTrades[0];
  const defaults: Partial<EntryInput> = ultimo
    ? {
        activo: ultimo.instrumento,
        direccion: ultimo.direccion,
        stake: ultimo.stake_usd,
        payout: ultimo.payout_pct,
        emaSenal: ultimo.ema_senal,
        contexto15m: ultimo.contexto_15m,
      }
    : {};

  const submitEntry = async (input: EntryInput) => {
    if (form === "mejora" && abierto) {
      await ps.registerEntry({ ...input, cicloId: abierto.id, paso: abierto.pasos.length + 1 });
    } else if (form === "fuera_protocolo") {
      const ultimoCiclo = cerrados[cerrados.length - 1];
      const tras_perdida = ultimoCiclo && ultimoCiclo.estado === "perdido";
      await ps.registerEntry(
        tras_perdida ? { ...input, cicloId: ultimoCiclo.id, paso: ultimoCiclo.pasos.length + 1 } : { ...input, cumpleReglas: false }
      );
    } else {
      await ps.registerEntry(input);
    }
    setForm(null);
  };

  const header = (
    <SessionHeader
      modo={session.modo}
      saldo={ps.saldoActual}
      ciclos={cerrados}
      limiteGanados={session.limite_ciclos_ganados}
      limitePerdidos={session.limite_ciclos_perdidos}
      emocionInicial={session.emocion_inicial}
    />
  );

  // ----- Sesión bloqueada: pausa o cierre -----
  if (motivoBloqueo || cierreManual) {
    if (form === "fuera_protocolo") {
      return (
        <div className="space-y-4">
          {header}
          <EntryForm mode="fuera_protocolo" busy={ps.busy} payoutMinimo={payoutMinimo} defaults={defaults} onSubmit={submitEntry} onCancel={() => setForm(null)} />
        </div>
      );
    }
    const confesar = (
      <button type="button" onClick={() => setForm("fuera_protocolo")} className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
        ¿Abriste otra operación en IQ Option? Regístrala aquí
      </button>
    );
    if (enPausa && pausaHasta) {
      return (
        <div className="space-y-4">
          {header}
          <PauseScreen
            hasta={pausaHasta}
            ahora={now}
            titulo={motivoBloqueo === "recuperacion" ? "Entrada de recuperación detectada" : "Pausa de 10 minutos"}
            onImpulso={(i) => ps.logEvent("impulso", { intensidad: i })}
            onNota={(r) => ps.logEvent("nota", { datos: { reflexion_pausa: r } })}
          />
          <div className="text-center">{confesar}</div>
        </div>
      );
    }
    if (enPausa) {
      return (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      );
    }
    return (
      <div className="space-y-4">
        {header}
        <CloseSession
          motivo={motivoBloqueo ?? "manual"}
          ciclos={ciclos}
          busy={ps.busy}
          onClose={async (input) => {
            await ps.closeSession(input);
            setCierreManual(false);
          }}
          onCancel={!motivoBloqueo ? () => setCierreManual(false) : undefined}
        />
        {motivoBloqueo && <div className="text-center">{confesar}</div>}
      </div>
    );
  }

  // ----- Sesión activa -----
  const ultimoPasoAbierto = abierto?.pasos[abierto.pasos.length - 1];
  const puedeMejorar =
    !!abierto &&
    !!ultimoPasoAbierto &&
    ultimoPasoAbierto.estado === ESTADO_ABIERTA &&
    abierto.pasos.length < MAX_PASOS &&
    now < new Date(ultimoPasoAbierto.fecha_salida);

  return (
    <div className="space-y-4">
      {header}

      {abierto && <OpenCycle ciclo={abierto} now={now} busy={ps.busy} onResult={ps.registerResult} />}

      {form ? (
        <EntryForm mode={form} busy={ps.busy} payoutMinimo={payoutMinimo} defaults={defaults} onSubmit={submitEntry} onCancel={() => setForm(null)} />
      ) : (
        <div className="flex flex-wrap gap-2">
          {!abierto && (
            <Button className="gap-2" onClick={() => setForm("nueva")}>
              <Plus className="h-4 w-4" /> Nueva entrada
            </Button>
          )}
          {puedeMejorar && (
            <Button variant="secondary" className="gap-2" onClick={() => setForm("mejora")}>
              <Plus className="h-4 w-4" /> Mejora de entrada (paso {abierto!.pasos.length + 1})
            </Button>
          )}
          <Button variant="outline" className="ml-auto" disabled={!!abierto} onClick={() => setCierreManual(true)}>
            Terminar sesión
          </Button>
        </div>
      )}

      {cerrados.length > 0 && <CycleList ciclos={[...cerrados].reverse()} />}
    </div>
  );
}

function SessionHeader(props: {
  modo: string;
  saldo: number;
  ciclos: Ciclo[];
  limiteGanados: number;
  limitePerdidos: number;
  emocionInicial: string | null;
}) {
  const ganados = props.ciclos.filter((c) => c.estado === "ganado").length;
  const perdidos = props.ciclos.filter((c) => c.estado === "perdido").length;
  const pnl = props.ciclos.reduce((s, c) => s + c.resultado, 0);
  const emo = emocionPorId(props.emocionInicial);
  return (
    <div className="bg-card border border-border rounded-lg p-4 flex flex-wrap items-center gap-x-6 gap-y-3">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-primary" />
        <span className="font-semibold">Sesión en curso</span>
        <Badge variant={props.modo === "REAL" ? "destructive" : "secondary"}>{props.modo}</Badge>
      </div>
      <Metric label="Saldo" value={`$${props.saldo.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
      <Metric label="Resultado" value={formatCurrency(pnl)} className={pnl >= 0 ? "profit-text" : "loss-text"} />
      <Metric label="Ganados" value={`${ganados} / ${props.limiteGanados}`} className="profit-text" />
      <Metric label="Perdidos" value={`${perdidos} / ${props.limitePerdidos}`} className="loss-text" />
      {emo && <Metric label="Inicio" value={`${emo.emoji} ${emo.label}`} />}
    </div>
  );
}

function Metric({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("font-mono font-semibold", className)}>{value}</p>
    </div>
  );
}

function OpenCycle({
  ciclo,
  now,
  busy,
  onResult,
}: {
  ciclo: Ciclo;
  now: Date;
  busy: boolean;
  onResult: (t: Trade, r: "ganada" | "perdida" | "empate") => void;
}) {
  return (
    <div className="bg-card border border-primary/40 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Timer className="h-4 w-4 text-primary" /> Ciclo abierto
      </div>
      {ciclo.pasos.map((p) => {
        const restante = Math.max(0, new Date(p.fecha_salida).getTime() - now.getTime());
        const abierta = p.estado === ESTADO_ABIERTA;
        const mm = Math.floor(restante / 60000);
        const ss = Math.floor((restante % 60000) / 1000);
        return (
          <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-md bg-muted/40 p-3">
            <Badge variant="outline">Paso {p.paso ?? 1}</Badge>
            <span className="font-mono text-sm">
              {p.instrumento} · {p.direccion === "Compra" ? "CALL" : "PUT"} · ${p.stake_usd} · {p.payout_pct}%
            </span>
            {abierta ? (
              <>
                <span className={cn("font-mono text-sm tabular-nums", restante === 0 && "text-primary font-semibold")}>
                  {restante > 0 ? `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}` : "Expiró: registra el resultado"}
                </span>
                <div className="flex gap-1 ml-auto">
                  <Button size="sm" disabled={busy} className="gap-1 bg-success text-success-foreground hover:bg-success/90" onClick={() => onResult(p, "ganada")}>
                    <CheckCircle2 className="h-4 w-4" /> Ganó
                  </Button>
                  <Button size="sm" disabled={busy} variant="destructive" className="gap-1" onClick={() => onResult(p, "perdida")}>
                    <XCircle className="h-4 w-4" /> Perdió
                  </Button>
                  <Button size="sm" disabled={busy} variant="outline" className="gap-1" onClick={() => onResult(p, "empate")}>
                    <MinusCircle className="h-4 w-4" /> Empate
                  </Button>
                </div>
              </>
            ) : (
              <span className={cn("ml-auto font-mono text-sm", p.resultado_usd >= 0 ? "profit-text" : "loss-text")}>
                {formatCurrency(p.resultado_usd)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CycleList({ ciclos }: { ciclos: Ciclo[] }) {
  return (
    <div className="bg-card border border-border rounded-lg divide-y divide-border">
      {ciclos.map((c) => (
        <div key={c.id} className="p-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-mono text-muted-foreground">
            {new Date(c.inicio).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <span className="font-mono">{c.pasos[0].instrumento}</span>
          {c.tieneMejoraEntrada && <Badge variant="secondary">Mejora de entrada</Badge>}
          {c.tieneRecuperacion && (
            <Badge variant="destructive" className="gap-1">
              <ShieldAlert className="h-3 w-3" /> Recuperación
            </Badge>
          )}
          {c.pasos.some((p) => p.cumplio_reglas === false) && <Badge variant="outline">Fuera de reglas</Badge>}
          <span className={cn("ml-auto font-mono font-semibold", c.resultado >= 0 ? "profit-text" : "loss-text")}>
            {formatCurrency(c.resultado)}
          </span>
        </div>
      ))}
    </div>
  );
}
