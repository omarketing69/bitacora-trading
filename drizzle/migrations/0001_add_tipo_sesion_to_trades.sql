ALTER TABLE public.trades ADD COLUMN tipo_sesion text NOT NULL DEFAULT 'principal';
ALTER TABLE public.trades ADD CONSTRAINT trades_tipo_sesion_check CHECK (tipo_sesion IN ('principal', 'practica'));