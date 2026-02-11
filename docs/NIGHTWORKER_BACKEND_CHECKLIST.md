# Night Worker — responsabilidades dos dois backends

Arquitetura enxuta com dois papéis bem separados:
- **Backend A — API/edge**: única fonte de verdade para prompts e eventos (Supabase function `nightworker-prompts` OU servidor externo).
- **Backend B — Worker/poller**: consome prompts pendentes de um provider, processa e devolve resultado via PATCH. Não lê nem grava em disco local para decidir o que processar.

## Cenários de deploy

### 1. Supabase edge + worker local (recomendado para dev/prod pequena)

- **Backend A**: Supabase edge function `nightworker-prompts` (já deployado com `supabase functions deploy`)
- **Backend B**: Worker roda via cron/systemd na máquina local (ou VM/Docker)
- **Config frontend**: `VITE_SUPABASE_URL` (auto-deriva para `/functions/v1/nightworker-prompts`)
- **Config worker**: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` no `.env`
- **Vantagens**: RLS nativo, sem manutenção de servidor, escalável até ~100k req/mês
- **Limitações**: Cold start (~200ms), sem `/logs` detalhados na edge (frontend degrada gracefully)

### 2. Servidor externo + workers distribuídos (produção escalável)

- **Backend A**: API Node.js/Go/Python em `coder-ai.workfaraway.com` (implementa mesmo contrato HTTP)
  - Deve replicar validação, RLS-like auth, observabilidade da edge function
  - Endpoint `/logs` opcional (frontend trata 404)
- **Backend B**: Workers distribuídos (Docker/K8s, múltiplas réplicas)
- **Config frontend**: `VITE_NIGHTWORKER_API_URL=https://coder-ai.workfaraway.com`
- **Config worker**: `NIGHTWORKER_API_URL` + `SUPABASE_SERVICE_ROLE_KEY` (ou chave equivalente do servidor externo)
- **Vantagens**: Sem cold start, logs customizados, controle total sobre infra
- **Limitações**: Precisa replicar RLS/auth manualmente, mais complexo de operar

### 3. Edge-only (sem processamento automático)

- **Backend A**: Edge function
- **Backend B**: Não roda (prompts ficam `pending` até PATCH manual via script)
- **Útil para**: Teste, demo, ou fluxo onde PATCH é feito por outro sistema (ex.: webhook externo)
- **Config**: Apenas `VITE_SUPABASE_URL` no frontend

## Contrato da API (Backend A)

| Endpoint | Método | Uso | Autorização |
|----------|--------|-----|-------------|
| `/health` | GET | Saúde da API (edge); resposta mínima `{ status, version?, providers? }`. Sem auth. | Nenhuma |
| `/prompts` | GET | Lista com filtros `status`, `provider`, `from`, `to`, `limit`, `offset` | Bearer (anon ou service-role) |
| `/prompts/{id}` | GET | Detalhe + `events[]` | Bearer |
| `/prompts` | POST | Criar `{ provider, name, content, target_folder? }` | Bearer (anon/usuários) |
| `/prompts/{id}` | PATCH | Atualizar `status`, `result_content`, `result_path`, `error`, `attempts`, `next_retry_at`, etc. | **Apenas Bearer service-role** (403 se anon/outro token) |

Respostas padrão:
- GET `/health`: `{ status: "ok", version?: "edge", providers?: string[] }`
- GET lista: `{ total, prompts: [...] }`
- GET por id: prompt + `events`
- POST: `{ id }`
- PATCH: `{ id, status }` — ou `403 Forbidden` se o token não for service-role.

## Responsabilidades por backend

### Backend A (API/edge function)
- Valida e persiste prompts; não processa.
- Expõe `GET /health` (sem auth) para conectividade e painel edge-only.
- Aplica filtros e paginação; fornece eventos.
- GET/POST aceitam Bearer anon (ou service-role). **PATCH é enforced**: apenas `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` é aceito; caso contrário retorna 403.
- Não expõe `/logs`; o painel degrada com segurança quando o endpoint não existe.
- Loga request/response e erros (já implementado em `supabase/functions/nightworker-prompts/index.ts`).

### Backend B (worker/poller)
- Loop: `GET /prompts?status=pending&provider=<provider>&limit=N`.
- Para cada prompt:
  1) Processa.
  2) `PATCH /prompts/{id}` com `status=done`, `result_content/result_path`, `attempts`, `event_type=done`, `event_message` opcional.
  3) Em falha de negócio: `status=failed`, `error`, `attempts`, `next_retry_at`, `event_type=failed`.
- Não lê pastas locais como fonte de prompts; só a API.
- Retentativas em erro de rede/5xx com backoff exponencial e jitter; não retentar 4xx (exceto 429). Tratar 409 como “já processado”.
- Logar método, caminho, status e latência em cada request/response.

## Checklists

**API (A):**
- [ ] Retorna 404 para IDs inexistentes.
- [ ] Logs estruturados com `method`, `route`, `rid`, `status`.
- [ ] `Cache-Control` curto (já 5s) e CORS liberado.

**Worker (B):**
- [ ] GET pendentes com filtro de provider e limit.
- [ ] PATCH `done` envia `status`, `result_content/ result_path`, `attempts`, `event_type=done`.
- [ ] PATCH `failed` envia `status`, `error`, `attempts`, `next_retry_at`, `event_type=failed`.
- [ ] Header `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` em todas.
- [ ] Backoff em 5xx/timeout; 409 tratado como idempotência.
- [ ] Logs de request/response com latência.

## Variáveis de ambiente

| Variável | Quem usa | Obrigatório | Valor típico |
|----------|---------|-------------|--------------|
| `SUPABASE_URL` | A e B | Sim | `https://<project>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | B | Sim | chave service-role do projeto |
| `VITE_SUPABASE_URL` | Frontend | Sim | mesmo `SUPABASE_URL` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend | Sim | anon/public key |
| `VITE_NIGHTWORKER_API_URL` | Frontend / B (opcional) | Não | override da URL; default é `$SUPABASE_URL/functions/v1/nightworker-prompts` |
| `VITE_NW_ANON_TOKEN` | Frontend (opcional) | Não | anon token para auto-login |

## Fluxo de validação rápida (já pronto em scripts)

- **E2E completo (API + worker simulado):** `node --env-file=.env --experimental-strip-types scripts/qa-nightworker-e2e-flow.ts`
- **Somente API (forma leve):** `node scripts/qa-nightworker-api.ts`
  - Ambos leem `BASE_URL` = `VITE_NIGHTWORKER_API_URL` ou `$VITE_SUPABASE_URL/functions/v1/nightworker-prompts` e usam TOKEN do env.

## Snippet do worker (Node)

```ts
const BASE = process.env.SUPABASE_URL + '/functions/v1/nightworker-prompts'
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` }

// Buscar pendentes
const res = await fetch(`${BASE}/prompts?status=pending&provider=codex&limit=5`, { headers: H })
const { prompts } = await res.json()

// Concluir primeiro
const id = prompts?.[0]?.id
if (id) {
  await fetch(`${BASE}/prompts/${id}`, {
    method: 'PATCH',
    headers: H,
    body: JSON.stringify({
      status: 'done',
      result_content: 'resultado ok',
      attempts: 1,
      event_type: 'done',
      event_message: 'worker simulated',
    }),
  })
}
```

## Onde cada coisa mora neste repo
- API/edge: `supabase/functions/nightworker-prompts/index.ts`
- Worker exemplo: `scripts/nightworker-worker-example.ts`
- QA: `scripts/qa-nightworker-e2e-flow.ts` (end-to-end) e `scripts/qa-nightworker-api.ts` (API only)
- Painel/frontend: hooks em `src/hooks/useNightWorkerApi.ts`, contexto em `src/contexts/NightWorkerContext.tsx`

## Status atual (implementado)

- `GET /health` está disponível na edge (`nightworker-prompts`) e retorna payload mínimo para o painel.
- `/logs` pode não existir em deploy edge-only. O frontend degrada gracefully (mostra aviso e continua funcional).
- **`PATCH /prompts/{id}` está protegido por dupla camada**:
  1. **Edge function**: valida `isServiceRole()` e retorna 403 se token não for service-role
  2. **RLS (Postgres)**: policy de UPDATE permite apenas `service_role`
  3. Defense in depth: mesmo se edge function for bypassada, RLS bloqueia no DB
