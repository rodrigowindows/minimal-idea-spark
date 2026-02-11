-- Index for worker query: GET /prompts?status=pending&provider=X order by created_at desc
create index if not exists idx_nw_prompts_status_provider_created
  on public.nw_prompts (status, provider, created_at desc);
