-- Tabela simples de ideias
CREATE TABLE public.ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;

-- Política pública para leitura (qualquer um pode ver)
CREATE POLICY "Anyone can read ideas"
  ON public.ideas FOR SELECT
  USING (true);