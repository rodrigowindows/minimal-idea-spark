
-- Drop NightWorker DB functions
DROP FUNCTION IF EXISTS public.claim_prompts(text, text, integer);
DROP FUNCTION IF EXISTS public.reset_stalled_prompts();
DROP FUNCTION IF EXISTS public.reorder_prioritized_prompts(uuid[]);

-- Drop NightWorker tables (respect FK order)
DROP TABLE IF EXISTS public.nw_prompt_events CASCADE;
DROP TABLE IF EXISTS public.nw_prompts CASCADE;
DROP TABLE IF EXISTS public.nw_templates CASCADE;
DROP TABLE IF EXISTS public.nw_projects CASCADE;
DROP TABLE IF EXISTS public.nw_worker_heartbeats CASCADE;
DROP TABLE IF EXISTS public.nw_worker_tokens CASCADE;

-- Drop merged/unused tables
DROP TABLE IF EXISTS public.user_priorities CASCADE;
DROP TABLE IF EXISTS public.ideas CASCADE;
