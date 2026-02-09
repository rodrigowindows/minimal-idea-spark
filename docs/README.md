# Minimal Idea Spark – Documentação

Visão geral da documentação técnica do projeto.

## Conteúdo

- **ARCHITECTURE.md** – Camadas da aplicação (UI, hooks, contexts, Supabase, Edge Functions) e fluxo de dados.
- **adr/** – Architecture Decision Records: decisões de arquitetura e motivação.

## Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix).
- **Backend / Auth / DB:** Supabase (Auth, Realtime, Postgres, Edge Functions).
- **Estado:** React Context (App, Auth, Theme, Language, War Room, Workspace, Realtime), React Query onde aplicável.
- **Áudio:** Deepgram (transcrição) – client-side com `VITE_DEEPGRAM_API_KEY`.

## Como rodar

```sh
npm install
cp .env.example .env   # preencher VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

Abrir http://localhost:8080. Ver README na raiz para testes e deploy.
