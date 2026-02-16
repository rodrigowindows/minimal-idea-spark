ALTER TABLE public.nw_templates
  ADD COLUMN IF NOT EXISTS context_mode text DEFAULT NULL
  CHECK (context_mode IN ('previous_only', 'all_steps'));

UPDATE public.nw_templates SET context_mode = 'all_steps' WHERE is_default = true AND context_mode IS NULL;