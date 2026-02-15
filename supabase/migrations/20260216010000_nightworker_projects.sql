-- NightWorker project/process separation

create table if not exists public.nw_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  default_target_folder text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_nw_projects_status_updated
  on public.nw_projects (status, updated_at desc);

-- Reuse generic updated_at trigger function created in initial migrations.
drop trigger if exists trg_nw_projects_updated_at on public.nw_projects;
create trigger trg_nw_projects_updated_at
before update on public.nw_projects
for each row execute procedure public.set_nw_prompts_updated_at();

alter table if exists public.nw_prompts
  add column if not exists project_id uuid references public.nw_projects(id) on delete set null;

create index if not exists idx_nw_prompts_project_id
  on public.nw_prompts (project_id)
  where project_id is not null;

alter table public.nw_projects enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'nw_projects'
      and policyname = 'nw_projects_select_auth'
  ) then
    create policy nw_projects_select_auth
      on public.nw_projects
      for select
      to anon, authenticated, service_role
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'nw_projects'
      and policyname = 'nw_projects_insert_service'
  ) then
    create policy nw_projects_insert_service
      on public.nw_projects
      for insert
      to service_role
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'nw_projects'
      and policyname = 'nw_projects_update_service'
  ) then
    create policy nw_projects_update_service
      on public.nw_projects
      for update
      to service_role
      using (true)
      with check (true);
  end if;
end;
$$;

grant select on public.nw_projects to anon, authenticated;
grant all privileges on public.nw_projects to service_role;

comment on table public.nw_projects is
  'Logical projects/processes used to group prompts and run pipeline templates in separated flows.';
comment on column public.nw_prompts.project_id is
  'Optional project/process owner for prompt grouping and project-scoped pipelines.';
