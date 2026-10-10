/**
 * Protocolo de psicotrading para opciones binarias (IQ Option, expiración 5 min).
 *
 * Lógica pura, sin dependencias de React ni Supabase, para poder probarla aislada.
 *
 * Reglas:
 *  - Un "ciclo" agrupa todos los pasos de una misma idea de entrada (columna "Operación" de BotsStrike).
 *  - Paso posterior tomado MIENTRAS la entrada anterior sigue abierta  -> "mejora_entrada" (permitido).
 *  - Paso posterior tomado DESPUÉS de que la anterior cerró en pérdida -> "recuperacion" (violación).
 *  - El ciclo completo cuenta como UNA decisión: su resultado es la suma de sus pasos.
 *  - La sesión se cierra al llegar a `limiteCiclosPerdidos` ciclos negativos o `limiteCiclosGanados` positivos.
 *  - Tras un ciclo perdido se activa una pausa de `pausaMinutos` antes del cierre/reflexión.
 */

import type { Trade, TipoPaso } from "@/types/trade";

export type ResultadoCiclo = "ganado" | "perdido" | "empate";

export interface Ciclo {
  id: string;
  pasos: Trade[];
  inicio: string;
  fin: string;
  stakeTotal: number;
  resultado: number;
  estado: ResultadoCiclo;
  tieneRecuperacion: boolean;
  tieneMejoraEntrada: boolean;
}

export interface ReglasSesion {
  limiteCiclosPerdidos: number;
  limiteCiclosGanados: number;
  pausaMinutos: number;
}

export const REGLAS_POR_DEFECTO: ReglasSesion = {
  limiteCiclosPerdidos: 1,
  limiteCiclosGanados: 2,
  pausaMinutos: 10,
};

export type EstadoSesion =
  | { tipo: "activa"; ciclosGanados: number; ciclosPerdidos: number }
  | { tipo: "pausa"; hasta: string; motivo: MotivoCierre }
  | { tipo: "cerrada"; motivo: MotivoCierre };

export type MotivoCierre = "limite_perdida" | "objetivo_ganancias" | "recuperacion" | "manual";

const ms = (iso: string) => new Date(iso).getTime();

const estadoDe = (t: Trade): "ganada" | "perdida" | "empate" => {
  if (t.estado === "ganada" || t.estado === "perdida" || t.estado === "empate") return t.estado;
  if (t.resultado_usd > 0) return "ganada";
  if (t.resultado_usd < 0) return "perdida";
  return "empate";
};

/** Clasifica un paso según la relación temporal con el paso anterior del mismo ciclo. */
export function clasificarPaso(paso: Trade, anterior: Trade | undefined): TipoPaso {
  if (!anterior) return "inicial";
  const anteriorSigueAbierta = ms(paso.fecha_entrada) < ms(anterior.fecha_salida);
  if (anteriorSigueAbierta) return "mejora_entrada";
  if (estadoDe(anterior) === "perdida") return "recuperacion";
  return "inicial";
}

/** Agrupa trades en ciclos y clasifica cada paso. No muta los trades recibidos. */
export function agruparCiclos(trades: Trade[]): Ciclo[] {
  const grupos = new Map<string, Trade[]>();
  for (const t of trades) {
    const key = t.ciclo_id || t.id;
    const lista = grupos.get(key) ?? [];
    lista.push(t);
    grupos.set(key, lista);
  }

  const ciclos: Ciclo[] = [];
  for (const [id, lista] of grupos) {
    const ordenados = [...lista].sort(
      (a, b) => (a.paso ?? 1) - (b.paso ?? 1) || ms(a.fecha_entrada) - ms(b.fecha_entrada)
    );
    const pasos = ordenados.map((t, i) => ({ ...t, tipo_paso: clasificarPaso(t, ordenados[i - 1]) }));
    const resultado = round2(pasos.reduce((s, t) => s + t.resultado_usd, 0));
    ciclos.push({
      id,
      pasos,
      inicio: pasos.reduce((m, t) => (ms(t.fecha_entrada) < ms(m) ? t.fecha_entrada : m), pasos[0].fecha_entrada),
      fin: pasos.reduce((m, t) => (ms(t.fecha_salida) > ms(m) ? t.fecha_salida : m), pasos[0].fecha_salida),
      stakeTotal: round2(pasos.reduce((s, t) => s + t.stake_usd, 0)),
      resultado,
      estado: resultado > 0 ? "ganado" : resultado < 0 ? "perdido" : "empate",
      tieneRecuperacion: pasos.some((p) => p.tipo_paso === "recuperacion"),
      tieneMejoraEntrada: pasos.some((p) => p.tipo_paso === "mejora_entrada"),
    });
  }
  return ciclos.sort((a, b) => ms(a.inicio) - ms(b.inicio));
}

/** Evalúa en qué estado queda una sesión según sus ciclos cerrados. */
export function evaluarSesion(
  ciclos: Ciclo[],
  reglas: ReglasSesion = REGLAS_POR_DEFECTO,
  ahora: Date = new Date()
): EstadoSesion {
  let ganados = 0;
  let perdidos = 0;
  for (const c of [...ciclos].sort((a, b) => ms(a.fin) - ms(b.fin))) {
    if (c.tieneRecuperacion) return pausaOCierre(c.fin, "recuperacion", reglas, ahora);
    if (c.estado === "ganado") ganados++;
    if (c.estado === "perdido") perdidos++;
    if (perdidos >= reglas.limiteCiclosPerdidos) return pausaOCierre(c.fin, "limite_perdida", reglas, ahora);
    if (ganados >= reglas.limiteCiclosGanados) return { tipo: "cerrada", motivo: "objetivo_ganancias" };
  }
  return { tipo: "activa", ciclosGanados: ganados, ciclosPerdidos: perdidos };
}

function pausaOCierre(desde: string, motivo: MotivoCierre, reglas: ReglasSesion, ahora: Date): EstadoSesion {
  const hasta = new Date(ms(desde) + reglas.pausaMinutos * 60_000);
  return ahora < hasta ? { tipo: "pausa", hasta: hasta.toISOString(), motivo } : { tipo: "cerrada", motivo };
}

// ---------------------------------------------------------------------------
// Estadísticas
// ---------------------------------------------------------------------------

/** Win rate mínimo para no perder dinero con un payout dado (ej. 85% -> 54.05%). */
export function winRateEquilibrio(payoutPct: number): number {
  return payoutPct > 0 ? round2((100 / (100 + payoutPct)) * 100) : 100;
}

export interface Expectativa {
  operaciones: number;
  winRate: number; // %
  payoutPromedio: number; // %
  winRateEquilibrio: number; // %
  /** Ganancia esperada por cada 1 USD arriesgado. Positivo = ventaja. */
  porDolar: number;
}

/** Expectativa matemática usando el payout real de cada operación. Empates no cuentan. */
export function calcularExpectativa(trades: Trade[]): Expectativa {
  const decididas = trades.filter((t) => estadoDe(t) !== "empate");
  const n = decididas.length;
  if (n === 0) return { operaciones: 0, winRate: 0, payoutPromedio: 0, winRateEquilibrio: 0, porDolar: 0 };
  const ganadas = decididas.filter((t) => estadoDe(t) === "ganada").length;
  const conPayout = decididas.filter((t) => (t.payout_pct ?? 0) > 0);
  const payout = conPayout.length ? conPayout.reduce((s, t) => s + (t.payout_pct ?? 0), 0) / conPayout.length : 0;
  const p = ganadas / n;
  return {
    operaciones: n,
    winRate: round2(p * 100),
    payoutPromedio: round2(payout),
    winRateEquilibrio: winRateEquilibrio(payout),
    porDolar: round4(p * (payout / 100) - (1 - p)),
  };
}

export interface ComparativaOrden {
  primeras: Expectativa;
  resto: Expectativa;
}

/**
 * Compara las primeras N operaciones de cada día con el resto.
 * Sirve para comprobar si de verdad operas mejor al comienzo de la sesión.
 */
export function compararPrimerasVsResto(trades: Trade[], n = 2): ComparativaOrden {
  const porDia = new Map<string, Trade[]>();
  for (const t of trades) {
    const dia = t.fecha_entrada.slice(0, 10);
    porDia.set(dia, [...(porDia.get(dia) ?? []), t]);
  }
  const primeras: Trade[] = [];
  const resto: Trade[] = [];
  for (const lista of porDia.values()) {
    lista.sort((a, b) => ms(a.fecha_entrada) - ms(b.fecha_entrada));
    primeras.push(...lista.slice(0, n));
    resto.push(...lista.slice(n));
  }
  return { primeras: calcularExpectativa(primeras), resto: calcularExpectativa(resto) };
}

export interface ResumenPasos {
  ciclosConMejora: number;
  resultadoConMejora: number;
  ciclosSinMejora: number;
  resultadoSinMejora: number;
  pasosDeRecuperacion: number;
  resultadoRecuperacion: number;
}

/** ¿El segundo paso "mejor punto" mejora los resultados o solo aumenta el riesgo? */
export function resumirPasos(ciclos: Ciclo[]): ResumenPasos {
  const con = ciclos.filter((c) => c.tieneMejoraEntrada);
  const sin = ciclos.filter((c) => !c.tieneMejoraEntrada);
  const recup = ciclos.flatMap((c) => c.pasos.filter((p) => p.tipo_paso === "recuperacion"));
  return {
    ciclosConMejora: con.length,
    resultadoConMejora: round2(con.reduce((s, c) => s + c.resultado, 0)),
    ciclosSinMejora: sin.length,
    resultadoSinMejora: round2(sin.reduce((s, c) => s + c.resultado, 0)),
    pasosDeRecuperacion: recup.length,
    resultadoRecuperacion: round2(recup.reduce((s, t) => s + t.resultado_usd, 0)),
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;
