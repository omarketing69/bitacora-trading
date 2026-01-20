export interface Trade {
  id: string;
  fecha_entrada: string;
  fecha_salida: string;
  instrumento: string;
  moneda: string;
  direccion: "Compra" | "Venta";
  stake_usd: number;
  resultado_usd: number;
  saldo_antes: number;
  saldo_despues: number;
  riesgo_pct_cuenta: number;
  resultado_pct_cuenta: number;
  tf_principal: string;
  contexto_1h: string;
  posicion_en_canal: string;
  tipo_setup: string;
  entrada_por: string;
  stop_plan_usd: number;
  tp_plan_usd: number;
  motivo_salida: string;
  notas: string;
}

export interface TradeStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  bestTrade: number;
  worstTrade: number;
}
