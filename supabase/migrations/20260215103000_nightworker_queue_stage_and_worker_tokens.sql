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
