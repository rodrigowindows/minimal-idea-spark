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
