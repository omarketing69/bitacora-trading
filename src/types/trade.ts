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

  // --- Opciones binarias (IQ Option vía BotsStrike). Opcionales: los trades de Deriv no los tienen ---
  plataforma?: string; // "Deriv" | "IQ Option"
  broker?: string;
  modo?: "REAL" | "DEMO" | string;
  origen?: "manual" | "bot" | string;
  bot?: string;
  estrategia?: string;
  categoria_estrategia?: string;
  senal?: string;
  payout_pct?: number;
  expiracion_seg?: number;
  precio_entrada?: number;
  precio_cierre?: number;
  estado?: "ganada" | "perdida" | "empate" | string;
  ciclo_id?: string; // agrupa los pasos de una misma idea de entrada
  paso?: number; // 1 = entrada inicial
  tipo_paso?: TipoPaso;
  id_externo?: string;

  // --- Datos del entrenador de psicotrading ---
  ema_senal?: string;
  contexto_15m?: string;
  estado_emocional?: string;
  intensidad_emocional?: number;
  cumplio_reglas?: boolean | null;
  sesion_id?: string;
  tipo_sesion?: "principal" | "practica";
}

/**
 * inicial: primera entrada del ciclo.
 * mejora_entrada: paso tomado mientras la entrada anterior seguía abierta (permitido).
 * recuperacion: paso tomado después de que la entrada anterior cerró en pérdida (violación del protocolo).
 */
export type TipoPaso = "inicial" | "mejora_entrada" | "recuperacion";

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
