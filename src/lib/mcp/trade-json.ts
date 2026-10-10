// Maps a raw trades row to a JSON-safe object for MCP responses.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toTradeJson = (t: any) => ({
  id: String(t.id),
  fecha_entrada: String(t.fecha_entrada),
  fecha_salida: String(t.fecha_salida),
  instrumento: String(t.instrumento ?? ""),
  tipo_activo: String(t.posicion_en_canal ?? ""),
  direccion: String(t.direccion ?? ""),
  moneda: String(t.moneda ?? "USD"),
  stake_usd: Number(t.stake_usd) || 0,
  resultado_usd: Number(t.resultado_usd) || 0,
  saldo_antes: Number(t.saldo_antes) || 0,
  saldo_despues: Number(t.saldo_despues) || 0,
  entrada_por: String(t.entrada_por ?? ""),
  contexto: String(t.contexto_1h ?? ""),
  motivo_salida: String(t.motivo_salida ?? ""),
  notas: String(t.notas ?? ""),
});
