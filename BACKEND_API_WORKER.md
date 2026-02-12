# Backend API - Worker (API B)

## Visao geral

A API B e o **Worker externo** que executa prompts. Roda como servico independente (FastAPI/Python) em `https://coder-ai.workfaraway.com`. Expoe endpoints de health, prompts e logs.

**Base URL:** `https://coder-ai.workfaraway.com`

**Status atual:** Operacional (health check retorna 200 OK).

---

## Autenticacao

O Worker API usa autenticacao por Bearer token para operacoes de escrita. Leitura e health sao publicos.

| Operacao | Token |
|----------|-------|
| GET /health | Nenhum |
| GET /prompts | Opcional |
| GET /logs | Opcional |
| POST/PATCH | Bearer token configurado no worker |

---

## Endpoints

### `GET /health`

**Response (200):**
```json
{
  "status": "ok",
  "providers": ["claude", "codex"],
  "uptime": "14h 52m 21s",
  "version": "1.0.0"
}
```

**Diferencas vs API A (edge):**
- Retorna `uptime` real (edge retorna sempre o mesmo)
- Retorna `providers` como nomes curtos (`claude`, `codex`) vs nomes completos (`claude_cli`, `codex_cli`)
- Retorna `version` como semver (`1.0.0`) vs `edge`

---

### `GET /prompts`

Lista prompts gerenciados pelo worker.

**Response:** Compativel com o formato da API A. Pode retornar array puro ou objeto `{ total, prompts }`.

---

### `GET /prompts/:id`

Detalhe de um prompt especifico.

**Response:** Compativel com API A. Campos `path` e `result` podem ser usados no lugar de `result_path` e `result_content`.

---

### `GET /logs`

**Disponivel apenas na API B** (nao existe na edge Supabase).

**Query params:**
| Param | Tipo | Descricao |
|-------|------|-----------|
| `worker` | string | Filtro por worker (`Claude`, `Codex`, `all`) |
| `level` | string | Filtro por nivel (`INFO`, `WARN`, `ERROR`, `ALL`) |
| `lines` | number | Numero de linhas a retornar |
| `since` | ISO datetime | Logs a partir desta data |

**Response (200):**
```json
[
  {
    "timestamp": "2026-02-11T10:30:00Z",
    "level": "INFO",
    "worker": "Claude",
    "message": "Processing prompt abc123..."
  }
]
```

---

### `POST /prompts`

Cria novo prompt no worker.

**Request body:**
```json
{
  "provider": "claude",
  "name": "meu-prompt",
  "content": "conteudo...",
  "target_folder": "C:\\code\\project"
}
```

---

## Modelo request/response

### PromptListItem (GET /prompts)
```typescript
{
  id: string         // UUID
  provider: string   // "claude" | "codex"
  status: string     // "pending" | "done" | "failed"
  filename: string   // nome do arquivo
  created_at?: string
  has_result: boolean
}
```

### PromptDetail (GET /prompts/:id)
```typescript
{
  id: string
  provider: string
  status: string
  filename: string
  path?: string          // caminho do resultado (alias de result_path)
  content?: string       // conteudo do prompt
  result?: string        // conteudo do resultado (alias de result_content)
}
```

### HealthResponse
```typescript
{
  status: "ok" | "error"
  providers?: string[]
  uptime?: string
  version?: string
  pending?: number
  processedToday?: number
  failures?: number
  workers?: Array<{
    name: string
    provider: string
    active: boolean
    queue?: number
    intervalSeconds?: number
    lastRun?: string
    window?: string
  }>
}
```

---

## Status Lifecycle

```
pending  --(worker processa)--> done
pending  --(worker falha)-----> failed
failed   --(retry manual)-----> pending (via POST de novo prompt)
```

O worker faz polling na API (Supabase edge ou direta) para buscar prompts `pending`, processa e faz PATCH com `status=done/failed`.

---

## Fluxo do Worker

1. Worker faz GET /prompts?status=pending periodicamente
2. Para cada prompt pending, baixa o conteudo
3. Executa o CLI do provider (claude, codex)
4. Faz PATCH /prompts/:id com resultado ou erro
5. Registra evento via campo `event_type`/`event_message` no PATCH

---

## CORS

O Worker deve configurar CORS para permitir chamadas do frontend:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: authorization, content-type
Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS
```

---

## Variaveis de ambiente (Worker Python)

| Variavel | Descricao |
|----------|-----------|
| `SUPABASE_URL` | URL do Supabase para buscar/atualizar prompts |
| `SUPABASE_SERVICE_ROLE_KEY` | Token service-role para PATCH |
| `WORKER_PORT` | Porta do servidor (default: 443) |
| `CLAUDE_CLI_PATH` | Caminho do CLI Claude |
| `CODEX_CLI_PATH` | Caminho do CLI Codex |
| `WORKER_INTERVAL` | Intervalo de polling em segundos |

---

## Erros por endpoint

| Endpoint | Status | Causa |
|----------|--------|-------|
| GET /health | 503 | Worker down |
| GET /prompts | 500 | Erro interno |
| GET /logs | 404 | Endpoint nao implementado (se usando edge) |
| POST /prompts | 400 | Payload invalido |
| PATCH /prompts/:id | 403 | Token invalido |

---

## Notas de compatibilidade

- **Nomes de provider**: Worker usa `claude`/`codex` (curto). Edge usa `claude_cli`/`codex_cli` (completo). O frontend faz `.includes()` para matching.
- **Campo `path` vs `result_path`**: Worker pode retornar `path`; frontend mapeia para `result_path`.
- **Campo `result` vs `result_content`**: Worker pode retornar `result`; frontend mapeia para `result_content`.
- **`/logs`**: Disponivel apenas no Worker. Frontend trata 404 silenciosamente quando usando edge.
- **`/health`**: Ambas APIs respondem, mas com formatos ligeiramente diferentes. Frontend normaliza.
- **Seletor de backend**: Em Settings (`/nw/settings`), o usuario pode alternar entre Supabase Edge (API A) e Worker direto (API B). A escolha e persistida em `localStorage` com chave `nightworker_api_backend`.
