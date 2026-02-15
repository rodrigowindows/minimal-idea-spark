-- Add paused as a valid project status and skip paused/archived projects in claim.

alter table public.nw_projects
  drop constraint if exists nw_projects_status_check;

alter table public.nw_projects
  add constraint nw_projects_status_check
  check (status in ('active', 'archived', 'paused'));

create or replace function public.claim_prompts(
  p_provider text,
  p_worker_id text,
  p_limit int default 10
)
returns setof public.nw_prompts
language plpgsql
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 10), 1), 50);
begin
  if p_worker_id is null or btrim(p_worker_id) = '' then
    raise exception 'p_worker_id is required';
  end if;

  return query
  with candidate as (
    select p.id
    from public.nw_prompts p
    left join public.nw_projects proj on proj.id = p.project_id
    where p.status = 'pending'
      and p.provider = p_provider
      and p.queue_stage in ('prioritized', 'backlog')
      and (p.next_retry_at is null or p.next_retry_at <= now())
      and (p.project_id is null or proj.status = 'active')
    order by
      case when p.queue_stage = 'prioritized' then 0 else 1 end asc,
      case when p.queue_stage = 'prioritized' then p.priority_order else null end asc nulls last,
      p.created_at asc,
      p.id asc
    limit v_limit
    for update of p skip locked
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

comment on function public.claim_prompts(text, text, int) is
  'Claims pending prompts for a provider/worker, skipping prompts from paused or archived projects.';
