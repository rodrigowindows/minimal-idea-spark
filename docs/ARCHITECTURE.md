# Arquitetura — LifeOS

**Última atualização**: 2026-03-08

## Camadas

1. **UI (components/pages)**  
   Componentes React e páginas em `src/components/`, `src/pages/`. Layout em `AppLayout`, Sidebar, PageHeader, MobileNav. UI base em `src/components/ui/` (shadcn).

2. **Hooks**  
   Lógica reutilizável em `src/hooks/`. Facade central: `useLocalData` delega para hooks especializados em `src/hooks/data/` (`useOpportunities`, `useDailyLogs`, `useHabits`, `useGoals`, `useWeeklyTargets`, `useDomains`).

3. **Contexts**  
   Estado global em `src/contexts/`: `AppContext`, `AuthContext`, `ThemeContext`, `LanguageContext`, `ShortcutContext`, `NetworkStatusContext`, `WarRoomLayoutContext`.

4. **Lib**  
   Serviços e utilitários em `src/lib/`: `ai/` (context-builder, assistant-actions, insights-generator, usage-tracker), `rag/` (priority-context, goal-embeddings), `search/`, `export/`, `notifications/`, `goals/`, `tags/`, `pwa/`.

5. **Supabase (Lovable Cloud)**  
   Cliente em `src/integrations/supabase/client`. Migrations em `supabase/migrations/`. Edge Functions em `supabase/functions/`.

## Edge Functions (3 ativas)

| Function | Uso | Gateway |
|---|---|---|
| `assistant-chat` | Consultant AI, auto-categorize, journal coach, weekly insights | Lovable AI (gemini-3-flash-preview) |
| `rag-chat` | RAG Consultant com contexto completo do usuário (streaming SSE) | Lovable AI |
| `calendar-sync` | Sync com Google Calendar | Supabase client |

Shared module: `_shared/ai-gateway.ts` (wrapper do Lovable AI Gateway), `_shared/cors.ts`, `_shared/supabase.ts`.

## Banco de Dados (14 tabelas core)

| Grupo | Tabelas |
|---|---|
| Produtividade | `opportunities`, `goals`, `daily_logs`, `habits`, `habit_completions` |
| Organização | `life_domains`, `calendar_events`, `weekly_targets`, `weekly_reviews` |
| AI & Busca | `chat_history`, `knowledge_base`, `search_history` |
| Gamificação | `xp_summaries` |
| Sistema | `notifications` |

Todas as tabelas têm RLS policies (user_id = auth.uid()).

## Fluxo de dados

- Dados vêm do Supabase via hooks em `src/hooks/data/`. O `useLocalData` atua como Facade.
- AI: Edge functions usam `_shared/ai-gateway.ts` → Lovable AI Gateway (`LOVABLE_API_KEY`).
- Busca: `useSearch` usa `semantic-search` e `indexer`.
- Auth: `AuthContext` com Supabase Auth (email/password + session timeout).

## Core Loop

```
Journal (captura) → AI (processa) → Opportunities (organiza) → Goals (direciona) → Dashboard (visualiza)
```

## 8 Features Core

Dashboard, Consultant, Opportunities, Journal, Goals, Habits, Calendar, Analytics.
