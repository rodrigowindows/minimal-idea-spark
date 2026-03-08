# Arquitetura

## Camadas

1. **UI (components/pages)**  
   Componentes React e páginas em `src/components/`, `src/pages/`. Layout em `AppLayout`, Sidebar, PageHeader, MobileNav. UI base em `src/components/ui/` (shadcn).

2. **Hooks**  
   Lógica reutilizável em `src/hooks/`: `useLocalData`, `useSearch`, `useAudioTranscription`, `useRealtimeSync`, `useXPSystem`, etc.

3. **Contexts**  
   Estado global em `src/contexts/`: `AppContext`, `AuthContext`, `ThemeContext`, `LanguageContext`, `WarRoomLayoutContext`, `WorkspaceContext`, `RealtimeContext`.

4. **Lib**  
   Serviços e utilitários em `src/lib/`: `audio-transcription`, `search/` (indexer, semantic-search), `rag/`, `automation/`, `pwa/`, `export/`, etc.

5. **Supabase**  
   Cliente em `src/integrations/supabase/client`. Migrations em `supabase/migrations/`. Edge Functions em `supabase/functions/` (RAG, transcribe, calendar-sync, vector-search, etc.).

6. **Edge Functions**  
   Servidor serverless: `rag-chat`, `generate-embedding`, `vector-search`, `transcribe-audio`, `generate-content`, `calendar-sync`, `invite-member`, entre outras.

## Fluxo de dados

- Dados locais (opportunities, journal, habits, goals) vêm de `useLocalData` (localStorage + sync opcional com Supabase).
- Busca: `useSearch` usa `semantic-search` e `indexer` (local e/ou remoto).
- Transcrição: Deepgram no client via `lib/audio-transcription.ts`.
- Colaboração: `RealtimeContext` + `useRealtimeSync` (presença, cursores, chat por workspace).

