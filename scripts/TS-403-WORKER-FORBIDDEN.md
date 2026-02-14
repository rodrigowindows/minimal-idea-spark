# Tarefa: Corrigir Erro 403 no Worker do Night Worker

## Contexto
O worker Python está processando prompts com sucesso (Claude CLI executa corretamente), mas ao tentar atualizar o status via PATCH na Edge Function do Supabase, recebe **403 Forbidden**.

## Logs do Erro
`[claude] ✅ Claude processou com sucesso [claude] API PATCH prompts/cb8b1697-99a6-4f8d-879d-8654d2e5b823 [claude] API response: 403`

## Causa Raiz
O worker está usando **SUPABASE_ANON_KEY** em vez de **SUPABASE_SERVICE_ROLE_KEY**.

A Edge Function valida isso em `supabase/functions/nightworker-prompts/index.ts` linha 131:
```typescript
if (req.method === 'PATCH' && route.startsWith('/prompts/')) {
  if (!isServiceRole(req)) {
    resp = json({ error: 'Forbidden: PATCH is allowed only with service-role token' }, 403)
  }
}
```
## Solução
### 1. Localizar o arquivo de configuração do worker
Provavelmente está em um destes locais:
- `claude-auto/night-worker/.env`
- `claude-auto/.env`
- Variáveis de ambiente do sistema

### 2. Verificar qual token está sendo usado
Procure por:
`SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...`
`SUPABASE_ANON_KEY=eyJhbGc...`

### 3. Trocar para o token correto
O worker DEVE usar o `service_role key`, NÃO o `anon key`. Como pegar o `service_role key`:
1. Acesse: https://supabase.com/dashboard/project/ekaflizdchjdrqgcdlkq/settings/api
2. Na seção "Project API keys", copie o valor de "**service_role**" (não "anon"!)
3. Atualize o `.env`:
```env
# ❌ ERRADO (não funciona para PATCH)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrYWZsaXpkY2hqZHJ5cWNkbGtxIiwicm9sZSI6ImFub24i...

# ✅ CERTO (deve conter "service_role" no payload JWT)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrYWZsaXpkY2hqZHJ5cWNkbGtxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSI...
```
### 4. Reiniciar o worker
Após trocar o token, reinicie o processo do worker para aplicar as mudanças.

## Verificação
Após corrigir, os logs devem mostrar:
`[claude] ✅ Claude processou com sucesso`
`[claude] API PATCH prompts/cb8b1697-...`
`[claude] API response: 200`  ← Sucesso!

## Nota Importante
- **service_role key**: Acesso total, só para backend/worker
- **anon key**: Acesso limitado, só para frontend
- O `service_role key` nunca deve estar no código do frontend ou ser commitado no git.

## Referências
- Documentação: `docs/NIGHTWORKER_APIS_E_FLUXO_FRONTEND.md` (seção "Autenticação")
- Edge Function: `supabase/functions/nightworker-prompts/index.ts` (linha 72-78)