import { useMemo } from "react";
import { Activity, Clock, Footprints, Percent, ShieldCheck, Target } from "lucide-react";
import { StatCard } from "@/components/trading/StatCard";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/tradeCalculations";
import type { Trade } from "@/types/trade";
import {
  agruparCiclos,
  calcularExpectativa,
  compararCumplimiento,
  compararPrimerasVsResto,
  resultadosPorEmocion,
  resumirPasos,
  ESTADO_ABIERTA,
  type Expectativa,
} from "@/lib/psych/protocol";
import { emocionPorId } from "./constants";

const fmtPorDolar = (e: Expectativa) => (e.operaciones ? `${e.porDolar >= 0 ? "+" : ""}${(e.porDolar * 100).toFixed(1)}¢` : "—");
const tendencia = (e: Expectativa) => (!e.operaciones ? "neutral" : e.porDolar >= 0 ? "positive" : "negative");

export function PsychStats({ trades }: { trades: Trade[] }) {
  const binarias = useMemo(
    () => trades.filter((t) => t.plataforma === "IQ Option" && t.estado !== ESTADO_ABIERTA),
    [trades]
  );
  const stats = useMemo(() => {
    const ciclos = agruparCiclos(binarias);
    return {
      total: calcularExpectativa(binarias),
      orden: compararPrimerasVsResto(binarias, 2),
      pasos: resumirPasos(ciclos),
      cumplimiento: compararCumplimiento(binarias),
      emociones: resultadosPorEmocion(binarias),
    };
  }, [binarias]);

  if (binarias.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
        <Activity className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p>Aún no hay operaciones de IQ Option con resultado.</p>
        <p className="text-sm">Registra tus entradas desde la pestaña Entrenador y aquí verás tu disciplina en números.</p>
      </div>
    );
  }

  const { total, orden, pasos, cumplimiento, emociones } = stats;
  const sobreEquilibrio = total.winRate - total.winRateEquilibrio;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Expectativa por $1"
          value={fmtPorDolar(total)}
          subtitle={`${total.operaciones} operaciones`}
          icon={Target}
          trend={tendencia(total)}
        />
        <StatCard
          title="Win rate"
          value={`${total.winRate.toFixed(1)}%`}
          subtitle={`Necesitas ${total.winRateEquilibrio.toFixed(1)}% con payout ${total.payoutPromedio.toFixed(0)}%`}
          icon={Percent}
          trend={sobreEquilibrio >= 0 ? "positive" : "negative"}
        />
        <StatCard
          title="Cumplimiento de reglas"
          value={`${cumplimiento.porcentajeCumplimiento.toFixed(0)}%`}
          subtitle="Entradas que cumplían tu protocolo"
          icon={ShieldCheck}
          trend={cumplimiento.porcentajeCumplimiento >= 90 ? "positive" : cumplimiento.porcentajeCumplimiento >= 70 ? "neutral" : "negative"}
        />
        <StatCard
          title="Pasos de recuperación"
          value={String(pasos.pasosDeRecuperacion)}
          subtitle={pasos.pasosDeRecuperacion ? `Resultado: ${formatCurrency(pasos.resultadoRecuperacion)}` : "Ninguno. Así se hace."}
          icon={Footprints}
          trend={pasos.pasosDeRecuperacion === 0 ? "positive" : "negative"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Comparativa
          icon={<Clock className="h-4 w-4" />}
          titulo="¿Operas mejor al comienzo?"
          a={{ nombre: "2 primeras del día", e: orden.primeras }}
          b={{ nombre: "Desde la 3.ª", e: orden.resto }}
        />
        <Comparativa
          icon={<ShieldCheck className="h-4 w-4" />}
          titulo="Con reglas vs. sin reglas"
          a={{ nombre: "Cumplía reglas", e: cumplimiento.conReglas }}
          b={{ nombre: "No cumplía", e: cumplimiento.sinReglas }}
        />
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium flex items-center gap-2">
            <Footprints className="h-4 w-4" /> ¿La mejora de entrada suma?
          </p>
          <Fila nombre={`Ciclos con mejora (${pasos.ciclosConMejora})`} valor={formatCurrency(pasos.resultadoConMejora)} positivo={pasos.resultadoConMejora >= 0} />
          <Fila nombre={`Ciclos sin mejora (${pasos.ciclosSinMejora})`} valor={formatCurrency(pasos.resultadoSinMejora)} positivo={pasos.resultadoSinMejora >= 0} />
          <p className="text-xs text-muted-foreground">
            Resultado total de cada grupo. Compara también cuántos ciclos hay en cada uno antes de sacar conclusiones.
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="table-header px-4 py-3 border-b border-border">Resultados según tu emoción antes de entrar</div>
        {emociones.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Sin datos emocionales todavía.</p>
        ) : (
          <div className="divide-y divide-border">
            {emociones.map((f) => {
              const emo = emocionPorId(f.emocion);
              return (
                <div key={f.emocion} className="grid grid-cols-4 gap-2 px-4 py-2 text-sm items-center">
                  <span>
                    {emo?.emoji} {emo?.label ?? f.emocion}
                  </span>
                  <span className="font-mono text-muted-foreground">{f.operaciones} ops</span>
                  <span className="font-mono">{f.winRate.toFixed(0)}%</span>
                  <span className={cn("font-mono text-right", f.resultado >= 0 ? "profit-text" : "loss-text")}>
                    {formatCurrency(f.resultado)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Con pocas operaciones estos números cambian mucho. Toma conclusiones a partir de unas 30 operaciones por grupo.
      </p>
    </div>
  );
}

function Comparativa({
  icon,
  titulo,
  a,
  b,
}: {
  icon: React.ReactNode;
  titulo: string;
  a: { nombre: string; e: Expectativa };
  b: { nombre: string; e: Expectativa };
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <p className="text-sm font-medium flex items-center gap-2">
        {icon} {titulo}
      </p>
      {[a, b].map(({ nombre, e }) => (
        <Fila
          key={nombre}
          nombre={`${nombre} (${e.operaciones})`}
          valor={e.operaciones ? `${e.winRate.toFixed(0)}% · ${fmtPorDolar(e)}` : "—"}
          positivo={e.porDolar >= 0}
        />
      ))}
      <p className="text-xs text-muted-foreground">Win rate y ganancia esperada por cada dólar arriesgado.</p>
    </div>
  );
}

function Fila({ nombre, valor, positivo }: { nombre: string; valor: string; positivo: boolean }) {
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{nombre}</span>
      <span className={cn("font-mono", positivo ? "profit-text" : "loss-text")}>{valor}</span>
    </div>
  );
}
