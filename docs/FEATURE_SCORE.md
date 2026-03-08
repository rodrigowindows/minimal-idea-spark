# 📊 Feature Score — LifeOS

> Avaliação estratégica de cada feature do produto. Score baseado em: valor para o usuário, complexidade de manutenção, uso real esperado e diferenciação no mercado.

**Última atualização**: 2026-03-08

---

## 🟢 Score Alta — Core do produto

| Feature | Score | Tabelas DB | Edge Functions | Nota |
| :--- | :--- | :--- | :--- | :--- |
| **Dashboard** | ✅ Alta | xp_summaries, opportunities | — | Centro do app. Primeiro contato do usuário. Essencial. |
| **Opportunities (Kanban)** | ✅ Alta | opportunities | — | Feature principal de produtividade. Kanban + Eisenhower são diferenciais. |
| **Journal** | ✅ Alta | daily_logs | — | Captura rápida de ideias. Integra com AI para extrair oportunidades. Alto valor percebido. |
| **Goals / OKRs** | ✅ Alta | goals | — | Dá propósito ao sistema. Priority levels integrados (critical/high/medium/low). |
| **Consultant (AI Chat)** | ✅ Alta | chat_history, knowledge_base | rag-chat, assistant-chat | Diferencial competitivo #1. AI via Lovable AI Gateway (sem API key do usuário). |
| **Auth + RLS** | ✅ Alta | (auth schema) | — | Fundação de segurança. Todas as tabelas com RLS por user_id. |

---

## 🟡 Score Média — Úteis mas não essenciais no MVP

| Feature | Score | Tabelas DB | Edge Functions | Nota |
| :--- | :--- | :--- | :--- | :--- |
| **Habits** | 🟡 Média | habits, habit_completions | — | Bom complemento. Streaks e frequência configurável. |
| **Calendar** | 🟡 Média | calendar_events | calendar-sync | Valor real com integração Google Calendar. |
| **Analytics** | 🟡 Média | (lê de várias tabelas) | — | AI weekly insights via assistant-chat. Manter simples. |
| **Weekly Review** | 🟡 Média | weekly_reviews | — | Boa prática, baixa frequência (1x/semana). |
| **Notifications** | 🟡 Média | notifications | — | In-app only. Infraestrutura, não feature. |
| **XP / Gamification** | 🟡 Média | xp_summaries | — | Engajamento no curto prazo. Manter sutil. |

---

## 🔵 Score Baixa — Considerar simplificar ou remover

| Feature | Score | Nota |
| :--- | :--- | :--- |
| **Smart Search (semantic)** | 🔵 Baixa | Usa generate-embedding + vector-search. Embedding retorna vazio (placeholder). Busca simples resolve 95% dos casos. |
| **Deep Work / Pomodoro** | 🔵 Baixa | Local only. Timer simples. |
| **Time Blocking** | 🔵 Baixa | Overlap com Calendar. |
| **Onboarding Tour** | 🔵 Baixa | Pode ser substituído por bom design. |
| **Help Center** | 🔵 Baixa | Página estática. Pode ser link externo. |
| **War Room / Widgets** | 🔵 Baixa | Dashboard já resolve. |

---

## 🎯 Core Loop

```
Journal (captura) → AI (processa) → Opportunities (organiza) → Goals (direciona) → Dashboard (visualiza)
```

---

## 📐 Estado atual do projeto

| Área | Quantidade | Nota |
| :--- | :--- | :--- |
| Edge Functions | 5 ativas | assistant-chat, rag-chat, generate-embedding, vector-search, calendar-sync |
| Tabelas DB | 14 tabelas | Todas com RLS. Sem tabelas órfãs. |
| AI Gateway | Lovable AI | gemini-3-flash-preview via `_shared/ai-gateway.ts` |
| DB Functions | 1 (update_updated_at) | Funções NW removidas. |

### Limpezas realizadas

- ❌ Removidas 17 edge functions sem uso no frontend
- ❌ Removidas 8 tabelas (6 NW + user_priorities + ideas)
- ❌ Removidas 3 DB functions NW (claim_prompts, reset_stalled, reorder_prioritized)
- ❌ Removidos ~10 docs NightWorker
- ✅ Priorities merged into Goals (campo priority_level)
- ✅ Renomeado _shared/openai.ts → _shared/ai-gateway.ts

---

**Resumo**: O LifeOS tem um core loop excelente (Journal → AI → Opportunities → Goals) agora limpo de dívida técnica. Foco em polimento das 8 features core.
