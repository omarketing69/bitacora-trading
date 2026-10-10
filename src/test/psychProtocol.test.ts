import { describe, it, expect } from "vitest";
import type { Trade } from "@/types/trade";
import {
  agruparCiclos,
  evaluarSesion,
  calcularExpectativa,
  winRateEquilibrio,
  compararPrimerasVsResto,
  resumirPasos,
} from "@/lib/psych/protocol";

let seq = 0;
function trade(p: Partial<Trade> & { entrada: string; minutos?: number }): Trade {
  const salida = new Date(new Date(p.entrada).getTime() + (p.minutos ?? 5) * 60_000).toISOString();
  return {
    id: `t${++seq}`,
    fecha_entrada: new Date(p.entrada).toISOString(),
    fecha_salida: salida,
    instrumento: "EURUSD",
    moneda: "USD",
    direccion: "Compra",
    stake_usd: 10,
    resultado_usd: 0,
    saldo_antes: 0,
    saldo_despues: 0,
    riesgo_pct_cuenta: 0,
    resultado_pct_cuenta: 0,
    tf_principal: "",
    contexto_1h: "",
    posicion_en_canal: "",
    tipo_setup: "",
    entrada_por: "",
    stop_plan_usd: 0,
    tp_plan_usd: 0,
    motivo_salida: "",
    notas: "",
    payout_pct: 85,
    ...p,
  };
}

describe("clasificación de pasos", () => {
  it("un paso tomado con la entrada anterior abierta es mejora de entrada", () => {
    const [c] = agruparCiclos([
      trade({ ciclo_id: "A", paso: 1, entrada: "2026-10-10T14:00:00Z", resultado_usd: -10 }),
      trade({ ciclo_id: "A", paso: 2, entrada: "2026-10-10T14:02:00Z", resultado_usd: 8.5 }),
    ]);
    expect(c.pasos.map((p) => p.tipo_paso)).toEqual(["inicial", "mejora_entrada"]);
    expect(c.tieneRecuperacion).toBe(false);
    expect(c.resultado).toBe(-1.5);
    expect(c.estado).toBe("perdido");
  });

  it("un paso tomado después de cerrar en pérdida es recuperación", () => {
    const [c] = agruparCiclos([
      trade({ ciclo_id: "B", paso: 1, entrada: "2026-10-10T14:00:00Z", resultado_usd: -10 }),
      trade({ ciclo_id: "B", paso: 2, entrada: "2026-10-10T14:06:00Z", resultado_usd: 17 }),
    ]);
    expect(c.pasos[1].tipo_paso).toBe("recuperacion");
    expect(c.tieneRecuperacion).toBe(true);
  });
});

describe("estado de la sesión", () => {
  const ahora = new Date("2026-10-10T16:00:00Z");

  it("dos ciclos ganados cierran la sesión por objetivo", () => {
    const ciclos = agruparCiclos([
      trade({ entrada: "2026-10-10T14:00:00Z", resultado_usd: 8.5 }),
      trade({ entrada: "2026-10-10T14:10:00Z", resultado_usd: 8.5 }),
    ]);
    expect(evaluarSesion(ciclos, undefined, ahora)).toEqual({ tipo: "cerrada", motivo: "objetivo_ganancias" });
  });

  it("un ciclo perdido activa la pausa de 10 minutos", () => {
    const ciclos = agruparCiclos([trade({ entrada: "2026-10-10T15:50:00Z", resultado_usd: -10 })]);
    const estado = evaluarSesion(ciclos, undefined, ahora);
    expect(estado.tipo).toBe("pausa");
    if (estado.tipo === "pausa") expect(estado.hasta).toBe("2026-10-10T16:05:00.000Z");
  });

  it("después de la pausa la sesión queda cerrada", () => {
    const ciclos = agruparCiclos([trade({ entrada: "2026-10-10T15:00:00Z", resultado_usd: -10 })]);
    expect(evaluarSesion(ciclos, undefined, ahora)).toEqual({ tipo: "cerrada", motivo: "limite_perdida" });
  });

  it("una ganancia y nada más deja la sesión activa", () => {
    const ciclos = agruparCiclos([trade({ entrada: "2026-10-10T15:00:00Z", resultado_usd: 8.5 })]);
    expect(evaluarSesion(ciclos, undefined, ahora)).toEqual({ tipo: "activa", ciclosGanados: 1, ciclosPerdidos: 0 });
  });
});

describe("estadísticas", () => {
  it("win rate de equilibrio con payout 85% es 54.05%", () => {
    expect(winRateEquilibrio(85)).toBe(54.05);
  });

  it("expectativa por dólar con 60% de aciertos y payout 85%", () => {
    const ts = [
      ...Array.from({ length: 6 }, (_, i) => trade({ entrada: `2026-10-10T1${i}:00:00Z`, resultado_usd: 8.5 })),
      ...Array.from({ length: 4 }, (_, i) => trade({ entrada: `2026-10-11T1${i}:00:00Z`, resultado_usd: -10 })),
    ];
    const e = calcularExpectativa(ts);
    expect(e.winRate).toBe(60);
    expect(e.porDolar).toBe(0.11); // 0.6*0.85 - 0.4
  });

  it("separa las 2 primeras operaciones del día del resto", () => {
    const ts = [
      trade({ entrada: "2026-10-10T13:00:00Z", resultado_usd: 8.5 }),
      trade({ entrada: "2026-10-10T13:10:00Z", resultado_usd: 8.5 }),
      trade({ entrada: "2026-10-10T13:20:00Z", resultado_usd: -10 }),
    ];
    const r = compararPrimerasVsResto(ts);
    expect(r.primeras.winRate).toBe(100);
    expect(r.resto.winRate).toBe(0);
  });

  it("resume el efecto de los pasos", () => {
    const ciclos = agruparCiclos([
      trade({ ciclo_id: "A", paso: 1, entrada: "2026-10-10T14:00:00Z", resultado_usd: 8.5 }),
      trade({ ciclo_id: "A", paso: 2, entrada: "2026-10-10T14:02:00Z", resultado_usd: 8.5 }),
      trade({ ciclo_id: "B", paso: 1, entrada: "2026-10-10T15:00:00Z", resultado_usd: -10 }),
      trade({ ciclo_id: "B", paso: 2, entrada: "2026-10-10T15:06:00Z", resultado_usd: -10 }),
    ]);
    const r = resumirPasos(ciclos);
    expect(r.ciclosConMejora).toBe(1);
    expect(r.resultadoConMejora).toBe(17);
    expect(r.pasosDeRecuperacion).toBe(1);
    expect(r.resultadoRecuperacion).toBe(-10);
  });
});
