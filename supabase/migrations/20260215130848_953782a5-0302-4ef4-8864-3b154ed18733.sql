-- NightWorker pipeline support: add all columns and indexes in one shot
alter table public.nw_prompts
  add column if not exists pipeline_config jsonb,
  add column if not exists pipeline_id uuid,
  add column if not exists pipeline_step integer,
  add column if not exists pipeline_total_steps integer,
  add column if not exists pipeline_template_name text,
  add column if not exists cloned_from uuid;

alter table public.nw_prompts
  drop constraint if exists chk_pipeline_step_positive;
alter table public.nw_prompts
  add constraint chk_pipeline_step_positive
  check (pipeline_id is null or (pipeline_step is not null and pipeline_step >= 1));

alter table public.nw_prompts
  drop constraint if exists chk_pipeline_total_steps_valid;
alter table public.nw_prompts
  add constraint chk_pipeline_total_steps_valid
  check (pipeline_id is null or (pipeline_total_steps is not null and pipeline_total_steps >= pipeline_step and pipeline_total_steps >= 1));

create index if not exists idx_nw_prompts_pipeline_id on public.nw_prompts (pipeline_id) where pipeline_id is not null;

drop index if exists idx_nw_prompts_pipeline_step_unique;
create unique index idx_nw_prompts_pipeline_step_unique on public.nw_prompts (pipeline_id, pipeline_step) where pipeline_id is not null and cloned_from is null;