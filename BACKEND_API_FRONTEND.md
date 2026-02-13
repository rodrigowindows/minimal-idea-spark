# Backend API - Frontend (Supabase Edge Function)

## Visão Geral
A API principal é uma Supabase Edge Function (`nightworker-prompts`) que gerencia o ciclo de vida dos prompts do Night Worker. O frontend interage com esta API para criar e listar prompts.

**URL Base:** `{SUPABASE_URL}/functions/v1/nightworker-prompts`

## Autenticação
O frontend utiliza a chave `anon` do Supabase para requisições de leitura e criação.
- Header: `Authorization: Bearer <VITE_SUPABASE_PUBLISHABLE_KEY>`

## Endpoints Principais
- `GET /health`: Verifica se a função está respondendo.
- `GET /prompts`: Lista os prompts (suporta filtros de status e provider).
- `POST /prompts`: Cria um novo prompt com status `pending`.
- `GET /prompts/:id`: Retorna detalhes de um prompt e seus eventos.

## Fluxo de Polling
O frontend realiza polling a cada 10-30 segundos para atualizar o status dos prompts na interface.

## Erros Comuns
- `401/403`: Chave anon inválida ou expirada.
- `404`: Prompt não encontrado ou endpoint de logs inexistente (tratado silenciosamente).
- `408`: Timeout na execução da função (limite de 10s no frontend).
- `500`: Erro interno na Edge Function (verificar logs do Supabase).
