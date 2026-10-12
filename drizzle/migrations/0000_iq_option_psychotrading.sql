ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS plataforma TEXT NOT NULL DEFAULT 'Deriv',
  ADD COLUMN IF NOT EXISTS broker TEXT,
  ADD COLUMN IF NOT EXISTS modo TEXT,
  ADD COLUMN IF NOT EXISTS origen TEXT,
  ADD COLUMN IF NOT EXISTS bot TEXT,
  ADD COLUMN IF NOT EXISTS estrategia TEXT,
  ADD COLUMN IF NOT EXISTS categoria_estrategia TEXT,
  ADD COLUMN IF NOT EXISTS senal TEXT,
  ADD COLUMN IF NOT EXISTS payout_pct DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS expiracion_seg INTEGER,
  ADD COLUMN IF NOT EXISTS precio_entrada DECIMAL(18,6),
  ADD COLUMN IF NOT EXISTS precio_cierre DECIMAL(18,6),
  ADD COLUMN IF NOT EXISTS estado TEXT,
  ADD COLUMN IF NOT EXISTS ciclo_id TEXT,
  ADD COLUMN IF NOT EXISTS paso INTEGER,
  ADD COLUMN IF NOT EXISTS tipo_paso TEXT,
  ADD COLUMN IF NOT EXISTS id_externo TEXT,
  ADD COLUMN IF NOT EXISTS ema_senal TEXT,
  ADD COLUMN IF NOT EXISTS contexto_15m TEXT,
  ADD COLUMN IF NOT EXISTS estado_emocional TEXT,
  ADD COLUMN IF NOT EXISTS intensidad_emocional SMALLINT CHECK (intensidad_emocional BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS cumplio_reglas BOOLEAN,
  ADD COLUMN IF NOT EXISTS sesion_id UUID;

CREATE INDEX IF NOT EXISTS idx_trades_ciclo ON public.trades(user_id, ciclo_id);
CREATE INDEX IF NOT EXISTS idx_trades_sesion ON public.trades(sesion_id);

CREATE TABLE IF NOT EXISTS public.psych_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plataforma TEXT NOT NULL DEFAULT 'IQ Option',
  modo TEXT NOT NULL DEFAULT 'DEMO',
  iniciada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  cerrada_en TIMESTAMPTZ,
  checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  puntaje_preparacion SMALLINT,
  emocion_inicial TEXT,
  intensidad_inicial SMALLINT CHECK (intensidad_inicial BETWEEN 1 AND 5),
  limite_ciclos_perdidos SMALLINT NOT NULL DEFAULT 1,
  limite_ciclos_ganados SMALLINT NOT NULL DEFAULT 2,
  pausa_minutos SMALLINT NOT NULL DEFAULT 10,
  pausa_hasta TIMESTAMPTZ,
  motivo_cierre TEXT,
  emocion_final TEXT,
  reflexion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.psych_sessions TO authenticated;
GRANT ALL ON public.psych_sessions TO service_role;

CREATE INDEX IF NOT EXISTS idx_psych_sessions_user ON public.psych_sessions(user_id, iniciada_en DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trades_sesion_id_fkey') THEN
    ALTER TABLE public.trades
      ADD CONSTRAINT trades_sesion_id_fkey
      FOREIGN KEY (sesion_id) REFERENCES public.psych_sessions(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.psych_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sesion_id UUID NOT NULL REFERENCES public.psych_sessions(id) ON DELETE CASCADE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  tipo TEXT NOT NULL,
  emocion TEXT,
  intensidad SMALLINT CHECK (intensidad BETWEEN 1 AND 5),
  trade_id TEXT REFERENCES public.trades(id) ON DELETE SET NULL,
  datos JSONB NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.psych_events TO authenticated;
GRANT ALL ON public.psych_events TO service_role;

CREATE INDEX IF NOT EXISTS idx_psych_events_sesion ON public.psych_events(sesion_id, creado_en);

ALTER TABLE public.psych_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.psych_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage their own psych sessions' AND tablename = 'psych_sessions') THEN
    CREATE POLICY "Users manage their own psych sessions"
      ON public.psych_sessions FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage their own psych events' AND tablename = 'psych_events') THEN
    CREATE POLICY "Users manage their own psych events"
      ON public.psych_events FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;