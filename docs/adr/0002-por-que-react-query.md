# ADR 0002: Por que React Query

## Status

Aceito

## Contexto

Precisávamos de cache de dados do servidor, refetch e estados de loading/erro consistentes em telas que consomem APIs.

## Decisão

Usar TanStack Query (React Query) para queries e mutações que envolvem Supabase ou outras APIs. Configurado no `QueryClientProvider` em `App.tsx` com staleTime e gcTime definidos.

## Consequências

- Positivas: cache automático, deduplicação de requests, estados loading/error/success padronizados.
- Negativas: dependência extra; dados locais (useLocalData) continuam em context + localStorage, não substituídos por React Query.
- Neutras: mocks em testes podem precisar de QueryClientProvider.
