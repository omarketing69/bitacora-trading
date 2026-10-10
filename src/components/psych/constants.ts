export interface Emocion {
  id: string;
  label: string;
  emoji: string;
  /** Emociones que suelen empujar a decisiones impulsivas cuando son intensas. */
  riesgo: boolean;
}

export const EMOCIONES: Emocion[] = [
  { id: "calma", label: "Calma", emoji: "😌", riesgo: false },
  { id: "confianza", label: "Confianza", emoji: "🙂", riesgo: false },
  { id: "ansiedad", label: "Ansiedad", emoji: "😰", riesgo: true },
  { id: "frustracion", label: "Frustración", emoji: "😤", riesgo: true },
  { id: "euforia", label: "Euforia", emoji: "🤩", riesgo: true },
  { id: "cansancio", label: "Cansancio", emoji: "🥱", riesgo: true },
];

export const emocionPorId = (id?: string | null) => EMOCIONES.find((e) => e.id === id);

/** Intensidad a partir de la cual una emoción de riesgo bloquea / advierte. */
export const INTENSIDAD_ALERTA = 4;

export const CHECKLIST_PREVIO = [
  { id: "descanso", texto: "Dormí bien y estoy descansado" },
  { id: "sin_recuperar", texto: "No vengo a recuperar pérdidas de días anteriores" },
  { id: "acepto_limite", texto: "Acepto que si pierdo 1 ciclo, cierro la sesión" },
  { id: "tiempo", texto: "Tengo al menos 30 minutos sin interrupciones" },
  { id: "contexto_15m", texto: "Revisé el contexto de 15 minutos" },
  { id: "setup_ema", texto: "Tengo claro qué cruce/condición de EMAs busco" },
  { id: "noticias", texto: "Revisé que no haya noticias de alto impacto" },
] as const;

/** Puntaje mínimo de preparación para operar en REAL sin advertencia. */
export const PUNTAJE_MINIMO_REAL = 85;

export const SENALES_EMA = [
  "Cruce alcista de EMAs",
  "Cruce bajista de EMAs",
  "Rebote en EMA a favor de tendencia",
  "Ruptura y retesteo de EMA",
  "Otra",
];

export const CONTEXTOS_15M = ["Tendencia alcista", "Tendencia bajista", "Lateral / rango", "Sin claridad"];

export const EXPIRACION_DEFECTO_SEG = 300;

export const MOTIVOS_CIERRE: Record<string, string> = {
  limite_perdida: "Límite de pérdida alcanzado",
  objetivo_ganancias: "Objetivo de 2 ciclos ganados cumplido",
  recuperacion: "Entrada de recuperación después de una pérdida",
  manual: "Cierre manual",
  estado_emocional: "Estado emocional no apto",
};

/** Preguntas guiadas durante la pausa tras una pérdida. */
export const PREGUNTAS_PAUSA = [
  "¿La entrada cumplía todas tus reglas? Si sí, la pérdida es parte del sistema, no un error.",
  "¿Qué sientes en el cuerpo ahora mismo? Nómbralo sin juzgarlo.",
  "Si abrieras otra operación ahora, ¿sería por tu setup o por recuperar?",
  "¿Qué le dirías a un amigo que acaba de perder exactamente esta operación?",
];
