# Backend API - Worker (Python/Direct)

## Visão Geral
O Worker é um componente externo (Python) que consome prompts da Edge Function e os processa utilizando LLMs locais ou APIs (Claude CLI, etc).

**URL Sugerida (Produção):** `https://coder-ai.workfaraway.com`

## Autenticação (Worker -> API)
Para atualizar o status de um prompt, o Worker **deve** usar a `service_role` key do Supabase.
- Header: `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`

## Ciclo de Vida do Status
1. `pending`: Criado pelo frontend.
2. `done`: Processado com sucesso pelo worker.
3. `failed`: Erro no processamento (com tentativas registradas).

## Integração com Frontend
O frontend pode ser configurado para apontar diretamente para a URL do Worker em ambientes de desenvolvimento ou para auditoria de logs.
- Endpoint de logs: `GET /logs` (disponível apenas na API direta do Worker).

## Configuração do Worker (Python)
No arquivo `config.txt` do worker:
- `supabase_mode=true`
- `nightworker_api_url={URL_DA_EDGE_FUNCTION}`
- `supabase_service_role_key={SUA_CHAVE_SERVICE_ROLE}`
