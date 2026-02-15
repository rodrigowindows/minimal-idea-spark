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
