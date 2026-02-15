# Prompt para o Lovable (cole UM destes)

## Prompt Único (recomendado)

```
Aplique todas as migrações pendentes do Supabase ao banco de dados. As migrações estão em supabase/migrations/ e nunca foram aplicadas a partir de 20260215090000. Rode:

supabase db push

Depois, faça redeploy da Edge Function:

supabase functions deploy nightworker-prompts

Não altere nenhum código. Apenas aplique as migrações e redeploy.
```

---

## Se o prompt acima não funcionar, use este com o SQL direto:

```
Rode este SQL no SQL Editor do Supabase. São colunas que a Edge Function já referencia mas que faltam no banco:

alter table public.nw_prompts add column if not exists worker_id text;
alter table public.nw_prompts add column if not exists processing_started_at timestamptz;
alter table public.nw_prompts add column if not exists queue_stage text;
alter table public.nw_prompts add column if not exists priority_order integer;

alter table public.nw_prompts drop constraint if exists nw_prompts_queue_stage_check;
alter table public.nw_prompts add constraint nw_prompts_queue_stage_check check (queue_stage in ('backlog', 'prioritized'));

update public.nw_prompts set queue_stage = 'prioritized' where queue_stage is null;
alter table public.nw_prompts alter column queue_stage set not null;
alter table public.nw_prompts alter column queue_stage set default 'backlog';

create index if not exists idx_nw_prompts_processing_started_at on public.nw_prompts (processing_started_at) where status = 'processing';
create index if not exists idx_nw_prompts_pending_prioritized_order on public.nw_prompts (priority_order asc, created_at asc) where status = 'pending' and queue_stage = 'prioritized';
create index if not exists idx_nw_prompts_queue_stage_status on public.nw_prompts (queue_stage, status);

Não altere nenhum código.
```
