# 📊 Feature Score — LifeOS

> Avaliação estratégica de cada feature do produto. Score baseado em: valor para o usuário, complexidade de manutenção, uso real esperado e diferenciação no mercado.

**Última atualização**: 2026-03-08

---

## 🟢 Score Alta — Core do produto

| Feature | Score | Tabelas DB | Edge Functions | Nota |
| :--- | :--- | :--- | :--- | :--- |
| **Dashboard** | ✅ Alta | xp_summaries, opportunities | — | Centro do app. Primeiro contato do usuário. Essencial. |
| **Opportunities (Kanban)** | ✅ Alta | opportunities | — | Feature principal de produtividade. Kanban + Eisenhower são diferenciais. |
| **Journal** | ✅ Alta | daily_logs | smart-capture, transcribe-audio | Captura rápida de ideias. Integra com AI para extrair oportunidades. Alto valor percebido. |
| **Goals / OKRs** | ✅ Alta | goals | — | Dá propósito ao sistema. Sem goals, o app vira lista de tarefas genérica. |
| **Consultant (AI Chat)** | ✅ Alta | chat_history, knowledge_base | rag-chat, assistant-chat | Diferencial competitivo #1. AI que conhece seu contexto pessoal. |
| **Auth + RLS** | ✅ Alta | (auth schema) | — | Fundação de segurança. Sem isso nada funciona. |

---

## 🟡 Score Média — Úteis mas não essenciais no MVP

| Feature | Score | Tabelas DB | Edge Functions | Nota |
| :--- | :--- | :--- | :--- | :--- |
| **Habits** | 🟡 Média | habits, habit_completions | — | Bom complemento mas já existem apps excelentes (Streaks, Habitica). Pode ser simplificado. |
| **Calendar** | 🟡 Média | calendar_events | calendar-sync | Overlap com Google Calendar. Valor real só com integração bidirecional. Sem ela, é redundante. |
| **Analytics** | 🟡 Média | (lê de várias tabelas) | generate-insights | Bonito mas poucos usuários revisam analytics regularmente. Manter simples. |
| **Weekly Review** | 🟡 Média | weekly_reviews | — | Boa prática mas baixa frequência (1x/semana). Pode ser um modal no Dashboard. |
| **Notifications** | 🟡 Média | notifications | send-notification | Necessário mas não é feature — é infraestrutura. Manter in-app, não over-engineer. |
| **Priorities (RAG)** | 🟡 Média | user_priorities | rag-priority | Conceito interessante mas overlap com Goals. Considerar merge com Goals. |
| **XP / Gamification** | 🟡 Média | xp_summaries | — | Engajamento no curto prazo. Pode cansar no longo prazo. Manter sutil. |

---

## 🔵 Score Baixa — Considerar simplificar ou remover

| Feature | Score | Tabelas DB | Edge Functions | Nota |
| :--- | :--- | :--- | :--- | :--- |
| **Smart Search (semantic)** | 🔵 Baixa | search_history | vector-search, generate-embedding | Over-engineering. Busca simples por texto resolve 95% dos casos. Embeddings são custo sem retorno claro. |
| **Deep Work / Pomodoro** | 🔵 Baixa | — (local) | — | Já existem centenas de apps. Não é diferencial. Timer simples basta. |
| **Time Blocking** | 🔵 Baixa | — | — | Overlap com Calendar. Complexo de manter. Poucos usariam. |
| **Template Marketplace** | 🔵 Baixa | — | template-marketplace | Prematuro. Precisa de base de usuários primeiro. |
| **Onboarding Tour** | 🔵 Baixa | — (local) | — | Útil mas pode ser substituído por bom design. Over-engineered atualmente. |
| **Help Center** | 🔵 Baixa | — | — | Página estática. Pode ser link externo (docs/FAQ). |
| **War Room / Widgets** | 🔵 Baixa | — | — | Conceito ambicioso mas UX complexa. Dashboard já resolve. |

---

## 🚫 Score N/A — Remover ou não priorizar

| Feature | Score | Nota |
| :--- | :--- | :--- |
| **Night Worker UI** | 🚫 N/A | Já removido da sidebar. Backend pode ficar, UI não faz sentido no LifeOS. |
| **PWA Offline completo** | 🚫 N/A | Complexidade enorme para pouco ganho. Service worker básico basta. |
| **Email Digest** | 🚫 N/A | Requer infraestrutura de email. ROI baixíssimo. |
| **Webhooks / API pública** | 🚫 N/A | Prematuro. Sem base de usuários, API pública é desperdício. |
| **Workspace / Multi-account** | 🚫 N/A | Complexidade de multi-tenancy sem público definido. |
| **Image Generation** | 🚫 N/A | Não se encaixa no propósito do produto. |
| **Collaboration (Realtime)** | 🚫 N/A | LifeOS é pessoal. Colaboração adiciona complexidade sem valor. |

---

## 🎯 Recomendação: Foco no Core Loop

O **core loop** do LifeOS que gera valor real é:

```
Journal (captura) → AI (processa) → Opportunities (organiza) → Goals (direciona) → Dashboard (visualiza)
```

### Ações sugeridas:

1. **Manter forte**: Dashboard, Opportunities, Journal, Goals, Consultant
2. **Simplificar**: Habits (menos campos), Calendar (integração ou remover), Analytics (1 tela simples)
3. **Merge**: Priorities → Goals (são conceitualmente a mesma coisa)
4. **Remover da UI**: Help Center (→ link externo), War Room, Time Blocking, Template Marketplace
5. **Limpar código**: ~15 edge functions que não são usadas ativamente

### Edge Functions — Score de uso real

| Function | Usada? | Nota |
| :--- | :--- | :--- |
| assistant-chat | ✅ Sim | Core do Consultant |
| rag-chat | ✅ Sim | RAG com contexto |
| smart-capture | ✅ Sim | Journal AI processing |
| transcribe-audio | 🟡 Talvez | Depende se voice input funciona |
| generate-insights | 🟡 Talvez | Analytics AI |
| calendar-sync | ❌ Não | Sem integração real |
| generate-content | ❌ Não | Sem uso no frontend |
| generate-embedding | ❌ Não | Semantic search desligada |
| vector-search | ❌ Não | Idem |
| generate-image | ❌ Não | Sem uso |
| create-snapshot | ❌ Não | Sem uso |
| email-inbound | ❌ Não | Sem uso |
| send-digest | ❌ Não | Sem uso |
| template-marketplace | ❌ Não | Sem uso |
| webhook-deliver | ❌ Não | Sem uso |
| webhook-inbound | ❌ Não | Sem uso |
| invite-member | ❌ Não | Sem uso |
| run-automation | ❌ Não | Sem uso |
| send-notification | ❌ Não | Sem uso |
| nightworker-prompts | ❌ Não | Backend NW |
| api-auth | ❌ Não | API pública não existe |
| rag-priority | 🟡 Talvez | Priorities page |
| rag-query | ❌ Não | Sem uso direto |

---

## 📐 Métricas de complexidade

| Área | Arquivos | Nota |
| :--- | :--- | :--- |
| Night Worker (frontend) | ~30 arquivos | Removido da UI mas código ainda existe. Candidato a limpeza. |
| Edge Functions | 22 functions | ~12 sem uso real. Candidatas a remoção. |
| Tabelas DB | 21 tabelas | ~5 são NW-only. Core usa ~10. |
| Contexts | 8 contexts | Muitos. Considerar consolidar. |
| Hooks | ~40 hooks | Over-engineered. Muitos hooks fazem pouco. |

---

**Resumo**: O LifeOS tem um core loop excelente (Journal → AI → Opportunities → Goals) enterrado sob muitas features de baixo ROI. Simplificar agressivamente aumentaria qualidade percebida e velocidade de desenvolvimento.
