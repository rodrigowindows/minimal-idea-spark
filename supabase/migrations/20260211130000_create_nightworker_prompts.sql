-- Night Worker prompts persistence
create table if not exists public.nw_prompts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider text not null check (provider in ('codex','claude','codex_cli','claude_cli','openai_api')),
  content text,
  target_folder text,
  status text not null default 'pending' check (status in ('pending','done','failed')),
  result_path text,
  result_content text,
  error text,
  attempts integer not null default 0,
  next_retry_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nw_prompt_events (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.nw_prompts(id) on delete cascade,
  type text not null,
  message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_nw_prompts_status on public.nw_prompts(status);
create index if not exists idx_nw_prompts_provider on public.nw_prompts(provider);
create index if not exists idx_nw_prompts_created_at on public.nw_prompts(created_at desc);
create index if not exists idx_nw_prompt_events_prompt_id on public.nw_prompt_events(prompt_id);

-- simple trigger to keep updated_at fresh
create or replace function public.set_nw_prompts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_nw_prompts_updated_at on public.nw_prompts;
create trigger trg_nw_prompts_updated_at
before update on public.nw_prompts
for each row execute procedure public.set_nw_prompts_updated_at();

alter table public.nw_prompts enable row level security;
alter table public.nw_prompt_events enable row level security;

-- Policies: allow read to authenticated, writes only to authenticated and service_role
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename='nw_prompts' and policyname='nw_prompts_select_auth'
  ) then
    create policy nw_prompts_select_auth on public.nw_prompts for select
      to authenticated, service_role using (true);
  end if;

  if not exists (
    select 1 from pg_policies where tablename='nw_prompts' and policyname='nw_prompts_insert_auth'
  ) then
    create policy nw_prompts_insert_auth on public.nw_prompts for insert
      to authenticated, service_role with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where tablename='nw_prompts' and policyname='nw_prompts_update_service'
  ) then
    create policy nw_prompts_update_service on public.nw_prompts for update
      to service_role using (true) with check (true);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename='nw_prompt_events' and policyname='nw_prompt_events_select_auth'
  ) then
    create policy nw_prompt_events_select_auth on public.nw_prompt_events for select
      to authenticated, service_role using (true);
  end if;

  if not exists (
    select 1 from pg_policies where tablename='nw_prompt_events' and policyname='nw_prompt_events_insert_service'
  ) then
    create policy nw_prompt_events_insert_service on public.nw_prompt_events for insert
      to service_role with check (true);
  end if;
end$$;

grant select on public.nw_prompts to anon, authenticated;
grant insert on public.nw_prompts to authenticated;
grant all privileges on public.nw_prompts to service_role;
grant select on public.nw_prompt_events to anon, authenticated;
grant all privileges on public.nw_prompt_events to service_role;
