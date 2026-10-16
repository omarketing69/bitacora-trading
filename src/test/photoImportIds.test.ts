import { describe, expect, it } from "vitest";
import { buildTradesFromPhoto } from "@/components/trading/ImportFromPhoto";

const foto = [
  {
    id_externo: "2 Binary",
    instrumento: "Boom 1000 Index",
    apalancamiento: "X500",
    direccion: "Compra" as const,
    fecha_entrada: "2026-10-15T10:30:00-05:00",
    fecha_salida: "2026-10-15T10:31:00-05:00",
    stake_usd: 10,
    resultado_usd: 8.5,
  },
  {
    id_externo: "3 Binary",
    instrumento: "Crash 1000 Index",
    apalancamiento: "X500",
    direccion: "Venta" as const,
    fecha_entrada: "2026-10-15T11:05:00-05:00",
    fecha_salida: "2026-10-15T11:06:00-05:00",
    stake_usd: 10,
    resultado_usd: -10,
  },
];

describe("ids de operaciones importadas desde foto", () => {
  it("subir dos veces la misma foto produce los mismos ids (no duplica)", () => {
    const primera = buildTradesFromPhoto(foto, 100);
    const segunda = buildTradesFromPhoto(foto, 100);
    expect(segunda.map((t) => t.id)).toEqual(primera.map((t) => t.id));
  });

  it("dos operaciones distintas nunca comparten id, aunque la IA repita id_externo", () => {
    const repetido = foto.map((t, i) => ({ ...t, id_externo: i === 0 ? "2 Binary" : "2 Binary" }));
    const trades = buildTradesFromPhoto(repetido, 100);
    expect(trades[0].id).not.toBe(trades[1].id);
    expect(trades[0].id).toContain("Boom_1000_Index");
    expect(trades[1].id).toContain("Crash_1000_Index");
  });

  it("el id_externo de la IA se guarda en id_externo, no en id", () => {
    const trades = buildTradesFromPhoto(foto, 100);
    expect(trades[0].id_externo).toBe("2 Binary");
    expect(trades[0].id).not.toBe("2 Binary");
    expect(trades[0].id.startsWith("foto-")).toBe(true);
  });

  it("dos filas idénticas de la misma foto reciben ids distintos", () => {
    const trades = buildTradesFromPhoto([foto[0], { ...foto[0] }], 100);
    expect(trades[0].id).not.toBe(trades[1].id);
  });
});
