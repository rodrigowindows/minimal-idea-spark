
-- 1) Provider + status constraints
ALTER TABLE IF EXISTS public.nw_prompts DROP CONSTRAINT IF EXISTS nw_prompts_provider_check;
ALTER TABLE IF EXISTS public.nw_prompts ADD CONSTRAINT nw_prompts_provider_check CHECK (provider IN ('codex','claude','codex_cli','claude_cli','openai_api','gemini','gemini_cli'));
ALTER TABLE IF EXISTS public.nw_prompts DROP CONSTRAINT IF EXISTS nw_prompts_status_check;
ALTER TABLE IF EXISTS public.nw_prompts ADD CONSTRAINT nw_prompts_status_check CHECK (status IN ('pending','processing','done','failed'));

-- 2) Processing columns
ALTER TABLE IF EXISTS public.nw_prompts ADD COLUMN IF NOT EXISTS worker_id text;
ALTER TABLE IF EXISTS public.nw_prompts ADD COLUMN IF NOT EXISTS processing_started_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_nw_prompts_processing_started_at ON public.nw_prompts (processing_started_at) WHERE status = 'processing';

-- 3) Queue columns
ALTER TABLE IF EXISTS public.nw_prompts ADD COLUMN IF NOT EXISTS queue_stage text;
ALTER TABLE IF EXISTS public.nw_prompts ADD COLUMN IF NOT EXISTS priority_order integer;
ALTER TABLE IF EXISTS public.nw_prompts DROP CONSTRAINT IF EXISTS nw_prompts_queue_stage_check;
ALTER TABLE IF EXISTS public.nw_prompts ADD CONSTRAINT nw_prompts_queue_stage_check CHECK (queue_stage IN ('backlog','prioritized'));
UPDATE public.nw_prompts SET queue_stage = 'prioritized' WHERE queue_stage IS NULL;
ALTER TABLE IF EXISTS public.nw_prompts ALTER COLUMN queue_stage SET NOT NULL;
ALTER TABLE IF EXISTS public.nw_prompts ALTER COLUMN queue_stage SET DEFAULT 'backlog';
CREATE INDEX IF NOT EXISTS idx_nw_prompts_pending_prioritized_order ON public.nw_prompts (priority_order ASC, created_at ASC) WHERE status = 'pending' AND queue_stage = 'prioritized';
CREATE INDEX IF NOT EXISTS idx_nw_prompts_queue_stage_status ON public.nw_prompts (queue_stage, status);
CREATE INDEX IF NOT EXISTS idx_nw_prompts_cloned_from ON public.nw_prompts (cloned_from) WHERE cloned_from IS NOT NULL;

-- 4) Pipeline constraints and indexes
ALTER TABLE IF EXISTS public.nw_prompts DROP CONSTRAINT IF EXISTS chk_pipeline_step_positive;
ALTER TABLE IF EXISTS public.nw_prompts ADD CONSTRAINT chk_pipeline_step_positive CHECK (pipeline_id IS NULL OR (pipeline_step IS NOT NULL AND pipeline_step >= 1));
ALTER TABLE IF EXISTS public.nw_prompts DROP CONSTRAINT IF EXISTS chk_pipeline_total_steps_valid;
ALTER TABLE IF EXISTS public.nw_prompts ADD CONSTRAINT chk_pipeline_total_steps_valid CHECK (pipeline_id IS NULL OR (pipeline_total_steps IS NOT NULL AND pipeline_total_steps >= pipeline_step AND pipeline_total_steps >= 1));
CREATE INDEX IF NOT EXISTS idx_nw_prompts_pipeline_id ON public.nw_prompts (pipeline_id) WHERE pipeline_id IS NOT NULL;
DROP INDEX IF EXISTS idx_nw_prompts_pipeline_step_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_nw_prompts_pipeline_step_unique ON public.nw_prompts (pipeline_id, pipeline_step) WHERE pipeline_id IS NOT NULL AND cloned_from IS NULL;

-- 5) Projects table
CREATE TABLE IF NOT EXISTS public.nw_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 500),
  description text,
  default_target_folder text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','paused')),
  sla_timeout_seconds integer NOT NULL DEFAULT 300,
  sla_max_retries integer NOT NULL DEFAULT 3,
  sla_retry_delay_seconds integer NOT NULL DEFAULT 60,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nw_projects_status ON public.nw_projects (status);
ALTER TABLE public.nw_projects ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='nw_projects' AND policyname='nw_projects_select_all') THEN
    CREATE POLICY nw_projects_select_all ON public.nw_projects FOR SELECT TO anon, authenticated, service_role USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='nw_projects' AND policyname='nw_projects_modify_service') THEN
    CREATE POLICY nw_projects_modify_service ON public.nw_projects FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
GRANT SELECT ON public.nw_projects TO anon, authenticated;
GRANT ALL PRIVILEGES ON public.nw_projects TO service_role;

-- 6) Pipeline templates table
CREATE TABLE IF NOT EXISTS public.nw_pipeline_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 500),
  description text,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  version integer NOT NULL DEFAULT 1,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.nw_pipeline_templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='nw_pipeline_templates' AND policyname='nw_pipeline_templates_select_all') THEN
    CREATE POLICY nw_pipeline_templates_select_all ON public.nw_pipeline_templates FOR SELECT TO anon, authenticated, service_role USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='nw_pipeline_templates' AND policyname='nw_pipeline_templates_modify_service') THEN
    CREATE POLICY nw_pipeline_templates_modify_service ON public.nw_pipeline_templates FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
GRANT SELECT ON public.nw_pipeline_templates TO anon, authenticated;
GRANT ALL PRIVILEGES ON public.nw_pipeline_templates TO service_role;

-- 7) FK columns on nw_prompts
ALTER TABLE IF EXISTS public.nw_prompts ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.nw_projects(id);
CREATE INDEX IF NOT EXISTS idx_nw_prompts_project_id ON public.nw_prompts (project_id) WHERE project_id IS NOT NULL;
ALTER TABLE IF EXISTS public.nw_prompts ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.nw_pipeline_templates(id);
ALTER TABLE IF EXISTS public.nw_prompts ADD COLUMN IF NOT EXISTS template_version integer;

-- 8) Worker tokens table
CREATE TABLE IF NOT EXISTS public.nw_worker_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_name text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT array[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  notes text
);
CREATE INDEX IF NOT EXISTS idx_nw_worker_tokens_active_hash ON public.nw_worker_tokens (token_hash) WHERE revoked_at IS NULL;
ALTER TABLE public.nw_worker_tokens ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='nw_worker_tokens' AND policyname='nw_worker_tokens_service_only') THEN
    CREATE POLICY nw_worker_tokens_service_only ON public.nw_worker_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
GRANT ALL PRIVILEGES ON public.nw_worker_tokens TO service_role;

-- 9) RPC functions
CREATE OR REPLACE FUNCTION public.claim_prompts(p_provider text, p_worker_id text, p_limit int DEFAULT 10)
RETURNS setof public.nw_prompts LANGUAGE plpgsql AS $$
DECLARE v_limit int := greatest(coalesce(p_limit,10),1);
BEGIN
  IF p_worker_id IS NULL OR btrim(p_worker_id)='' THEN RAISE EXCEPTION 'p_worker_id is required'; END IF;
  RETURN QUERY
  WITH candidate AS (
    SELECT p.id FROM public.nw_prompts p
    WHERE p.status='pending' AND p.provider=p_provider
      AND p.queue_stage IN ('prioritized','backlog')
      AND (p.next_retry_at IS NULL OR p.next_retry_at<=now())
    ORDER BY CASE WHEN p.queue_stage='prioritized' THEN 0 ELSE 1 END, CASE WHEN p.queue_stage='prioritized' THEN p.priority_order ELSE NULL END ASC NULLS LAST, p.created_at, p.id
    LIMIT v_limit FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE public.nw_prompts p SET status='processing', worker_id=p_worker_id, processing_started_at=now() FROM candidate c WHERE p.id=c.id RETURNING p.*
  ) SELECT * FROM claimed;
END; $$;
GRANT EXECUTE ON FUNCTION public.claim_prompts(text,text,int) TO service_role;

CREATE OR REPLACE FUNCTION public.reset_stalled_prompts()
RETURNS setof public.nw_prompts LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY UPDATE public.nw_prompts SET status='pending', worker_id=NULL, processing_started_at=NULL, attempts=coalesce(attempts,0)+1, error='Worker timeout - reset by cron'
  WHERE status='processing' AND processing_started_at < now() - interval '10 minutes' RETURNING *;
END; $$;
GRANT EXECUTE ON FUNCTION public.reset_stalled_prompts() TO service_role;

CREATE OR REPLACE FUNCTION public.reorder_prioritized_prompts(p_ids uuid[])
RETURNS int LANGUAGE plpgsql AS $$
DECLARE v_count int := 0;
BEGIN
  IF p_ids IS NULL OR array_length(p_ids,1) IS NULL THEN RETURN 0; END IF;
  WITH ordered AS (SELECT id, row_number() OVER () AS pos FROM unnest(p_ids) AS id),
  updated AS (UPDATE public.nw_prompts p SET queue_stage='prioritized', priority_order=o.pos FROM ordered o WHERE p.id=o.id AND p.status='pending' RETURNING p.id)
  SELECT count(*) INTO v_count FROM updated;
  RETURN v_count;
END; $$;
GRANT EXECUTE ON FUNCTION public.reorder_prioritized_prompts(uuid[]) TO service_role;
