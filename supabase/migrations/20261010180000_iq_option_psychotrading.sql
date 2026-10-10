-- =====================================================================
-- IQ Option (via BotsStrike) + entrenador de psicotrading
-- Solo agrega columnas y tablas: no modifica ni borra datos existentes.
-- Las operaciones históricas de Deriv quedan con plataforma = 'Deriv'.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Nuevas columnas en trades (todas opcionales)
-- ---------------------------------------------------------------------
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS plataforma TEXT NOT NULL DEFAULT 'Deriv',
  ADD COLUMN IF NOT EXISTS broker TEXT,                 -- IQ Option, ExNova...
  ADD COLUMN IF NOT EXISTS modo TEXT,                   -- REAL / DEMO
  ADD COLUMN IF NOT EXISTS origen TEXT,                 -- manual / bot
  ADD COLUMN IF NOT EXISTS bot TEXT,
  ADD COLUMN IF NOT EXISTS estrategia TEXT,
  ADD COLUMN IF NOT EXISTS categoria_estrategia TEXT,
  ADD COLUMN IF NOT EXISTS senal TEXT,
  ADD COLUMN IF NOT EXISTS payout_pct DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS expiracion_seg INTEGER,
  ADD COLUMN IF NOT EXISTS precio_entrada DECIMAL(18,6),
  ADD COLUMN IF NOT EXISTS precio_cierre DECIMAL(18,6),
  ADD COLUMN IF NOT EXISTS estado TEXT,                 -- ganada / perdida / empate
  ADD COLUMN IF NOT EXISTS ciclo_id TEXT,               -- columna "Operación" de BotsStrike
  ADD COLUMN IF NOT EXISTS paso INTEGER,                -- 1 = entrada inicial, 2+ = pasos
  ADD COLUMN IF NOT EXISTS tipo_paso TEXT,              -- inicial / mejora_entrada / recuperacion
  ADD COLUMN IF NOT EXISTS id_externo TEXT,             -- columna "ID" de BotsStrike
  -- Datos que solo aporta el entrenador (no vienen en el CSV)
  ADD COLUMN IF NOT EXISTS ema_senal TEXT,
  ADD COLUMN IF NOT EXISTS contexto_15m TEXT,
  ADD COLUMN IF NOT EXISTS estado_emocional TEXT,
  ADD COLUMN IF NOT EXISTS intensidad_emocional SMALLINT CHECK (intensidad_emocional BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS cumplio_reglas BOOLEAN,
  ADD COLUMN IF NOT EXISTS sesion_id UUID;

CREATE INDEX IF NOT EXISTS idx_trades_ciclo ON public.trades(user_id, ciclo_id);
CREATE INDEX IF NOT EXISTS idx_trades_sesion ON public.trades(sesion_id);

-- ---------------------------------------------------------------------
-- 2. Sesiones de entrenamiento
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.psych_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plataforma TEXT NOT NULL DEFAULT 'IQ Option',
  modo TEXT NOT NULL DEFAULT 'DEMO',
  iniciada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  cerrada_en TIMESTAMPTZ,
  -- Preparación previa
  checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  puntaje_preparacion SMALLINT,
  emocion_inicial TEXT,
  intensidad_inicial SMALLINT CHECK (intensidad_inicial BETWEEN 1 AND 5),
  -- Reglas de la sesión (protocolo inicial: 1 ciclo perdido o 2 ganados)
  limite_ciclos_perdidos SMALLINT NOT NULL DEFAULT 1,
  limite_ciclos_ganados SMALLINT NOT NULL DEFAULT 2,
  pausa_minutos SMALLINT NOT NULL DEFAULT 10,
  pausa_hasta TIMESTAMPTZ,
  -- Cierre
  motivo_cierre TEXT,   -- limite_perdida / objetivo_ganancias / manual / estado_emocional
  emocion_final TEXT,
  reflexion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_psych_sessions_user ON public.psych_sessions(user_id, iniciada_en DESC);

ALTER TABLE public.trades
  ADD CONSTRAINT trades_sesion_id_fkey
  FOREIGN KEY (sesion_id) REFERENCES public.psych_sessions(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- 3. Eventos del entrenador (pre-entrada, impulsos, pausas, cierres)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.psych_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sesion_id UUID NOT NULL REFERENCES public.psych_sessions(id) ON DELETE CASCADE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- pre_entrada / resultado / impulso / pausa_inicio / pausa_fin / cierre / nota
  tipo TEXT NOT NULL,
  emocion TEXT,
  intensidad SMALLINT CHECK (intensidad BETWEEN 1 AND 5),
  trade_id TEXT REFERENCES public.trades(id) ON DELETE SET NULL,
  datos JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_psych_events_sesion ON public.psych_events(sesion_id, creado_en);

-- ---------------------------------------------------------------------
-- 4. Seguridad (RLS): cada usuario solo ve y modifica lo suyo
-- ---------------------------------------------------------------------
ALTER TABLE public.psych_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.psych_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own psych sessions"
  ON public.psych_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their own psych events"
  ON public.psych_events FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
