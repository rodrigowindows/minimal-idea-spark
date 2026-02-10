# Estado global, cache e persistência

## Contextos

| Contexto | Responsabilidade | Persistência |
|----------|------------------|--------------|
| **AppContext** | sidebarOpen, deepWorkMode, currentOpportunity, levelUpTriggered, commandPaletteOpen | Só memória |
| **AuthContext** | session, user (Supabase Auth) | Supabase; loading inicial do session |
| **ThemeContext** | dark/light | localStorage (ou sistema) |
| **LanguageContext** | language (pt-BR, en, es), t() | Só memória (ou localStorage se implementado) |
| **WarRoomLayoutContext** | order, visible (widgets do dashboard) | localStorage |
| **WorkspaceContext** | currentOrg, workspaces | Supabase + memória |
| **RealtimeContext** | presences, edits, chat | Supabase Realtime; room por workspace |

## Dados locais (useLocalData)

- **opportunities, domains, dailyLogs, habits, goals, automations:** leitura inicial de localStorage; mutações atualizam localStorage e opcionalmente Supabase (sync).
- **Snapshot/versioning:** createSnapshot e histórico em lib/versioning e IndexedDB/localStorage conforme implementado.

## React Query

- **QueryClient** em App.tsx com staleTime 5 min e gcTime 30 min.
- Queries que dependem de APIs (Supabase, Edge Functions) usam React Query onde aplicável; dados puramente locais seguem em useLocalData.

## Busca e offline

- **useSearch** e **semantic-search:** histórico em localStorage (lifeos_search_history); remoto (tabela search_history) quando existir; flag para desabilitar remoto após 404.
- **Fila de sync (PWA):** lib/pwa/sync-queue e sync-processor; processQueue no flush; dados pendentes em IndexedDB/armazenamento persistente.

## Regra

- Evitar novos contextos globais sem necessidade; preferir estado local e “lift” quando uma subárvore precisar. Se um dado for usado em 3+ lugares distantes, aí considerar context ou store.
