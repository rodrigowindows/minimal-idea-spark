-- Prevent changing project_id after prompt creation.
-- project_id is set once when a prompt is created (or via pipeline propagation)
-- and should not be reassigned to avoid breaking project-level reporting.

create or replace function public.prevent_prompt_project_reassignment()
returns trigger
language plpgsql
as $$
begin
  if old.project_id is not null
     and new.project_id is distinct from old.project_id then
    raise exception 'Cannot change project_id after it has been set (prompt_id=%)', old.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_nw_prompts_project_immutable on public.nw_prompts;
create trigger trg_nw_prompts_project_immutable
  before update on public.nw_prompts
  for each row
  when (old.project_id is not null and old.project_id is distinct from new.project_id)
  execute function public.prevent_prompt_project_reassignment();

comment on function public.prevent_prompt_project_reassignment() is
  'Prevents project_id from being changed after initial assignment on nw_prompts rows.';
