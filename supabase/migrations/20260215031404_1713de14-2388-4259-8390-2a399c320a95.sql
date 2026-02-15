
-- Table for worker heartbeats (referenced by edge function)
CREATE TABLE IF NOT EXISTS public.nw_worker_heartbeats (
  worker_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nw_worker_heartbeats ENABLE ROW LEVEL SECURITY;

-- Only service_role can read/write heartbeats
CREATE POLICY "Service role full access on nw_worker_heartbeats"
  ON public.nw_worker_heartbeats
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to atomically claim pending prompts for a worker
CREATE OR REPLACE FUNCTION public.claim_prompts(
  p_provider TEXT,
  p_worker_id TEXT,
  p_limit INT DEFAULT 10
)
RETURNS SETOF public.nw_prompts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE nw_prompts
  SET status = 'processing',
      updated_at = now()
  WHERE id IN (
    SELECT id FROM nw_prompts
    WHERE status = 'pending'
      AND provider = p_provider
    ORDER BY created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;
