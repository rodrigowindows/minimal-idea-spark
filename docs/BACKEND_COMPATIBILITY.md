# Backend Compatibility Guide - Night Worker

## ⚠️ IMPORTANTE: Existem 2 APIs Diferentes

O ecossistema Night Worker possui **2 backends com contratos HTTP diferentes**:

---

## 1. Supabase Edge Function (Recomendado)

**Fonte de Verdade** para prompts em produção.

### Localização
- Repositório: `minimal-idea-spark/supabase/functions/nightworker-prompts/index.ts`
- URL típica: `https://[projeto].supabase.co/functions/v1/nightworker-prompts`

### Contrato HTTP

| Endpoint | Método | Descrição | Auth |
|----------|--------|-----------|------|
| `/health` | GET | Health check | Nenhuma |
| `/prompts` | GET | Lista com filtros (`status`, `provider`, `from`, `to`, `limit`, `offset`) | Bearer (anon ou service-role) |
| `/prompts/:id` | GET | Detalhe + events[] | Bearer |
| `/prompts` | POST | Criar `{provider, name, content, target_folder}` | Bearer (anon) |
| `/prompts/:id` | PATCH | Atualizar status/resultado | **Bearer service-role only** (403 se anon) |
| `/logs` | GET | ❌ **NÃO EXISTE** | - |

### Response Formats

**GET /prompts**:
```json
{
  "total": 10,
  "prompts": [
    {
      "id": "uuid",
      "name": "meu-prompt",
      "provider": "claude",
      "status": "pending",
      "content": "texto do prompt",
      "target_folder": "C:\\code",
      "created_at": "2024-...",
      "updated_at": "2024-...",
      "result_path": null,
      "result_content": null,
      "error": null,
      "attempts": 0,
      "next_retry_at": null,
      "filename": "prompt.txt",
      "has_result": false
    }
  ]
}
```

**GET /prompts/:id**:
```json
{
  "id": "uuid",
  "name": "meu-prompt",
  "provider": "claude",
  "status": "done",
  "content": "...",
  "result_path": "/path/to/result.md",
  "result_content": "resultado...",
  "events": [
    {
      "type": "done",
      "message": "Processed by worker",
      "created_at": "2024-..."
    }
  ]
}
```

### Uso
- **Frontend** (default): Consome esta API
- **worker.py** (`supabase_mode=true`): GET pending + PATCH done/failed

---

## 2. api_server.py (File-based - Alternativo)

**API local file-based** para desenvolvimento sem Supabase.

### Localização
- Repositório: `claude-auto/api_server.py`
- URL típica: `http://localhost:5555`

### Contrato HTTP (DIFERENTE da Edge)

| Endpoint | Método | Descrição | Auth |
|----------|--------|-----------|------|
| `/health` | GET | Health check | Nenhuma |
| `/prompts` | GET | Lista arquivos em `input/` | Bearer token configurado |
| `/prompts/:id/status` | GET | ⚠️ **DIFERENTE** (Edge usa `/prompts/:id`) | Bearer |
| `/prompts` | POST | Salva arquivo em `input/` | Bearer |
| `/prompts/:id` | PATCH | ❌ **NÃO EXISTE** | - |
| `/logs` | GET | ❌ **NÃO EXISTE** | - |

### Response Formats

**GET /prompts/:id/status**:
```json
{
  "id": "uuid",
  "provider": "claude",
  "status": "done",
  "filename": "uuid_nome.txt",
  "path": "/path/to/result.md",
  "content": "prompt text",
  "result": "resultado..."
}
```

**Campos diferentes**:
- `path` em vez de `result_path`
- `result` em vez de `result_content`
- Sem `events[]`
- Sem `created_at`, `updated_at`, `attempts`, etc.

### Uso
- **Desenvolvimento local** sem Supabase
- **Não recomendado** para produção (sem PATCH, sem estado compartilhado)

---

## 3. worker.py (Consumidor)

**Não é API** - é cliente que consome Backend A.

### Localização
- Repositório: `claude-auto/night-worker/worker.py`

### Modos de Operação

#### Modo A: Supabase (`supabase_mode=true`)
```
config.txt:
  supabase_mode=true
  supabase_url=https://xxx.supabase.co
  supabase_service_role_key=eyJ...
  nightworker_api_url=https://xxx.supabase.co/functions/v1/nightworker-prompts
```

**Fluxo**:
1. Poll `GET /prompts?status=pending&provider=claude&limit=10`
2. Processa LLM
3. `PATCH /prompts/:id` com `{status:"done", result_content:"...", event_type:"done"}`

#### Modo B: Local (`supabase_mode=false`)
```
config.txt:
  supabase_mode=false
```

**Fluxo**:
1. Escaneia `input/*.txt`
2. Processa LLM
3. Move para `done/` e salva em `results/`

---

## Frontend Compatibility

**Arquivo**: `minimal-idea-spark/src/hooks/useNightWorkerApi.ts`

### Estratégia de Fallback

1. **Assume Edge por default**: Usa contrato Supabase Edge
2. **Fallback automático** para api_server.py:
   - `GET /prompts/:id` → 404 → tenta `GET /prompts/:id/status`
   - Mapeia campos: `path→result_path`, `result→result_content`
3. **Trata /logs gracefully**:
   - 404 em `/logs` não é erro crítico (`silentStatuses: [404]`)
   - Para polling quando 404 detectado

### Exemplo de Código (usePromptStatusQuery)

```typescript
try {
  // Try Edge contract first
  const raw = await apiFetch<PromptDetail>(`/prompts/${id}`)
  return mapEdgeResponse(raw)
} catch (error) {
  // Fallback for api_server.py
  if (error instanceof ApiError && error.status === 404) {
    try {
      const fallback = await apiFetch<any>(`/prompts/${id}/status`)
      return mapApiServerResponse(fallback)
    } catch {
      throw error  // Both failed
    }
  }
  throw error
}
```

---

## Escolhendo o Backend

### ✅ Use Supabase Edge Quando:
- Produção
- Múltiplos usuários
- Precisa de histórico/events
- Worker em servidor separado (ex: coder-ai.workfaraway.com)
- Quer RLS + auth nativa

### ⚠️ Use api_server.py Quando:
- Desenvolvimento local sem Supabase
- Testes rápidos
- Não precisa de PATCH/estado compartilhado
- Single-user, file-based workflow

---

## Bug Corrigido: Parsing de Prompts

**Problema** (worker.py linhas 298-300 e 564-566):
```python
# ANTES (ERRADO)
lines = content.strip().split('\n')
files_line = lines[0].strip() if lines else ""
prompt_text = '\n'.join(lines[1:]).strip() if len(lines) > 1 else ""
# Resultado: prompt de 1 linha vira prompt_text=""
```

**Solução** (agora detecta se primeira linha é path):
```python
# DEPOIS (CORRETO)
first_line = lines[0].strip() if lines else ""

looks_like_path = bool(first_line and (
    '/' in first_line or '\\' in first_line or ':' in first_line or
    ',' in first_line or
    any(first_line.lower().endswith(ext) for ext in ['.py', '.js', '.ts', ...])
))

if looks_like_path:
    files_line = first_line
    prompt_text = '\n'.join(lines[1:]).strip() if len(lines) > 1 else ""
else:
    files_line = ""
    prompt_text = content.strip()  # Usa todo o conteúdo
```

**Impacto**:
- ✅ Prompts de 1 linha agora funcionam
- ✅ Prompts sem paths funcionam
- ✅ Não quebra prompts existentes com path na primeira linha

---

## Checklist de Compatibilidade

### Para Frontend Developers
- [ ] Usar `usePromptsQuery` / `usePromptStatusQuery` (já tem fallback)
- [ ] Não assumir que `/logs` existe (já tratado com `silentStatuses: [404]`)
- [ ] Não assumir campos sempre presentes (`created_at`, `updated_at`, etc podem ser null)

### Para Backend Developers (Edge)
- [ ] Sempre retornar `{total, prompts: [...]}` em GET /prompts
- [ ] Incluir `events[]` em GET /prompts/:id
- [ ] PATCH só aceita service-role (validar token)
- [ ] Retornar 409 se prompt já processado (idempotência)

### Para Backend Developers (api_server.py)
- [ ] Endpoint é `/prompts/:id/status` (não `/prompts/:id`)
- [ ] Retornar campos `path` e `result` (mapeados pelo frontend)
- [ ] Não implementar PATCH (file-based não precisa)

### Para Worker Developers
- [ ] Config `supabase_mode=true` para Edge
- [ ] Usar `SUPABASE_SERVICE_ROLE_KEY` (não anon)
- [ ] Tratar 409 como sucesso (idempotência)
- [ ] Parsing de prompts detecta path automaticamente

---

## Referências

- Edge Function: [supabase/functions/nightworker-prompts/index.ts](../supabase/functions/nightworker-prompts/index.ts)
- Frontend Hooks: [src/hooks/useNightWorkerApi.ts](../src/hooks/useNightWorkerApi.ts)
- Worker: `claude-auto/night-worker/worker.py`
- API Server: `claude-auto/api_server.py`

---

**Última atualização**: 2026-02-12
**Status**: ✅ Frontend + Worker alinhados e compatíveis
