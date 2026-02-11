-- Additional indexes for observability and performance

-- Index on events created_at for time-range queries in dashboards
create index if not exists idx_nw_prompt_events_created_at
  on public.nw_prompt_events (created_at desc);

-- Partial index: only pending prompts where next_retry_at has passed
-- Optimizes the worker query for prompts ready to retry
create index if not exists idx_nw_prompts_pending_retry
  on public.nw_prompts (next_retry_at)
  where status = 'pending' and next_retry_at is not null;

-- Index on updated_at for sorting by last-modified in dashboards
create index if not exists idx_nw_prompts_updated_at
  on public.nw_prompts (updated_at desc);

-- Grant DELETE on nw_prompts to service_role only (explicit, already covered by ALL)
-- No change needed; service_role already has ALL.

-- Restrict anon from inserting prompts (anon should only SELECT)
revoke insert on public.nw_prompts from anon;

-- Ensure events INSERT is allowed from service_role (already via ALL)
-- and from authenticated (so a dashboard can log custom events)
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename='nw_prompt_events' and policyname='nw_prompt_events_insert_auth'
  ) then
    create policy nw_prompt_events_insert_auth on public.nw_prompt_events for insert
      to authenticated with check (true);
  end if;
end$$;

grant insert on public.nw_prompt_events to authenticated;
