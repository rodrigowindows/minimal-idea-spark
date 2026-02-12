# Backend Worker API - Documentação Completa

## Visão Geral

O Night Worker possui **arquitetura de dois backends**:

1. **Backend A (Edge/API)**: Supabase Edge Function - CRUD de prompts (única fonte de verdade)
2. **Backend B (Worker/Poller)**: Processa prompts pending e atualiza resultados

Este documento descreve o **Backend B** (Worker) e como integrá-lo.

---

## Arquitetura

```
┌─────────────┐
│  Frontend   │
│   (React)   │
└──────┬──────┘
       │ GET/POST (Bearer anon)
       ↓
┌──────────────────┐
│   Backend A      │
│  Edge Function   │
│   (Supabase)     │
└──────────────────┘
       ↑
       │ GET pending / PATCH result (Bearer service-role)
       │
┌──────────────────┐
│   Backend B      │
│  Worker Poller   │
│  (Node/Python)   │
└──────────────────┘
```

### Fluxo de Processamento

1. **Frontend** cria prompt via `POST /prompts` → status `pending`
2. **Worker** faz polling: `GET /prompts?status=pending&provider=X`
3. **Worker** processa prompt (chama LLM, CLI, etc)
4. **Worker** atualiza via `PATCH /prompts/{id}` com resultado ou erro

---

## Implementações Disponíveis

### 1. Worker Node.js - One-shot (Exemplo)

**Arquivo**: [scripts/nightworker-worker-example.ts](../scripts/nightworker-worker-example.ts)

Executa uma vez e para. Útil para testes e cron jobs.

**Uso**:
```bash
# Com .env
node --env-file=.env --experimental-strip-types scripts/nightworker-worker-example.ts

# Ou com tsx
npx tsx scripts/nightworker-worker-example.ts codex

# Processar provider específico
node --env-file=.env --experimental-strip-types scripts/nightworker-worker-example.ts claude
```

**Variáveis de ambiente necessárias**:
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**O que faz**:
- Busca até 10 prompts pending do provider especificado
- Processa cada um (MOCK: apenas simula processamento)
- Marca como `done` com resultado simulado
- Para após processar o batch

### 2. Worker Node.js - Daemon (Produção) ⭐

**Arquivo**: [scripts/nightworker-worker-daemon.ts](../scripts/nightworker-worker-daemon.ts)

Roda em loop infinito com polling inteligente. Ideal para produção.

**Uso**:
```bash
# Rodar localmente
node --env-file=.env --experimental-strip-types scripts/nightworker-worker-daemon.ts

# Ou com tsx
npx tsx scripts/nightworker-worker-daemon.ts
```

**Variáveis de ambiente**:
```env
# Obrigatórias
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Opcionais (com defaults)
NIGHTWORKER_API_URL=https://coder-ai.workfaraway.com  # Override da URL da API
WORKER_POLL_INTERVAL_MS=10000                          # Intervalo quando há pending (10s)
WORKER_IDLE_INTERVAL_MS=30000                          # Intervalo quando idle (30s)
WORKER_MAX_BATCH_SIZE=5                                # Max prompts por batch
WORKER_PROVIDERS=codex,claude                          # Providers separados por vírgula
```

**Funcionalidades**:
- ✅ Polling contínuo de múltiplos providers
- ✅ Intervalo inteligente: 10s com pending, 30s sem pending
- ✅ Retentativas com backoff exponencial + jitter
- ✅ Idempotência: trata 409 como sucesso
- ✅ Logs estruturados com emoji e timestamp
- ✅ Estatísticas: processed, succeeded, failed, errors, polls
- ✅ Graceful shutdown (SIGINT/SIGTERM)
- ✅ Não reprocessa prompts já concluídos (409 idempotent)

**Deploy em produção**:

**Systemd** (Linux):
```ini
[Unit]
Description=Night Worker Daemon
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/minimal-idea-spark
EnvironmentFile=/var/www/minimal-idea-spark/.env
ExecStart=/usr/bin/node --env-file=.env --experimental-strip-types scripts/nightworker-worker-daemon.ts
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable nightworker
sudo systemctl start nightworker
sudo systemctl status nightworker
```

**Docker**:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "--env-file=.env", "--experimental-strip-types", "scripts/nightworker-worker-daemon.ts"]
```

```bash
docker build -t nightworker .
docker run -d --env-file .env --name nightworker --restart unless-stopped nightworker
```

**PM2**:
```bash
npm install -g pm2
pm2 start scripts/nightworker-worker-daemon.ts --interpreter node --node-args="--env-file=.env --experimental-strip-types" --name nightworker
pm2 save
pm2 startup
```

### 3. Worker Python - FastAPI (Externo) 🐍

**URL**: `https://coder-ai.workfaraway.com`

Worker Python já deployado e rodando.

**Health check**:
```bash
curl https://coder-ai.workfaraway.com/health
# {"status":"ok","providers":["claude","codex"],"uptime":"23h 24m 47s","version":"1.0.0"}
```

**Configuração** (no servidor Python):
```env
NIGHTWORKER_API_URL=https://xxx.supabase.co/functions/v1/nightworker-prompts
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Vantagens**:
- Já está rodando em produção
- Múltiplos workers/réplicas
- Processamento real de LLMs (não mock)

---

## Contrato da API (Backend A)

O worker **consome** a API do Backend A. Endpoints relevantes:

### GET /prompts?status=pending&provider={provider}&limit={limit}

Busca prompts pending para processar.

**Headers**:
```
Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}
```

**Query params**:
- `status`: `pending` | `done` | `failed`
- `provider`: `codex` | `claude` | `codex_cli` | `claude_cli` | `openai_api`
- `limit`: número máximo de prompts (max: 100)
- `offset`: paginação

**Response 200**:
```json
{
  "total": 2,
  "prompts": [
    {
      "id": "uuid",
      "name": "test",
      "provider": "codex",
      "status": "pending",
      "content": "código do prompt",
      "target_folder": "C:\\code\\dummy",
      "created_at": "2024-01-01T00:00:00Z",
      "attempts": 0
    }
  ]
}
```

### PATCH /prompts/{id}

Atualiza prompt com resultado ou erro.

**IMPORTANTE**: Apenas tokens `service-role` são aceitos (403 caso contrário).

**Headers**:
```
Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}
Content-Type: application/json
```

**Body (sucesso)**:
```json
{
  "status": "done",
  "result_content": "código gerado pelo LLM",
  "result_path": "/path/to/result.txt",
  "attempts": 1,
  "event_type": "done",
  "event_message": "Processed by worker"
}
```

**Body (falha)**:
```json
{
  "status": "failed",
  "error": "Timeout ao chamar API do Claude",
  "attempts": 2,
  "next_retry_at": "2024-01-01T01:00:00Z",
  "event_type": "failed",
  "event_message": "Retrying in 60s"
}
```

**Response 200** (sucesso):
```json
{
  "id": "uuid",
  "status": "done"
}
```

**Response 409** (idempotente - já processado):
```json
{
  "error": "Prompt already processed or not found",
  "current_status": "done",
  "idempotent": true
}
```

**Response 403** (token inválido):
```json
{
  "error": "Forbidden: PATCH is allowed only with service-role token"
}
```

---

## Implementando Processamento Real

Os workers atuais usam **MOCK** (processamento simulado). Para implementar processamento real:

### 1. Substituir função `processPrompt()`

Em `nightworker-worker-daemon.ts`, linha 174-192:

```typescript
async function processPrompt(prompt: {
  id: string
  name: string
  content: string
  target_folder?: string
  provider: string
  attempts: number
}): Promise<{ success: boolean; result_content?: string; error?: string }> {
  log('info', '🔧 Processing prompt', { id: prompt.id, name: prompt.name })

  // IMPLEMENTAR LÓGICA REAL AQUI
  try {
    if (prompt.provider === 'codex') {
      // Chamar GitHub Copilot CLI
      const result = await execPromise(`gh copilot suggest "${prompt.content}"`)
      return { success: true, result_content: result.stdout }
    } else if (prompt.provider === 'claude') {
      // Chamar Claude API
      const result = await callClaudeAPI(prompt.content)
      return { success: true, result_content: result }
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
```

### 2. Exemplos de integração

**GitHub Copilot CLI**:
```typescript
import { exec } from 'child_process'
import { promisify } from 'util'
const execPromise = promisify(exec)

async function processWithCopilot(content: string) {
  const { stdout, stderr } = await execPromise(`gh copilot suggest "${content}"`)
  if (stderr) throw new Error(stderr)
  return stdout
}
```

**Claude API**:
```typescript
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

async function processWithClaude(content: string) {
  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 8096,
    messages: [{ role: 'user', content }],
  })
  return message.content[0].text
}
```

**OpenAI API**:
```typescript
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function processWithOpenAI(content: string) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content }],
  })
  return completion.choices[0].message.content
}
```

---

## Observabilidade

### Logs estruturados

Todos os workers emitem logs estruturados:

```json
[2024-01-01T00:00:00.000Z] 📡 Processing prompt {"id":"uuid","name":"test"}
[2024-01-01T00:00:05.234Z] ✅ Done {"id":"uuid","name":"test"}
[2024-01-01T00:01:00.000Z] ❌ Failed {"id":"uuid2","error":"Timeout"}
```

**Emojis**:
- `📡` info: Operações normais
- `⚠️` warn: Erros recuperáveis (retentativas)
- `❌` error: Erros não recuperáveis
- `✅` sucesso
- `🔧` processando
- `📦` batch fetched
- `💤` idle
- `📊` estatísticas
- `🚀` start
- `🛑` shutdown

### Métricas (daemon)

O daemon imprime estatísticas a cada 10 polls ou no shutdown (Ctrl+C):

```
[2024-01-01T02:15:00.000Z] 📊 Stats {
  "uptime": "2h 15m",
  "polls": 150,
  "processed": 42,
  "succeeded": 38,
  "failed": 3,
  "errors": 1
}
```

### Monitoramento recomendado

- **Logs**: Centralizar com Loki, CloudWatch, Datadog
- **Métricas**: Extrair para Prometheus/Grafana
- **Alertas**:
  - Taxa de erro > 10%
  - Worker sem processar nada por > 1h
  - Latência PATCH > 5s
  - Worker não rodando (healthcheck)

---

## Segurança

### 1. Token service-role

**CRÍTICO**: O `SUPABASE_SERVICE_ROLE_KEY` tem acesso total ao banco. Proteja:

- ✅ Nunca commitar no git
- ✅ Usar variáveis de ambiente ou secrets manager (AWS Secrets Manager, HashiCorp Vault)
- ✅ Rodar worker em ambiente confiável (servidor privado, não browser)
- ✅ Logs não devem expor o token
- ✅ Rotacionar periodicamente (a cada 90 dias)

### 2. RLS (Row Level Security)

A edge function + Postgres RLS garantem dupla camada de segurança:
- `PATCH` só aceita token service-role (403 caso contrário)
- Mesmo se edge for bypassada, RLS no Postgres bloqueia update

### 3. Sanitização

A edge function sanitiza todos os inputs:
- Remove caracteres de controle
- Limita tamanhos (name: 500, content: 500k)
- Valida providers e statuses
- Previne SQL injection (usa Supabase client parametrizado)

---

## Troubleshooting

### Worker não processa nada

1. **Verificar logs**:
   ```bash
   # Se rodando com systemd
   sudo journalctl -u nightworker -f

   # Se rodando com PM2
   pm2 logs nightworker

   # Se rodando manual
   # Logs aparecem no terminal
   ```

2. **Verificar se há prompts pending**:
   ```bash
   curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     "https://xxx.supabase.co/functions/v1/nightworker-prompts/prompts?status=pending"
   ```

3. **Verificar token**:
   ```bash
   # Deve retornar 200
   curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     "https://xxx.supabase.co/functions/v1/nightworker-prompts/health"
   ```

4. **Verificar conectividade**:
   ```bash
   # Deve retornar status ok
   curl https://xxx.supabase.co/functions/v1/nightworker-prompts/health
   ```

### PATCH retorna 403

- Token não é service-role
- Verificar `SUPABASE_SERVICE_ROLE_KEY` no .env
- Não usar `SUPABASE_ANON_KEY` (só frontend usa anon)

### PATCH retorna 409

- Prompt já foi processado (idempotente)
- Normal após restart do worker
- Worker deve tratar 409 como sucesso (já implementado)

### Worker consome muita CPU/memória

- Reduzir `WORKER_MAX_BATCH_SIZE` (default: 5 → 1 ou 2)
- Aumentar `WORKER_POLL_INTERVAL_MS` (default: 10s → 30s)
- Implementar rate limiting nas chamadas de API externa
- Verificar memory leaks (usar `node --inspect`)

### Prompts ficam pending indefinidamente

- Worker não está rodando
- Worker está com erro no processamento (verificar logs)
- Provider inválido (worker só processa providers configurados)
- Edge function com erro (verificar logs no Supabase Dashboard)

---

## Status Lifecycle

```
pending  --(worker processa)--> done
pending  --(worker falha)-----> failed
failed   --(retry manual)-----> pending (criar novo prompt)
```

O worker só processa prompts com `status=pending`. Prompts `done` e `failed` são ignorados.

---

## Comparação: Node.js vs Python Worker

| Feature | Node.js Daemon | Python (coder-ai) | One-shot |
|---------|----------------|-------------------|----------|
| Polling contínuo | ✅ | ✅ | ❌ |
| Múltiplos providers | ✅ | ✅ | 1 por vez |
| Processamento real | ❌ (mock) | ✅ | ❌ (mock) |
| Deploy | Manual | Já deployado | Cron job |
| Logs | Stdout | Endpoint /logs | Stdout |
| Estatísticas | ✅ | Via /health | ❌ |
| Idempotência | ✅ | ✅ | ✅ |
| Retentativas | ✅ | ✅ | ✅ |

---

## Próximos Passos

1. **Implementar processamento real** no daemon Node.js (substituir MOCK)
2. **Deploy do daemon** (systemd/docker/pm2)
3. **Configurar monitoramento** (logs + métricas)
4. **Ajustar intervalos** baseado em carga real
5. **Escalar horizontalmente** (múltiplas réplicas se necessário)
6. **Integrar com Python worker** (se necessário processar via coder-ai)

---

## Compatibility Notes

### Arquitetura: 2 Backends Diferentes

O Night Worker opera sob uma arquitetura hierárquica clara:

#### 1. Supabase Edge Function (Fonte de Verdade)
- **Localização**: `minimal-idea-spark/supabase/functions/nightworker-prompts/index.ts`
- **Função**: CRUD oficial e centralizado de prompts.
- **Contrato**: Usa `PATCH /prompts/:id` para atualizações de status. Requer `service-role` token.
- **Integração**: O `worker.py` deve usar `supabase_mode=true` para atuar como consumidor desta API.

#### 2. api_server.py (API Alternativa - File-based)
- **Localização**: `claude-auto/api_server.py`
- **Função**: API legacy/alternativa que opera salvando arquivos diretamente em `input/`.
- **Diferenças Críticas**:
  - Endpoint de detalhe: `/prompts/:id/status` (em vez de `/prompts/:id`).
  - Sem suporte a `PATCH`.
  - Campos: `path` (em vez de `result_path`), `result` (em vez de `result_content`).

#### 3. worker.py (O Processador Real)
- **Localização**: `claude-auto/night-worker/worker.py`
- **Comportamento**:
  - **Modo Supabase** (`supabase_mode=true`): Polling na Edge Function (GET pending) e atualização via PATCH (done/failed).
  - **Modo Local**: Escaneia `input/` local e move para `done/`.

### Bug Corrigido: Parsing de Prompts (worker.py)

Foi corrigido um bug onde prompts de uma única linha ou que continham colons eram misparsed como "files line". A nova lógica é robusta e detecta caminhos reais (starts with drive letter, `/`, `./`, ou extensões conhecidas sem espaços).

### Frontend Compatibility

O frontend implementa suporte dual:
1. Tenta contrato Edge: `GET /prompts/:id`.
2. Fallback: Se 404, tenta contrato alternativo: `GET /prompts/:id/status`.
3. Mapeamento: Campos legados (`path`, `result`) são automaticamente normalizados para o formato padrão.

---

## Referências

- Edge function: [supabase/functions/nightworker-prompts/index.ts](../supabase/functions/nightworker-prompts/index.ts)
- Worker exemplo: [scripts/nightworker-worker-example.ts](../scripts/nightworker-worker-example.ts)
- Worker daemon: [scripts/nightworker-worker-daemon.ts](../scripts/nightworker-worker-daemon.ts)
- QA scripts: `scripts/qa-nightworker-*.ts`
- Checklist: [NIGHTWORKER_BACKEND_CHECKLIST.md](./NIGHTWORKER_BACKEND_CHECKLIST.md)
- Frontend API: [BACKEND_API_FRONTEND.md](./BACKEND_API_FRONTEND.md)
- **Guia de compatibilidade completo**: [BACKEND_COMPATIBILITY.md](./BACKEND_COMPATIBILITY.md)
- **Por que api_server não processa prompts da Edge**: [NIGHTWORKER_API_SERVER_VS_WORKER.md](./NIGHTWORKER_API_SERVER_VS_WORKER.md)
