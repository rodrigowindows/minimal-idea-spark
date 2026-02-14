# Night Worker - APIs e Fluxo para o Frontend

**Última atualização**: 2026-02-13
**Status**: Fonte de Verdade

Este documento é a **fonte única de verdade** para a integração do frontend com o Night Worker. Descreve todos os endpoints disponíveis, autenticação, payloads e o fluxo completo de criação e monitoramento de prompts.

---

## 🎯 Visão Geral do Fluxo

O Night Worker opera em um modelo assíncrono de 4 passos:

```
1. FRONTEND ENVIA
   ↓ POST /prompts { provider, name, content, target_folder }

2. API RESPONDE
   ↓ 201 Created { id: "uuid" }

3. WORKERS PROCESSAM
   ↓ (em background) GET pending → executa IA → PATCH done/failed

4. FRONTEND CONSULTA
   ↓ (polling) GET /prompts até status === 'done' | 'failed'
```

**Analogia**: É como uma fila de impressora. Você manda imprimir (1), recebe um número de protocolo (2), a impressora processa em segundo plano (3), e você verifica o status até o documento sair (4).

---

## 📐 Arquitetura: Dois Cenários

### Cenário 1: Maestro (API Local - Desenvolvimento)

**Base URL**: `http://localhost:5555`

**Características**:
- API FastAPI Python para desenvolvimento/testes
- Localização: `claude-auto/api_server.py`
- Persistência: arquivos em `input/` (file-based)

**Endpoints Disponíveis**:
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/` | Health check |
| GET | `/prompts` | Lista prompts (sem filtros avançados) |
| POST | `/prompts` | Cria novo prompt |

**⚠️ Limitação**: Não possui `GET /prompts/:id` para polling individual. O frontend precisa usar `GET /prompts` e filtrar localmente.

**💡 Sugestão de Melhoria**: Implementar `GET /prompts/{id}` no api_server.py para permitir polling por id (igual ao Supabase).

---

### Cenário 2: Supabase Edge Function (Produção)

**Base URL**: `{VITE_SUPABASE_URL}/functions/v1/nightworker-prompts`
**Exemplo**: `https://ekaflizdchjdrqgcdlkq.supabase.co/functions/v1/nightworker-prompts`

**Características**:
- **Gateway Único**: Edge Function é o único ponto de entrada
- **Sem PostgREST direto**: Frontend NÃO chama `/rest/v1/prompts`
- Localização: `minimal-idea-spark/supabase/functions/nightworker-prompts/index.ts`
- Persistência: PostgreSQL (tabela `nw_prompts`)

**Diagrama**:
```
┌─────────────┐
│  FRONTEND   │
│   (React)   │
└──────┬──────┘
       │ HTTP (POST/GET/PATCH)
       ↓
┌──────────────────────────────┐
│  SUPABASE EDGE FUNCTION      │
│  /functions/v1/nightworker-  │
│       prompts                │
└──────┬───────────────────────┘
       │ SQL
       ↓
┌──────────────────────────────┐
│  SUPABASE DB (PostgreSQL)    │
│  Tabela: nw_prompts          │
└──────────────────────────────┘
       ↑
       │ GET pending + PATCH done/failed
       │ (Bearer service-role)
┌──────┴───────┐
│   WORKER     │
│ (Python/Node)│
└──────────────┘
```

**Endpoints Disponíveis**:
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/health` | Health check com providers |
| GET | `/prompts` | Lista prompts (com filtros) |
| GET | `/prompts/:id` | Detalhe de prompt (com events) |
| POST | `/prompts` | Cria novo prompt |
| PATCH | `/prompts/:id` | Atualiza prompt (apenas worker) |

---

## 🔐 Autenticação

A autenticação opera em **dois níveis** com tokens diferentes:

### Token de Frontend (anon key) - OPCIONAL

**Quem usa**: Aplicativo React
**Valor**: `VITE_SUPABASE_PUBLISHABLE_KEY` (do arquivo `.env`)
**Header**: `Authorization: Bearer {anon_key}`

**Permissões**:
- ✅ Criar prompts (POST)
- ✅ Ler prompts (GET)
- ❌ Atualizar prompts (PATCH retorna 403)

**⚠️ Nota Importante**: A Edge Function usa `service-role` internamente para todas as operações de DB. O token do frontend é **opcional** e serve apenas para auditoria/logs.

**Código relevante**:
```typescript
// NightWorkerContext.tsx - linha 193
if (!skipAuth && config.token) {
  mergedHeaders.set('Authorization', `Bearer ${config.token}`)
}
```

### Token de Worker (service_role key) - OBRIGATÓRIO PARA PATCH

**Quem usa**: Worker (Node.js/Python no servidor)
**Valor**: `SUPABASE_SERVICE_ROLE_KEY`
**Header**: `Authorization: Bearer {service_role_key}`

**Permissões**:
- ✅ Acesso total (GET, POST, PATCH)
- ✅ Único token que pode atualizar status de prompts

**🚨 Segurança**: Esta chave NUNCA deve:
- Estar no código do frontend
- Ser commitada no git
- Ser exposta em variáveis de ambiente públicas

**Validação na Edge Function**:
```typescript
// nightworker-prompts/index.ts - linha 72
function isServiceRole(req: Request): boolean {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  return token.length > 0 && token === serviceKey
}
```

---

## 📡 Endpoints da Edge Function (Detalhado)

### `POST /prompts` - Criar Prompt

**Objetivo**: Enfileirar uma nova tarefa de IA.

**Headers**:
```http
Content-Type: application/json
Authorization: Bearer {anon_key}  (opcional)
apikey: {anon_key}  (opcional)
```

**Request Body**:
```json
{
  "provider": "claude",
  "name": "meu-prompt-123",
  "content": "Crie uma função para calcular fibonacci recursivamente",
  "target_folder": "C:\\projetos\\meu-app"
}
```

**Validações**:
- `provider`: obrigatório, deve ser um de: `claude`, `codex`, `claude_cli`, `codex_cli`, `openai_api`
- `name`: obrigatório, max 500 caracteres
- `content`: obrigatório, max 500.000 caracteres
- `target_folder`: opcional, max 2.000 caracteres
- Body total: max 1 MB

**Response (201 Created)**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Erros Comuns**:
```json
// 400 Bad Request
{ "error": "provider, name and content are required" }
{ "error": "provider must be one of: claude, codex, ..." }

// 413 Payload Too Large
{ "error": "Payload too large" }
```

**Exemplo JavaScript**:
```javascript
const response = await fetch(`${SUPABASE_URL}/functions/v1/nightworker-prompts/prompts`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  },
  body: JSON.stringify({
    provider: 'claude',
    name: 'fibonacci',
    content: 'Crie uma função recursiva para fibonacci',
    target_folder: 'C:\\code\\project'
  })
})

const { id } = await response.json()
console.log(`Prompt criado: ${id}`)
```

---

### `GET /prompts` - Listar Prompts

**Objetivo**: Buscar lista de prompts com filtros e paginação.

**Headers**:
```http
Authorization: Bearer {anon_key}  (opcional)
apikey: {anon_key}  (opcional)
```

**Query Parameters**:
| Parâmetro | Tipo | Default | Descrição |
|-----------|------|---------|-----------|
| `status` | `pending\|done\|failed` | todos | Filtrar por status |
| `provider` | string | todos | Filtrar por provider |
| `from` | ISO datetime | - | Data mínima (created_at) |
| `to` | ISO datetime | - | Data máxima (created_at) |
| `limit` | number | 20 | Quantidade (max 100) |
| `offset` | number | 0 | Offset para paginação |

**Response (200 OK)**:
```json
{
  "total": 15,
  "prompts": [
    {
      "id": "550e8400-...",
      "name": "fibonacci",
      "status": "done",
      "provider": "claude",
      "content": "Crie uma função...",
      "target_folder": "C:\\code\\project",
      "result_content": "function fibonacci(n) {...}",
      "result_path": null,
      "error": null,
      "attempts": 1,
      "next_retry_at": null,
      "created_at": "2026-02-13T10:30:00Z",
      "updated_at": "2026-02-13T10:30:15Z"
    }
  ]
}
```

**Erros Comuns**:
```json
// 400 Bad Request
{ "error": "Invalid status filter. Must be one of: pending, done, failed" }
{ "error": "Invalid provider filter. Must be one of: ..." }
```

**Exemplo JavaScript**:
```javascript
// Buscar prompts pendentes do Claude
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/nightworker-prompts/prompts?status=pending&provider=claude&limit=10`
)
const { total, prompts } = await response.json()
console.log(`${total} prompts pendentes`)
```

---

### `GET /prompts/:id` - Detalhe do Prompt

**Objetivo**: Consultar status e resultado de um prompt específico (ideal para polling).

**Headers**:
```http
Authorization: Bearer {anon_key}  (opcional)
apikey: {anon_key}  (opcional)
```

**Response (200 OK) - Tarefa Concluída**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "fibonacci",
  "status": "done",
  "provider": "claude",
  "content": "Crie uma função...",
  "target_folder": "C:\\code\\project",
  "result_content": "function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n-1) + fibonacci(n-2);\n}",
  "result_path": null,
  "error": null,
  "attempts": 1,
  "next_retry_at": null,
  "created_at": "2026-02-13T10:30:00Z",
  "updated_at": "2026-02-13T10:30:15Z",
  "events": [
    {
      "id": "event-uuid-1",
      "prompt_id": "550e8400-...",
      "type": "done",
      "message": "Processed by worker daemon",
      "created_at": "2026-02-13T10:30:15Z"
    }
  ]
}
```

**Response (200 OK) - Tarefa Pendente**:
```json
{
  "id": "550e8400-...",
  "status": "pending",
  "result_content": null,
  "error": null,
  "events": []
}
```

**Response (200 OK) - Tarefa Falhou**:
```json
{
  "id": "550e8400-...",
  "status": "failed",
  "result_content": null,
  "error": "Timeout: AI API não respondeu em 60s",
  "events": [
    {
      "type": "failed",
      "message": "Worker timeout",
      "created_at": "2026-02-13T10:31:00Z"
    }
  ]
}
```

**Erros**:
```json
// 404 Not Found
{ "error": "Prompt not found" }

// 400 Bad Request
{ "error": "Invalid prompt ID format" }
```

**Exemplo JavaScript**:
```javascript
// Polling até conclusão
const pollPromptStatus = async (id) => {
  const interval = setInterval(async () => {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/nightworker-prompts/prompts/${id}`
    )
    const prompt = await response.json()

    console.log(`Status: ${prompt.status}`)

    if (prompt.status === 'done') {
      clearInterval(interval)
      console.log('Resultado:', prompt.result_content)
    } else if (prompt.status === 'failed') {
      clearInterval(interval)
      console.error('Erro:', prompt.error)
    }
  }, 15000) // Polling a cada 15 segundos
}
```

---

### `PATCH /prompts/:id` - Atualizar Prompt (Apenas Worker)

**Objetivo**: Worker atualiza status/resultado após processar.

**🚨 ATENÇÃO**: Este endpoint é **exclusivo do worker**. Frontend recebe `403 Forbidden`.

**Headers**:
```http
Content-Type: application/json
Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}  (obrigatório!)
```

**Request Body** (todos os campos opcionais):
```json
{
  "status": "done",
  "result_content": "function fibonacci(n) {...}",
  "result_path": "/output/fibonacci.js",
  "error": null,
  "attempts": 1,
  "next_retry_at": null,
  "event_type": "done",
  "event_message": "Processed successfully by worker"
}
```

**Campos**:
- `status`: `pending`, `done` ou `failed`
- `result_content`: conteúdo do resultado (max 500.000 chars)
- `result_path`: caminho do arquivo gerado (max 5.000 chars)
- `error`: mensagem de erro se falhou (max 5.000 chars)
- `attempts`: número de tentativas
- `next_retry_at`: timestamp para próximo retry (ou null)
- `event_type`: tipo do evento a registrar
- `event_message`: mensagem do evento (max 5.000 chars)

**Transições de Status**:
```
pending → done     ✅ Permitido (sucesso)
pending → failed   ✅ Permitido (falha)
done → done        ✅ Idempotente (retorna 200)
failed → failed    ✅ Idempotente (retorna 200)
done → failed      ❌ Conflito (retorna 409)
failed → done      ❌ Conflito (retorna 409)
```

**Response (200 OK)**:
```json
{
  "id": "550e8400-...",
  "status": "done"
}
```

**Response (200 OK) - Idempotente**:
```json
{
  "id": "550e8400-...",
  "status": "done",
  "idempotent": true
}
```

**Erros**:
```json
// 403 Forbidden (token não é service-role)
{ "error": "Forbidden: PATCH is allowed only with service-role token" }

// 404 Not Found
{ "error": "Prompt not found" }

// 409 Conflict (já processado com status diferente)
{
  "error": "Prompt already processed or not found",
  "current_status": "done"
}

// 400 Bad Request
{ "error": "No valid fields to update" }
{ "error": "Invalid prompt ID format" }
```

---

## ⚛️ Fluxo Completo no Frontend (React)

O frontend usa `react-query` para gerenciar estado, cache e polling.

### 1️⃣ Enviar Tarefa

**Hook**: `useCreatePromptMutation` ([useNightWorkerApi.ts:200](c:\code\minimal-idea-spark\src\hooks\useNightWorkerApi.ts#L200))

```typescript
const createPrompt = useCreatePromptMutation()

// Ao enviar
await createPrompt.mutateAsync({
  provider: 'claude',
  name: 'fibonacci',
  content: 'Crie função recursiva...',
  target_folder: 'C:\\project'
})

// onSuccess (automático):
// - Invalida query da lista (força refetch)
// - Frontend vê novo prompt como "pending"
```

**Fluxo Interno**:
1. Faz `POST /prompts`
2. Recebe `{ id: "uuid" }`
3. Invalida cache de `['nightworker', 'prompts']`
4. Lista refaz fetch e mostra novo prompt

---

### 2️⃣ Listar e Monitorar Tarefas

**Hook**: `usePromptsQuery` ([useNightWorkerApi.ts:53](c:\code\minimal-idea-spark\src\hooks\useNightWorkerApi.ts#L53))

```typescript
const { data: prompts } = usePromptsQuery()

// Polling inteligente:
// - 15s se houver prompts com status === 'pending'
// - 30s se não houver prompts pendentes
```

**Lógica de Polling** ([useNightWorkerApi.ts:118](c:\code\minimal-idea-spark\src\hooks\useNightWorkerApi.ts#L118)):
```typescript
refetchInterval: (query) => {
  const hasPending = query.state.data?.some((p) => p.status === 'pending')
  return hasPending ? 15000 : 30000  // 15s ou 30s
}
```

**Exemplo de Timeline**:
```
10:30:00 → Usuário cria prompt (status: pending)
10:30:15 → Frontend faz GET /prompts (ainda pending)
10:30:18 → Worker processa e faz PATCH (status: done)
10:30:30 → Frontend faz GET /prompts (vê status: done!) ✅
         → UI atualiza automaticamente (card move para "Done")
```

---

### 3️⃣ Detalhe Individual (Polling por ID)

**Hook**: `usePromptStatusQuery` ([useNightWorkerApi.ts:139](c:\code\minimal-idea-spark\src\hooks\useNightWorkerApi.ts#L139))

```typescript
const { data: prompt } = usePromptStatusQuery(promptId)

// Polling apenas se status === 'pending':
// - 15s enquanto pending
// - Para quando vira done/failed
```

**Lógica de Polling** ([useNightWorkerApi.ts:192](c:\code\minimal-idea-spark\src\hooks\useNightWorkerApi.ts#L192)):
```typescript
refetchInterval: (query) => {
  const d = query.state.data
  return d?.status === 'pending' ? 15000 : false  // Para quando done/failed
}
```

**Fallback para API File-Based** ([useNightWorkerApi.ts:164](c:\code\minimal-idea-spark\src\hooks\useNightWorkerApi.ts#L164)):
Se `GET /prompts/:id` retornar 404, o hook tenta automaticamente `GET /prompts/:id/status` (compatibilidade com Maestro).

---

## 📊 Tabela Comparativa: Maestro vs Supabase

| Aspecto | Maestro (Local) | Supabase (Produção) |
|---------|----------------|---------------------|
| **Base URL** | `http://localhost:5555` | `{SUPABASE_URL}/functions/v1/nightworker-prompts` |
| **Persistência** | Arquivos (`input/`) | PostgreSQL (`nw_prompts`) |
| **POST /prompts** | ✅ Cria arquivo | ✅ Insere no DB |
| **GET /prompts** | ✅ Lista arquivos | ✅ Lista com filtros |
| **GET /prompts/:id** | ❌ Não implementado | ✅ Com events |
| **PATCH /prompts/:id** | ❌ Não existe | ✅ Só com service-role |
| **Autenticação** | Nenhuma | Opcional (anon), obrigatória para PATCH (service-role) |
| **Polling Frontend** | `GET /prompts` + filtro local | `GET /prompts/:id` direto |
| **Workers** | `worker.py` file-mode | `worker.py` supabase-mode |
| **Logs** | Arquivos locais | Structured JSON (console) |

---

## 🔄 Diagrama de Sequência Completo

```
┌─────────┐          ┌──────────────┐          ┌──────────────┐
│ Frontend│          │ Edge Function│          │   Worker     │
└────┬────┘          └──────┬───────┘          └──────┬───────┘
     │                      │                         │
     │ POST /prompts        │                         │
     │─────────────────────>│                         │
     │                      │                         │
     │                      │ INSERT nw_prompts       │
     │                      │ (status: pending)       │
     │                      │                         │
     │ 201 { id: "uuid" }   │                         │
     │<─────────────────────│                         │
     │                      │                         │
     │                      │   GET /prompts?status=pending
     │                      │<────────────────────────│
     │                      │                         │
     │                      │ 200 { prompts: [...] }  │
     │                      │─────────────────────────>
     │                      │                         │
     │                      │                         │ [Processa IA]
     │                      │                         │
     │                      │   PATCH /prompts/:id    │
     │                      │   { status: done, ... } │
     │                      │<────────────────────────│
     │                      │                         │
     │                      │ UPDATE nw_prompts       │
     │                      │ (status: done)          │
     │                      │                         │
     │                      │ 200 { id, status }      │
     │                      │─────────────────────────>
     │                      │                         │
     │ GET /prompts/:id     │                         │
     │─────────────────────>│                         │
     │                      │                         │
     │ 200 { status: done,  │                         │
     │      result_content, │                         │
     │      events: [...] } │                         │
     │<─────────────────────│                         │
     │                      │                         │
    [UI atualiza]
```

---

## 🛠️ Troubleshooting

### Problema: Prompts ficam "pending" para sempre

**Sintoma**: Criou prompt, mas nunca vira "done".

**Causas possíveis**:
1. ❌ Worker não está rodando
2. ❌ Worker está usando token errado (anon em vez de service-role)
3. ❌ Worker está configurado para URL errada

**Como verificar**:
```bash
# Ver se tem prompts pendentes
curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "https://xxx.supabase.co/functions/v1/nightworker-prompts/prompts?status=pending"

# Se retornar prompts, worker não está pegando
```

**Solução**: Ver [NIGHTWORKER_COMO_FUNCIONA.md](./NIGHTWORKER_COMO_FUNCIONA.md) seção "Como Ligar o Worker".

---

### Problema: Frontend mostra "500 Unexpected error"

**Sintoma**: Erro 500 ao abrir `/nw/prompts`.

**Causa**: Edge Function não deployada ou desatualizada.

**Solução**:
```bash
npx supabase functions deploy nightworker-prompts
```

---

### Problema: Worker retorna "403 Forbidden"

**Sintoma**: Worker tenta PATCH mas recebe 403.

**Causa**: Usando `SUPABASE_ANON_KEY` em vez de `SUPABASE_SERVICE_ROLE_KEY`.

**Solução**: Verificar `.env` do worker:
```env
# ❌ ERRADO
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...anon...

# ✅ CERTO
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...service_role...
```

**Como pegar**: Supabase Dashboard → Project Settings → API → copiar "service_role" key.

---

### Problema: Polling não atualiza

**Sintoma**: Prompt virou "done" mas UI não atualiza.

**Causa**: Cache do react-query ou intervalo de polling não expirou.

**Solução**:
1. Aguardar 15-30 segundos (próximo polling)
2. Dar refresh (F5) na página
3. Verificar no DevTools → Network se requisições estão sendo feitas

---

## 📚 Referências

- [NIGHTWORKER_COMO_FUNCIONA.md](./NIGHTWORKER_COMO_FUNCIONA.md) - Guia completo para usuários
- [BACKEND_API_WORKER.md](./BACKEND_API_WORKER.md) - API para workers
- [BACKEND_COMPATIBILITY.md](./BACKEND_COMPATIBILITY.md) - Compatibilidade entre backends
- [NightWorkerContext.tsx](../src/contexts/NightWorkerContext.tsx) - Implementação do cliente HTTP
- [useNightWorkerApi.ts](../src/hooks/useNightWorkerApi.ts) - Hooks de react-query
- [nightworker-prompts/index.ts](../supabase/functions/nightworker-prompts/index.ts) - Código da Edge Function

---

## 💡 Melhorias Sugeridas

### Para o Maestro (api_server.py)

Implementar endpoint `GET /prompts/{id}` para unificar experiência de desenvolvimento com produção:

```python
@app.get("/prompts/{prompt_id}")
async def get_prompt_detail(prompt_id: str):
    """Retorna detalhes de um prompt específico (para polling)."""
    # Ler arquivo input/{prompt_id}.txt
    # Retornar status, result, error, etc.
    pass
```

Isso permitiria ao frontend fazer polling individual mesmo em ambiente local.

---

**Fim do Documento**
