-- Index on nw_prompts for common query patterns
CREATE INDEX IF NOT EXISTS idx_nw_prompts_status_provider_created 
  ON public.nw_prompts (status, provider, created_at DESC);

-- Index on nw_prompt_events for prompt lookup
CREATE INDEX IF NOT EXISTS idx_nw_prompt_events_prompt_id_created 
  ON public.nw_prompt_events (prompt_id, created_at DESC);

NOTIFY pgrst, 'reload schema';