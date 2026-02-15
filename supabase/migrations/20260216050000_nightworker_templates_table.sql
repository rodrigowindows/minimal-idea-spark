-- Persistent templates with versioning.

create table if not exists public.nw_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  steps jsonb not null default '[]'::jsonb,
  version int not null default 1,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_nw_templates_name on public.nw_templates (name);

drop trigger if exists trg_nw_templates_updated_at on public.nw_templates;
create trigger trg_nw_templates_updated_at
  before update on public.nw_templates
  for each row execute procedure public.set_nw_prompts_updated_at();

create or replace function public.increment_template_version()
returns trigger
language plpgsql
as $$
begin
  new.version := old.version + 1;
  return new;
end;
$$;

drop trigger if exists trg_nw_templates_version on public.nw_templates;
create trigger trg_nw_templates_version
  before update on public.nw_templates
  for each row
  when (old.steps is distinct from new.steps)
  execute function public.increment_template_version();

alter table public.nw_templates enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'nw_templates' and policyname = 'nw_templates_select_all'
  ) then
    create policy nw_templates_select_all
      on public.nw_templates
      for select to anon, authenticated, service_role
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'nw_templates' and policyname = 'nw_templates_insert_service'
  ) then
    create policy nw_templates_insert_service
      on public.nw_templates
      for insert to service_role
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'nw_templates' and policyname = 'nw_templates_update_service'
  ) then
    create policy nw_templates_update_service
      on public.nw_templates
      for update to service_role
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'nw_templates' and policyname = 'nw_templates_delete_service'
  ) then
    create policy nw_templates_delete_service
      on public.nw_templates
      for delete to service_role
      using (true);
  end if;
end;
$$;

grant select on public.nw_templates to anon, authenticated;
grant all privileges on public.nw_templates to service_role;

alter table public.nw_prompts
  add column if not exists template_id uuid references public.nw_templates(id) on delete set null,
  add column if not exists template_version int;

comment on table public.nw_templates is 'Pipeline templates with automatic versioning.';
comment on column public.nw_prompts.template_id is 'Reference to the template used to create this prompt.';
comment on column public.nw_prompts.template_version is 'Version of the template at the time the prompt was created.';
