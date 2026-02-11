# Night Worker – Observabilidade, Performance, Segurança e Robustez

## 1) Observabilidade

- **Request-id:** Gerar um `request_id` (UUID ou nanoid) no início de cada request na edge function; incluir em todos os logs e devolver no header `X-Request-Id` na resposta para correlação no cliente/log aggregator.
- **Pontos de log recomendados:** (1) Entrada: method, route, request_id; (2) GET list: request_id, status filter, provider filter, total, tempo ms; (3) GET by id: request_id, id, found/404; (4) POST: request_id, id criado, provider; (5) PATCH: request_id, id, status anterior → novo, tempo ms; (6) Erro: request_id, error message, stack (sem dados sensíveis).
- **Métricas (onde possível):** Contagem por status (pending/done/failed) via query ou log agregado; latência por handler (tempo entre entrada e resposta); taxa de erro = respostas 4xx/5xx / total; contagem de PATCH por resultado (ok, 409, 404).
- **Alertas mínimos:** (1) Taxa de erro da função > X% em janela de 5 min; (2) Latência p95 > Y ms; (3) Worker: falhas consecutivas de PATCH ou GET pendentes falhando (healthcheck).

---

## 2) Performance

- **Índices adicionais:** Índice composto para a query típica do worker: `(status, provider, created_at DESC)` em `nw_prompts` para `GET /prompts?status=pending&provider=X`; considerar índice em `(status, created_at DESC)` se listagens por status forem comuns.
- **Paginação/limit padrão:** Limitar `limit` máximo (ex.: 100) e usar default 20 ou 50; validar `offset`/`limit` numéricos e >= 0.
- **Cache para GET:** Adicionar `Cache-Control: private, max-age=5` (ou 10) em respostas GET list e GET by id para reduzir carga; evitar cache para listas com filtro “ao vivo” se precisar de dados sempre frescos (ou max-age baixo).
- **Retry/backoff no worker:** Manter retry apenas para erros retentáveis (5xx, timeout); não retentar 4xx (exceto 429); backoff exponencial com jitter (ex.: 1s, 2s, 4s + jitter).
- **Tamanho máximo de payload:** Rejeitar body > N bytes (ex.: 512 KB ou 1 MB) no POST/PATCH para evitar abuse e timeouts; retornar 413 com mensagem clara.

---

## 3) Segurança

- **Validação de payload:** POST: validar obrigatórios (provider, name, content) e tipos (string, length máx para name/content/target_folder); PATCH: validar que status está em (`pending`|`done`|`failed`), attempts inteiro >= 0, next_retry_at ISO ou null; rejeitar campos extras ou ignorá-los explicitamente.
- **Providers válidos:** Validar provider contra allowlist na edge (ex.: codex, claude, codex_cli, claude_cli, openai_api); retornar 400 se inválido.
- **Saneamento de conteúdo:** Limitar tamanho de `content`, `result_content`, `error`, `event_message` (ex.: 1 MB); opcional: strip de caracteres de controle ou sanitize básico para evitar injection em logs/UI.
- **Service-role apenas no worker:** Garantir que apenas o worker (processo confiável) use a service-role key; usuários/front usam anon ou authenticated; RLS deve permitir UPDATE/INSERT em eventos apenas para service_role onde aplicável.
- **RLS/policies:** Separar políticas: SELECT para anon + authenticated (ou só authenticated); INSERT em nw_prompts para authenticated + service_role; UPDATE em nw_prompts apenas para service_role; INSERT em nw_prompt_events apenas para service_role. Remover política “Allow all for authenticated” que dá UPDATE a usuários se ainda existir.

---

## 4) Robustez

- **Status conflitante (ex.: PATCH em prompt já done):** Opção A: rejeitar PATCH que tenta mudar status quando linha já está `done` (ler antes, comparar, retornar 409 Conflict). Opção B: aceitar e atualizar (idempotente por conteúdo). Recomendação: aceitar PATCH em `done` apenas para campos não destrutivos (ex.: event_type/event_message) ou retornar 409 se tentar setar status para pending/done de novo.
- **Idempotência em PATCH:** PATCH é naturalmente idempotente por recurso (mesmo body → mesmo estado). Para “processamento concluído” evitar duplicar efeito: usar condição no UPDATE (ex.: `WHERE id = $1 AND status = 'pending'`) e retornar 409 se 0 rows updated; worker interpreta 409 como “já processado” e não reprocessa.
- **next_retry_at:** Worker só deve pegar para processar prompts com `status = 'pending'` e (opcional) `next_retry_at IS NULL OR next_retry_at <= now()`. Ao marcar falha, setar `next_retry_at` para futuro (ex.: now() + 5 min); job periódico ou outro worker pode reativar para retry mudando status de `failed` → `pending` em outro fluxo ou considerar “retry” como novo PATCH que seta pending + next_retry_at null após intervalo.

---

## 5) Checklist acionável

| # | Onde | Ação | Feito |
|---|------|------|-------|
| 1 | Edge | Gerar e propagar `X-Request-Id` em toda request; incluir em logs e na resposta. | Sim |
| 2 | Edge | Validar POST: provider na allowlist, name/content/target_folder string e tamanhos máximos; validar PATCH: status enum, attempts int, next_retry_at ISO ou null; rejeitar body > 1 MB (413). | Sim |
| 3 | Edge | GET list: limit máximo 100, default 20; clamp offset/limit. | Sim |
| 4 | Edge | Respostas GET: header `Cache-Control: private, max-age=5`. | Sim |
| 5 | Edge | PATCH status→done/failed: UPDATE com `WHERE status = 'pending'`; se 0 rows, retornar 409; worker trata 409 como sucesso lógico. | Sim |
| 6 | SQL | Índice composto: `idx_nw_prompts_status_provider_created` em (status, provider, created_at DESC). | Sim |
| 7 | Worker | Incluir `X-Request-Id` em cada chamada; logar request_id + status + latency_ms. | Sim |
| 8 | Worker | Retry apenas em 5xx/timeout; backoff exponencial com jitter; 409 = sucesso (já processado). | Sim |
| 9 | RLS | Confirmar que UPDATE em nw_prompts é apenas para service_role; remover política FOR ALL a authenticated se existir. | Verificar migrações |
| 10 | Alerta | Configurar alerta mínimo: taxa de erro da função > 5% em 5 min ou latência p95 > 10s (ajustar ao SLO). | Manual / Supabase Dashboard |
