-- =============================================
-- ALL PENDING NIGHTWORKER MIGRATIONS
-- Apply in Supabase Dashboard > SQL Editor
-- =============================================

-- === 20260215090000_nightworker_claim_processing_heartbeats.sql ===
-- NightWorker lifecycle hardening: provider/status constraints, atomic claim, stalled reset, and heartbeats

-- Ensure provider/status constraints include Gemini and processing lifecycle.
alter table if exists public.nw_prompts
  drop constraint if exists nw_prompts_provider_check;

alter table if exists public.nw_prompts
  add constraint nw_prompts_provider_check
  check (provider in ('codex', 'claude', 'codex_cli', 'claude_cli', 'openai_api', 'gemini', 'gemini_cli'));

alter table if exists public.nw_prompts
  drop constraint if exists nw_prompts_status_check;

alter table if exists public.nw_prompts
  add constraint nw_prompts_status_check
  check (status in ('pending', 'processing', 'done', 'failed'));

-- Processing ownership columns used by atomic claim.
alter table if exists public.nw_prompts
  add column if not exists worker_id text;

alter table if exists public.nw_prompts
  add column if not exists processing_started_at timestamptz;

create index if not exists idx_nw_prompts_processing_started_at
  on public.nw_prompts (processing_started_at)
  where status = 'processing';

-- Atomically claim pending prompts for a worker.
create or replace function public.claim_prompts(
  p_provider text,
  p_worker_id text,
  p_limit int default 10
)
returns setof public.nw_prompts
language plpgsql
as $$
declare
  v_limit int := greatest(coalesce(p_limit, 10), 1);
begin
  if p_worker_id is null or btrim(p_worker_id) = '' then
    raise exception 'p_worker_id is required';
  end if;

  return query
  with candidate as (
    select p.id
    from public.nw_prompts p
    where p.status = 'pending'
      and p.provider = p_provider
      and (p.next_retry_at is null or p.next_retry_at <= now())
    order by p.created_at asc
    limit v_limit
    for update skip locked
  ),
  claimed as (
    update public.nw_prompts p
    set
      status = 'processing',
      worker_id = p_worker_id,
      processing_started_at = now()
    from candidate c
    where p.id = c.id
    returning p.*
  )
  select * from claimed;
end;
$$;

grant execute on function public.claim_prompts(text, text, int) to service_role;

-- Reset prompts stuck in processing when workers crash.
create or replace function public.reset_stalled_prompts()
returns setof public.nw_prompts
language plpgsql
as $$
begin
  return query
  update public.nw_prompts
  set
    status = 'pending',
    worker_id = null,
    processing_started_at = null,
    attempts = coalesce(attempts, 0) + 1,
    error = 'Worker timeout - reset by cron'
  where status = 'processing'
    and processing_started_at < now() - interval '15 minutes'
  returning *;
end;
$$;

grant execute on function public.reset_stalled_prompts() to service_role;

-- Worker heartbeats used by /health endpoint.
create table if not exists public.nw_worker_heartbeats (
  worker_id text primary key,
  provider text not null check (provider in ('codex', 'claude', 'codex_cli', 'claude_cli', 'openai_api', 'gemini', 'gemini_cli')),
  last_seen timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'paused', 'error'))
);

create index if not exists idx_nw_worker_heartbeats_last_seen
  on public.nw_worker_heartbeats (last_seen desc);

alter table public.nw_worker_heartbeats enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'nw_worker_heartbeats'
      and policyname = 'nw_worker_heartbeats_select_auth'
  ) then
    create policy nw_worker_heartbeats_select_auth
      on public.nw_worker_heartbeats
      for select
      to authenticated, service_role
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'nw_worker_heartbeats'
      and policyname = 'nw_worker_heartbeats_insert_service'
  ) then
    create policy nw_worker_heartbeats_insert_service
      on public.nw_worker_heartbeats
      for insert
      to service_role
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'nw_worker_heartbeats'
      and policyname = 'nw_worker_heartbeats_update_service'
  ) then
    create policy nw_worker_heartbeats_update_service
      on public.nw_worker_heartbeats
      for update
      to service_role
      using (true)
      with check (true);
  end if;
end;
$$;

grant select on public.nw_worker_heartbeats to anon, authenticated;
grant all privileges on public.nw_worker_heartbeats to service_role;

-- Auto-reset stalled prompts every 15 min when pg_cron is available.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'cron'
        and p.proname = 'schedule'
        and p.pronargs = 3
    ) then
      begin
        perform cron.unschedule('reset-stalled-nw-prompts');
      exception
        when others then
          null;
      end;

      perform cron.schedule(
        'reset-stalled-nw-prompts',
        '*/15 * * * *',
        'select public.reset_stalled_prompts();'
      );
    else
      raise notice 'pg_cron found but named cron.schedule(signature with 3 args) is unavailable; skipping auto-schedule';
    end if;
  else
    raise notice 'pg_cron extension is not installed; skipping auto-schedule for reset_stalled_prompts';
  end if;
end;
$$;


-- === 20260215103000_nightworker_queue_stage_and_worker_tokens.sql ===
-- NightWorker queue orchestration + worker tokens

-- Queue fields to make kanban control real execution.
alter table if exists public.nw_prompts
  add column if not exists queue_stage text;

alter table if exists public.nw_prompts
  add column if not exists priority_order integer;

alter table if exists public.nw_prompts
  add column if not exists cloned_from uuid references public.nw_prompts(id);

alter table if exists public.nw_prompts
  drop constraint if exists nw_prompts_queue_stage_check;

alter table if exists public.nw_prompts
  add constraint nw_prompts_queue_stage_check
  check (queue_stage in ('backlog', 'prioritized'));

-- Backfill existing rows so rollout is non-breaking.
update public.nw_prompts
set queue_stage = 'prioritized'
where queue_stage is null;

alter table if exists public.nw_prompts
  alter column queue_stage set not null;

-- New prompts default to backlog; existing prompts remain prioritized.
alter table if exists public.nw_prompts
  alter column queue_stage set default 'backlog';

-- Initialize priority order for current prioritized+pending rows.
with ranked as (
  select id, row_number() over (order by created_at asc, id asc) as rn
  from public.nw_prompts
  where status = 'pending' and queue_stage = 'prioritized'
)
update public.nw_prompts p
set priority_order = ranked.rn
from ranked
where p.id = ranked.id
  and p.priority_order is null;

create index if not exists idx_nw_prompts_pending_prioritized_order
  on public.nw_prompts (priority_order asc, created_at asc)
  where status = 'pending' and queue_stage = 'prioritized';

create index if not exists idx_nw_prompts_queue_stage_status
  on public.nw_prompts (queue_stage, status);

create index if not exists idx_nw_prompts_cloned_from
  on public.nw_prompts (cloned_from)
  where cloned_from is not null;

-- Atomic claim now respects queue_stage + priority order.
create or replace function public.claim_prompts(
  p_provider text,
  p_worker_id text,
  p_limit int default 10
)
returns setof public.nw_prompts
language plpgsql
as $$
declare
  v_limit int := greatest(coalesce(p_limit, 10), 1);
begin
  if p_worker_id is null or btrim(p_worker_id) = '' then
    raise exception 'p_worker_id is required';
  end if;

  return query
  with candidate as (
    select p.id
    from public.nw_prompts p
    where p.status = 'pending'
      and p.queue_stage = 'prioritized'
      and p.provider = p_provider
      and (p.next_retry_at is null or p.next_retry_at <= now())
    order by p.priority_order asc nulls last, p.created_at asc, p.id asc
    limit v_limit
    for update skip locked
  ),
  claimed as (
    update public.nw_prompts p
    set
      status = 'processing',
      worker_id = p_worker_id,
      processing_started_at = now()
    from candidate c
    where p.id = c.id
    returning p.*
  )
  select * from claimed;
end;
$$;

grant execute on function public.claim_prompts(text, text, int) to service_role;

-- Reorder helper used by kanban drag-and-drop.
create or replace function public.reorder_prioritized_prompts(p_ids uuid[])
returns int
language plpgsql
as $$
declare
  v_count int := 0;
begin
  if p_ids is null or array_length(p_ids, 1) is null then
    return 0;
  end if;

  with ordered as (
    select id, row_number() over () as pos
    from unnest(p_ids) as id
  ),
  updated as (
    update public.nw_prompts p
    set
      queue_stage = 'prioritized',
      priority_order = o.pos
    from ordered o
    where p.id = o.id
      and p.status = 'pending'
    returning p.id
  )
  select count(*) into v_count from updated;

  return v_count;
end;
$$;

grant execute on function public.reorder_prioritized_prompts(uuid[]) to service_role;

-- Scoped worker tokens (alternative to service_role in workers).
create table if not exists public.nw_worker_tokens (
  id uuid primary key default gen_random_uuid(),
  worker_name text not null,
  token_hash text not null unique,
  scopes text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  notes text
);

create index if not exists idx_nw_worker_tokens_active_hash
  on public.nw_worker_tokens (token_hash)
  where revoked_at is null;

alter table public.nw_worker_tokens enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'nw_worker_tokens'
      and policyname = 'nw_worker_tokens_service_only'
  ) then
    create policy nw_worker_tokens_service_only
      on public.nw_worker_tokens
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end;
$$;

grant all privileges on public.nw_worker_tokens to service_role;


-- === 20260216000000_nightworker_pipeline_support.sql ===
-- NightWorker pipeline templates support (multi-step chaining + idempotent step creation)

alter table if exists public.nw_prompts
  add column if not exists pipeline_config jsonb,
  add column if not exists pipeline_id uuid,
  add column if not exists pipeline_step integer,
  add column if not exists pipeline_total_steps integer,
  add column if not exists pipeline_template_name text;

alter table if exists public.nw_prompts
  drop constraint if exists chk_pipeline_step_positive;

alter table if exists public.nw_prompts
  add constraint chk_pipeline_step_positive
  check (pipeline_id is null or (pipeline_step is not null and pipeline_step >= 1));

alter table if exists public.nw_prompts
  drop constraint if exists chk_pipeline_total_steps_valid;

alter table if exists public.nw_prompts
  add constraint chk_pipeline_total_steps_valid
  check (
    pipeline_id is null
    or (
      pipeline_total_steps is not null
      and pipeline_total_steps >= pipeline_step
      and pipeline_total_steps >= 1
    )
  );

create index if not exists idx_nw_prompts_pipeline_id
  on public.nw_prompts (pipeline_id)
  where pipeline_id is not null;

-- Allow reprocess clones to reuse a step number, but keep canonical step creation idempotent.
drop index if exists idx_nw_prompts_pipeline_step_unique;
create unique index if not exists idx_nw_prompts_pipeline_step_unique
  on public.nw_prompts (pipeline_id, pipeline_step)
  where pipeline_id is not null and cloned_from is null;

comment on column public.nw_prompts.pipeline_config is
  'Immutable pipeline metadata (template_version, steps, original_input) used for step chaining.';
comment on column public.nw_prompts.pipeline_id is
  'Pipeline execution identifier shared across all steps in a workflow run.';
comment on column public.nw_prompts.pipeline_step is
  '1-based step number for prompts that belong to a pipeline execution.';
comment on column public.nw_prompts.pipeline_total_steps is
  'Total number of steps configured for the pipeline execution.';
comment on column public.nw_prompts.pipeline_template_name is
  'Human-friendly pipeline template name captured at execution time.';


-- === 20260216110000_nightworker_claim_backlog_and_stalled_10m.sql ===
-- NightWorker queue behavior update:
-- 1) claim_prompts now prioritizes prioritized queue, then falls back to backlog
-- 2) reset_stalled_prompts timeout reduced from 15min to 10min

create or replace function public.claim_prompts(
  p_provider text,
  p_worker_id text,
  p_limit int default 10
)
returns setof public.nw_prompts
language plpgsql
as $$
declare
  v_limit int := greatest(coalesce(p_limit, 10), 1);
begin
  if p_worker_id is null or btrim(p_worker_id) = '' then
    raise exception 'p_worker_id is required';
  end if;

  return query
  with candidate as (
    select p.id
    from public.nw_prompts p
    where p.status = 'pending'
      and p.provider = p_provider
      and p.queue_stage in ('prioritized', 'backlog')
      and (p.next_retry_at is null or p.next_retry_at <= now())
    order by
      case when p.queue_stage = 'prioritized' then 0 else 1 end asc,
      case when p.queue_stage = 'prioritized' then p.priority_order else null end asc nulls last,
      p.created_at asc,
      p.id asc
    limit v_limit
    for update skip locked
  ),
  claimed as (
    update public.nw_prompts p
    set
      status = 'processing',
      worker_id = p_worker_id,
      processing_started_at = now()
    from candidate c
    where p.id = c.id
    returning p.*
  )
  select * from claimed;
end;
$$;

grant execute on function public.claim_prompts(text, text, int) to service_role;

create or replace function public.reset_stalled_prompts()
returns setof public.nw_prompts
language plpgsql
as $$
begin
  return query
  update public.nw_prompts
  set
    status = 'pending',
    worker_id = null,
    processing_started_at = null,
    attempts = coalesce(attempts, 0) + 1,
    error = 'Worker timeout - reset by cron'
  where status = 'processing'
    and processing_started_at < now() - interval '10 minutes'
  returning *;
end;
$$;

grant execute on function public.reset_stalled_prompts() to service_role;

-- Keep schedule aligned with the new 10-minute stall timeout when pg_cron is available.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'cron'
        and p.proname = 'schedule'
        and p.pronargs = 3
    ) then
      begin
        perform cron.unschedule('reset-stalled-nw-prompts');
      exception
        when others then
          null;
      end;

      perform cron.schedule(
        'reset-stalled-nw-prompts',
        '*/10 * * * *',
        'select public.reset_stalled_prompts();'
      );
    end if;
  end if;
end;
$$;


