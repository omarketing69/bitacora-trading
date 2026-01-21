-- Create trades table with user_id for multi-user support
CREATE TABLE public.trades (
  id TEXT NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha_entrada TIMESTAMPTZ NOT NULL,
  fecha_salida TIMESTAMPTZ NOT NULL,
  instrumento TEXT NOT NULL,
  moneda TEXT NOT NULL DEFAULT 'USD',
  direccion TEXT NOT NULL CHECK (direccion IN ('Compra', 'Venta')),
  stake_usd DECIMAL(12,2) NOT NULL,
  resultado_usd DECIMAL(12,2) NOT NULL,
  saldo_antes DECIMAL(12,2) NOT NULL,
  saldo_despues DECIMAL(12,2) NOT NULL,
  riesgo_pct_cuenta DECIMAL(5,2),
  resultado_pct_cuenta DECIMAL(5,2),
  tf_principal TEXT,
  contexto_1h TEXT,
  posicion_en_canal TEXT,
  tipo_setup TEXT,
  entrada_por TEXT,
  stop_plan_usd DECIMAL(12,2),
  tp_plan_usd DECIMAL(12,2),
  motivo_salida TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own trades
CREATE POLICY "Users can view their own trades"
  ON public.trades FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trades"
  ON public.trades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trades"
  ON public.trades FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trades"
  ON public.trades FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster queries by user
CREATE INDEX idx_trades_user_id ON public.trades(user_id);
CREATE INDEX idx_trades_fecha ON public.trades(user_id, fecha_entrada DESC);