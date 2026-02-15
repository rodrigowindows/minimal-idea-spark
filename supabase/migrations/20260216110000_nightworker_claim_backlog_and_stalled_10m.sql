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
