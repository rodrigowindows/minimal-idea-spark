# Night Worker – Backend / Worker – Checklist e contrato

## Fonte de verdade

- **Única fonte de prompts:** edge function Supabase `nightworker-prompts` (GET/POST/PATCH).
- O worker **não** deve usar pastas locais como fonte de prompts; apenas a API.

---

## API (edge function)

| Endpoint | Método | Descrição | Autorização |
|----------|--------|-----------|-------------|
| `/prompts` | GET | Lista com filtros: `status`, `provider`, `from`, `to`, `limit`, `offset` | Bearer (anon ou service-role) |
| `/prompts/{id}` | GET | Detalhe + eventos | Bearer |
| `/prompts` | POST | Criar: `{ provider, name, content, target_folder? }` | Bearer (usuários criam) |
| `/prompts/{id}` | PATCH | Atualizar: `status`, `result_content`, `result_path`, `error`, `attempts`, `next_retry_at`, `content`, `target_folder`; opcional: `event_type`, `event_message` | Bearer (**service-role** para worker) |

- Resposta GET lista: `{ total: number, prompts: array }`.
- Resposta GET por id: objeto do prompt + `events: array`.
- Resposta POST: `{ id: string }`.
- Resposta PATCH: `{ id: string, status: string }`.

---

## Lista de ajustes concretos no worker

- **Fonte única:** Não ler de pastas locais; usar apenas `GET /prompts?status=pending&provider=<provider>` (e opcionalmente `from`/`to`/`limit`).
- **Auth em todas as chamadas:** Sempre enviar header `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` (variável de ambiente).
- **Payload de conclusão (PATCH):** Enviar exatamente `status: 'done'`, `result_content` e/ou `result_path`, `attempts` (número), e opcionalmente `event_type: 'done'`, `event_message` (string).
- **Payload de falha (PATCH):** Enviar `status: 'failed'`, `error` (string), `attempts`, `next_retry_at` (ISO ou null), e opcionalmente `event_type: 'failed'`, `event_message`.
- **Pré-processamento (opcional):** Se o worker alterar conteúdo antes de processar, fazer PATCH com `content` e/ou `target_folder` antes do PATCH final de conclusão/falha.
- **Retentativas:** Em falha de rede ou resposta 5xx no PATCH, retentar com backoff exponencial (ex.: 1s, 2s, 4s) e jitter; não retentar 4xx (exceto 429 se aplicável); tratar 409 como “já processado” (sucesso lógico).
- **Logs:** Para cada request, logar método, path e (opcional) request_id; para cada response, logar status e latência; em erro, logar mensagem e id do prompt.

---

## Checklist de verificação

- [ ] **GET pendentes:** Worker chama `GET /prompts?status=pending&provider=<provider>` e não lê de pasta local.
- [ ] **PATCH done:** Worker envia PATCH com `status=done`, `result_content`/`result_path`, `attempts`, `event_type=done`, `event_message` (opcional).
- [ ] **PATCH failed:** Worker envia PATCH com `status=failed`, `error`, `attempts`, `next_retry_at`.
- [ ] **Auth header:** Todas as chamadas usam `Authorization: Bearer <service-role-key>`.
- [ ] **Payload e tipos:** Campos obrigatórios presentes; tipos corretos (string/number/ISO string ou null).
- [ ] **Backoff/retry:** Retentativas em 5xx/timeout; 409 tratado como sucesso.
- [ ] **Logs:** Request (método, path) e response (status, latência) logados para diagnóstico.

---

## Ajustes feitos no repositório

### Edge function (`supabase/functions/nightworker-prompts/index.ts`)

- Log de cada request: `method`, `route`, `path`.
- GET lista: log de `status`, `provider`, `total`.
- POST: log de `id`, `provider`, `name` após criar.
- GET por id: em erro PGRST116 (row not found) retorna 404 com `{ error: "Prompt not found" }`.
- PATCH: em erro PGRST116 retorna 404; log de erro em falha e log de sucesso com `id`, `status`.

### Frontend

- **usePromptStatusQuery:** passou a usar `GET /prompts/{id}` em vez de `GET /prompts/{id}/status` (contrato da API).

### Worker de exemplo

- **scripts/nightworker-worker-example.ts:** exemplo em Node/TS que:
  - Busca pendentes com `GET /prompts?status=pending&provider=<provider>`.
  - Usa `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`.
  - Marca conclusão com PATCH `status=done`, `result_content`, `event_type=done`.
  - Marca falha com PATCH `status=failed`, `error`, `attempts`, `next_retry_at`, `event_type=failed`.
  - Faz até 3 retentativas com backoff no PATCH.
  - Loga request e response.

---

## Variáveis de ambiente (worker)

| Variável | Obrigatório | Uso |
|----------|-------------|-----|
| `SUPABASE_URL` | Sim | Base do projeto (ex.: `https://xxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim (para o worker) | Token para PATCH e acesso total |
| `NIGHTWORKER_API_URL` | Opcional | Override da URL da API (default: `$SUPABASE_URL/functions/v1/nightworker-prompts`) |

---

## Exemplo: GET pendentes + PATCH conclusão

### Node (fetch)

```ts
const BASE = process.env.SUPABASE_URL + '/functions/v1/nightworker-prompts'
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` }

// 1) Buscar pendentes
const res = await fetch(`${BASE}/prompts?status=pending&provider=codex&limit=10`, { headers })
const { prompts } = await res.json()

// 2) Concluir um
const id = prompts[0]?.id
if (id) {
  await fetch(`${BASE}/prompts/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      status: 'done',
      result_content: 'Resultado aqui',
      attempts: 1,
      event_type: 'done',
      event_message: 'Processed',
    }),
  })
}
```

### Python (requests)

```python
import os
import requests

BASE = os.environ.get("SUPABASE_URL", "") + "/functions/v1/nightworker-prompts"
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
HEADERS = {"Content-Type": "application/json", "Authorization": f"Bearer {KEY}"}

# 1) Buscar pendentes
r = requests.get(f"{BASE}/prompts", params={"status": "pending", "provider": "codex", "limit": 10}, headers=HEADERS)
data = r.json()
prompts = data.get("prompts", [])

# 2) Concluir um
if prompts:
    pid = prompts[0]["id"]
    requests.patch(
        f"{BASE}/prompts/{pid}",
        headers=HEADERS,
        json={
            "status": "done",
            "result_content": "Resultado aqui",
            "attempts": 1,
            "event_type": "done",
            "event_message": "Processed",
        },
    )
```

### Rodar o worker completo (Node, com retry e logs)

```bash
node --env-file=.env --experimental-strip-types scripts/nightworker-worker-example.ts codex
```
