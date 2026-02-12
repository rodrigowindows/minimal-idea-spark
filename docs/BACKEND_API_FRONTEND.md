# Backend API - Frontend (Supabase Edge Function)

## Visao geral

A API A e uma **Supabase Edge Function** (`nightworker-prompts`) que gerencia o ciclo de vida dos prompts do Night Worker. O frontend cria e lista prompts; o worker externo consome e atualiza via PATCH.

**Base URL (producao):**
`{VITE_SUPABASE_URL}/functions/v1/nightworker-prompts`

**Base URL (fallback):**
`https://coder-ai.workfaraway.com`

---

## Autenticacao

| Operacao | Token necessario |
|----------|-----------------|
| GET (list/detail/health) | Nenhum (a edge function usa service-role internamente). Token `anon` pode ser enviado mas e opcional. |
| POST (criar prompt) | Nenhum obrigatorio. Se enviado, deve ser o `anon` key do Supabase. |
| PATCH (atualizar prompt) | **Obrigatorio**: `SUPABASE_SERVICE_ROLE_KEY` como Bearer token. Apenas o worker usa. |

Header: `Authorization: Bearer <token>`

> **Nota:** Tokens aleatorios causam erro 500. Use apenas o `anon` key (`VITE_SUPABASE_PUBLISHABLE_KEY`) ou omita.

---

## Endpoints

### `GET /health`

Retorna status da edge function.

**Request:** nenhum body.

**Response (200):**
```json
{
  "status": "ok",
  "version": "edge",
  "providers": ["codex", "claude", "codex_cli", "claude_cli", "openai_api"],
  "workers": []
}
```

---

### `GET /prompts`

Lista prompts com paginacao e filtros.

**Query params:**
| Param | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `status` | `pending\|done\|failed` | todos | Filtro por status |
| `provider` | string | todos | Filtro por provider |
| `from` | ISO datetime | - | Data minima (created_at) |
| `to` | ISO datetime | - | Data maxima (created_at) |
| `limit` | number | 20 | Max 100 |
| `offset` | number | 0 | Paginacao |

**Response (200):**
```json
{
  "total": 42,
  "prompts": [
    {
      "id": "uuid",
      "name": "meu-prompt",
      "provider": "claude_cli",
      "content": "...",
      "target_folder": "C:\\project",
      "status": "pending",
      "result_path": null,
      "result_content": null,
      "error": null,
      "attempts": 0,
      "next_retry_at": null,
      "created_at": "2026-02-11T...",
      "updated_at": "2026-02-11T..."
    }
  ]
}
```

---

### `GET /prompts/:id`

Retorna prompt detalhado com eventos.

**Response (200):**
```json
{
  "id": "uuid",
  "name": "meu-prompt",
  "provider": "claude_cli",
  "content": "conteudo completo",
  "target_folder": "C:\\project",
  "status": "done",
  "result_path": "/output/result.md",
  "result_content": "resultado...",
  "error": null,
  "attempts": 1,
  "next_retry_at": null,
  "created_at": "...",
  "updated_at": "...",
  "events": [
    {
      "id": "uuid",
      "prompt_id": "uuid",
      "type": "update",
      "message": "Worker started processing",
      "created_at": "..."
    }
  ]
}
```

**Response (404):** `{ "error": "Prompt not found" }`

---

### `POST /prompts`

Cria novo prompt.

**Request body:**
```json
{
  "provider": "claude_cli",
  "name": "nome-do-prompt",
  "content": "conteudo do prompt...",
  "target_folder": "C:\\code\\project"
}
```

**Validacoes:**
- `provider`: obrigatorio, deve ser um de: `codex`, `claude`, `codex_cli`, `claude_cli`, `openai_api`
- `name`: obrigatorio, max 500 chars
- `content`: obrigatorio, max 500.000 chars
- `target_folder`: opcional, max 2000 chars
- Body max: 1 MB

**Response (201):**
```json
{ "id": "uuid-do-novo-prompt" }
```

**Erros:**
- `400`: campos faltando ou invalidos
- `413`: payload muito grande

---

### `PATCH /prompts/:id` (apenas worker)

Atualiza status/resultado de um prompt. **Requer service-role token.**

**Request body (campos opcionais):**
```json
{
  "status": "done",
  "result_path": "/output/file.md",
  "result_content": "conteudo do resultado",
  "error": null,
  "attempts": 1,
  "next_retry_at": null,
  "event_type": "completed",
  "event_message": "Processado com sucesso"
}
```

**Transicoes de status:**
- `pending` -> `done`: sucesso
- `pending` -> `failed`: falha
- Transicoes idempotentes (mesmo status) retornam 200 com `"idempotent": true`
- Transicoes invalidas (ex: `done` -> `failed`) retornam 409

**Response (200):**
```json
{ "id": "uuid", "status": "done" }
```

**Erros:**
- `403`: token nao e service-role
- `404`: prompt nao encontrado
- `409`: conflito de status (ja processado)

---

## Modelo de dados (nw_prompts)

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | uuid | PK, auto-gerado |
| `name` | text | Nome legivel do prompt |
| `provider` | text | Provider alvo |
| `content` | text | Conteudo do prompt |
| `target_folder` | text | Pasta alvo no sistema de arquivos |
| `status` | text | `pending`, `done`, `failed` |
| `result_path` | text | Caminho do resultado |
| `result_content` | text | Conteudo do resultado |
| `error` | text | Mensagem de erro (se falhou) |
| `attempts` | integer | Numero de tentativas |
| `next_retry_at` | timestamptz | Proximo retry agendado |
| `created_at` | timestamptz | Data de criacao |
| `updated_at` | timestamptz | Data de atualizacao (trigger automatico) |

---

## Status Lifecycle

```
[POST /prompts] --> pending --> done   (worker PATCH com status=done)
                          \--> failed (worker PATCH com status=failed)
```

---

## Fluxo de polling no frontend

1. `usePromptsQuery` faz GET /prompts a cada 15s (ou 30s se nao ha pending)
2. `usePromptStatusQuery` faz GET /prompts/:id a cada 5s quando `status === 'pending'`
3. `useHealthQuery` faz GET /health a cada 10s
4. Timeout de 10s em todas as requisicoes (`apiFetch`)
5. Retry: ate 3 tentativas com backoff exponencial (250ms, 500ms, 1s, max 4s)
6. Timeout (408) e auth (401) nao fazem retry

---

## CORS

Headers configurados na edge function:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type, x-request-id
Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS
```

---

## Variaveis de ambiente

### Frontend (.env)
| Variavel | Descricao |
|----------|-----------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon key do Supabase |
| `VITE_NIGHTWORKER_API_URL` | Override manual da base URL (opcional) |
| `VITE_NW_ANON_TOKEN` | Token anon para auto-config (opcional) |

### Edge Function (Supabase secrets)
| Variavel | Descricao |
|----------|-----------|
| `SUPABASE_URL` | Auto-injetada pelo Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injetada pelo Supabase |

---

## Erros por endpoint

| Endpoint | Status | Causa |
|----------|--------|-------|
| Todos | 408 | Timeout (10s no frontend) |
| Todos | 500 | Edge function nao deployada ou erro interno |
| GET /prompts | 400 | Filtro de status/provider invalido |
| GET /prompts/:id | 404 | Prompt nao encontrado |
| POST /prompts | 400 | Campos obrigatorios faltando |
| POST /prompts | 413 | Payload > 1MB |
| PATCH /prompts/:id | 403 | Token nao e service-role |
| PATCH /prompts/:id | 409 | Prompt ja processado |

---

## Compatibility Notes

### Arquitetura de 2 Backends

O Night Worker possui **2 APIs diferentes**:

1. **Supabase Edge Function (ESTA API)** - Fonte de verdade
   - Localização: `minimal-idea-spark/supabase/functions/nightworker-prompts/index.ts`
   - Endpoints: `/health`, `/prompts`, `/prompts/:id` (GET com events), `PATCH /prompts/:id`
   - `/logs` **NÃO EXISTE** (404 tratado silenciosamente)
   - PATCH requer **service-role token** (403 para anon)
   - Idempotência: PATCH retorna 409 se já processado

2. **api_server.py (file-based)** - Backend alternativo
   - Localização: `claude-auto/api_server.py`
   - **Contrato diferente**:
     - GET `/prompts/:id/status` (não `/prompts/:id`)
     - Campos diferentes: `path` (não `result_path`), `result` (não `result_content`)
     - Sem eventos, sem PATCH, sem /logs
   - Uso: desenvolvimento local, testes

3. **worker.py** - Consumidor (não é API)
   - `supabase_mode=true`: Consome Edge (GET pending + PATCH done/failed)
   - `supabase_mode=false`: File-based local (input/*.txt)

### Frontend Fallback Strategy

O frontend (`src/hooks/useNightWorkerApi.ts`) implementa fallback automático:

```typescript
// 1. Tenta Edge contract: GET /prompts/:id
// 2. Se 404, tenta api_server.py: GET /prompts/:id/status
// 3. Mapeia campos: path→result_path, result→result_content
```

### Notas de Compatibilidade Legadas

- A edge function retorna `{ total, prompts: [...] }` no list. O frontend aceita tanto esse formato quanto array puro.
- O campo `filename` do tipo antigo e mapeado para `name` via `nameFromFilename()`.
- O campo `has_result` e inferido de `result != null` quando nao presente.
- `/logs` **nao existe** na API Supabase (edge). Requisicoes a /logs retornam 404 e sao tratadas silenciosamente (`silentStatuses: [404]`).
- O frontend usa `isConnected: true` sempre (token nao e obrigatorio para leitura).

### Referências

- Guia completo de compatibilidade: [BACKEND_COMPATIBILITY.md](./BACKEND_COMPATIBILITY.md)
- Worker API: [BACKEND_API_WORKER.md](./BACKEND_API_WORKER.md)
