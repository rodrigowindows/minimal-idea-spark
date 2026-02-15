-- SLA configuration per project: timeout and retry policy.

alter table public.nw_projects
  add column if not exists sla_timeout_seconds int default 300,
  add column if not exists sla_max_retries int default 3,
  add column if not exists sla_retry_delay_seconds int default 60;

comment on column public.nw_projects.sla_timeout_seconds is
  'Maximum seconds a prompt can stay in processing before being marked as stalled. Default 300 (5 min).';
comment on column public.nw_projects.sla_max_retries is
  'Maximum retry attempts for failed prompts in this project. Default 3.';
comment on column public.nw_projects.sla_retry_delay_seconds is
  'Seconds to wait before retrying a failed prompt. Default 60.';
