# ADR 0001: Por que Supabase

## Status

Aceito

## Contexto

Precisávamos de backend para auth, banco de dados, realtime e funções serverless sem manter infraestrutura própria.

## Decisão

Usar Supabase como BaaS: Auth, Postgres, Realtime e Edge Functions (Deno). O frontend (Vite/React) consome a API e as Edge Functions para RAG, embeddings, convites, etc.

## Consequências

- Positivas: auth e realtime prontos, SQL e RLS para segurança, deploy simples das functions.
- Negativas: vendor lock-in; limites do plano gratuito.
- Neutras: migrações em SQL no repositório; variáveis sensíveis no Dashboard.
