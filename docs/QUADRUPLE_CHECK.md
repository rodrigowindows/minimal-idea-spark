# Quadruple check – verificação em 4 níveis

Este documento descreve as 4 verificações aplicadas após implementar os prompts.

---

## Check 1: Estrutura e arquivos esperados pelos prompts

| Prompt | Esperado | Status |
|--------|----------|--------|
| 01 | AudioToText, audio-transcription, transcribe-audio (ou Deepgram client) | OK – Deepgram em lib; Edge Function existe |
| 02 | WorkspaceSwitcher, InviteMembers, schema-organizations | OK |
| 03 | priority-context, goal-embeddings, PriorityDashboard, rag-priority | OK |
| 04 | CalendarView, EventModal, calendar-integration, ai-scheduling, calendar-sync | OK |
| 05 | collaboration.ts, CollaborativeCursor, PresenceIndicator, useRealtimeSync | OK |
| 06 | content-generator, ContentGenerator, PromptTemplates, generate-content | OK |
| 07 | SmartSearch, semantic-search, indexer, useSearch, vector-search | OK |
| 08 | Analytics/Dashboard, Charts, metrics, insights-generator, generate-insights | OK |
| 09 | Automation/Builder, engine, triggers, actions, run-automation | OK |
| 10 | manifest, PWA (offline-manager, push-notifications), MobileNav | OK – public/manifest, lib/pwa |
| 11–16 | Chat, templates, notifications, versioning, images, tags | OK |
| 17–22 | Testes, i18n, a11y, performance, onboarding, export | OK |
| 23–30 | Segurança, temas, atalhos, offline, integrações, relatórios, War Room, lembretes | OK |
| 31–39 | Metas, email, import, sidebar, breadcrumbs, empty states, PageHeader, mobile nav, CommandPalette | OK |
| 40–49 | docs/, ADRs, logger, ErrorBoundary fallback, EmptyState a11y, Dialog a11y, RELEASE_CHECKLIST, DEPLOY, form JSDoc, VirtualList a11y | OK |

---

## Check 2: CSS e layout

- **index.css:** Variáveis HSL em :root e .dark; base (border-color, body, headings); utilities (text-gradient, animate-fade-in); focus, sr-only, reduced-motion, touch targets com opt-out `.touch-target-auto`. Sem conflitos.
- **AppLayout:** Root `flex h-screen overflow-hidden`; Sidebar `flex-shrink-0`; main `min-w-0 flex-1 overflow-y-auto overflow-x-hidden`; OfflineBanner `fixed` (fora do fluxo).
- **Sidebar:** Largura fixa (w-16 / w-64), h-full min-h-screen, flex-shrink-0.
- **Mobile:** Header e MobileNav fixos; main com pt-14 pb-16.

---

## Check 3: Acessibilidade e erros

- **Dialog:** aria-describedby tratado em dialog.tsx (evita aviso Radix).
- **EmptyState:** role="status", aria-live="polite", aria-label.
- **VirtualList:** role="list", role="listitem", aria-posinset, aria-setsize.
- **ErrorBoundary:** Usa ErrorFallback com onRetry; logger em componentDidCatch.
- **NotFound / ErrorFallback:** i18n e links (Home, Settings, Retry).

---

## Check 4: Consistência de código

- **Contextos:** AppContext, AuthContext, RealtimeContext com JSDoc.
- **Hooks:** useLocalData, useSearch com JSDoc.
- **Logger:** src/lib/logger.ts (dev vs prod); usado no ErrorBoundary.
- **Form:** form.tsx com JSDoc; FormField + FormItem + FormControl + FormMessage para formulários acessíveis.
- **Sem quebras:** Nenhum import removido em uso; OfflineBanner fixo; useOnlineStatus removido apenas onde não era usado.

---

## Como rodar as verificações

1. **Check 1:** Comparar lista acima com `src/` e `supabase/functions/`.
2. **Check 2:** Inspecionar index.css, AppLayout, Sidebar, MobileNav.
3. **Check 3:** Abrir modais, listas vazias, 404 e forçar erro no ErrorBoundary.
4. **Check 4:** Buscar por JSDoc em contextos/hooks; garantir que logger e form estão documentados.

Build e testes (quando disponíveis): `npm run build` e `npm run test` como verificação final.
