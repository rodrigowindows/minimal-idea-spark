# NightWorker QA Master Plan (Frontend + Edge + Worker)

## Escopo e metodo
Este documento foi gerado apos leitura de codigo e diffs recentes nos repositorios:
- `C:\code\minimal-idea-spark`
- `C:\code\claude-auto`

Comandos executados para baseline:
- `git -C C:\code\minimal-idea-spark log --oneline -20`
- `git -C C:\code\claude-auto log --oneline -20`
- `git -C C:\code\minimal-idea-spark diff HEAD~10..HEAD --stat -- src/ supabase/`
- `git -C C:\code\claude-auto diff HEAD~10..HEAD --stat -- src/`

## 1) Diagnostico tecnico do estado atual

| Componente | Comportamento atual | Evidencia (arquivo:linha) | Risco |
|---|---|---|---|
| Edge Auth | Escopos por rota com `claim`, `patch`, `heartbeat`; `worker-tokens` so `service_role` | `supabase/functions/nightworker-prompts/index.ts:170`, `supabase/functions/nightworker-prompts/index.ts:221`, `supabase/functions/nightworker-prompts/index.ts:240`, `supabase/functions/nightworker-prompts/index.ts:257`, `supabase/functions/nightworker-prompts/index.ts:320` | Baixo |
| Edge Public API | `GET /prompts` e `POST /prompts` publicos (sem auth) | `supabase/functions/nightworker-prompts/index.ts:212`, `supabase/functions/nightworker-prompts/index.ts:307` | Medio |
| Edge Create | `POST /prompts` sempre grava `status='pending'` | `supabase/functions/nightworker-prompts/index.ts:757` | Baixo |
| Edge Create validation | Validacao forte para pipeline metadata e dependencia de `pipeline_id` | `supabase/functions/nightworker-prompts/index.ts:655`, `supabase/functions/nightworker-prompts/index.ts:701` | Baixo |
| Edge Create idempotency | Conflito unico pipeline retorna `200 {id, idempotent:true}` | `supabase/functions/nightworker-prompts/index.ts:775`, `supabase/functions/nightworker-prompts/index.ts:795` | Baixo |
| Edge List | Suporta filtro `pipeline_id`; ordena por `pipeline_step ASC` no pipeline | `supabase/functions/nightworker-prompts/index.ts:555`, `supabase/functions/nightworker-prompts/index.ts:585` | Baixo |
| Edge PATCH | Validacao de campos pipeline + idempotencia de transicao terminal | `supabase/functions/nightworker-prompts/index.ts:1130`, `supabase/functions/nightworker-prompts/index.ts:1217`, `supabase/functions/nightworker-prompts/index.ts:1227` | Baixo |
| Move/Edit | Move e edit bloqueiam status diferente de `pending` | `supabase/functions/nightworker-prompts/index.ts:825`, `supabase/functions/nightworker-prompts/index.ts:898` | Baixo |
| Reprocess | Clone preserva metadados de pipeline e entra `prioritized` | `supabase/functions/nightworker-prompts/index.ts:987`, `supabase/functions/nightworker-prompts/index.ts:998` | Baixo |
| Health/Heartbeat | `/health` monta workers por heartbeat + backlog/prioritized/processando | `supabase/functions/nightworker-prompts/index.ts:452`, `supabase/functions/nightworker-prompts/index.ts:468`, `supabase/functions/nightworker-prompts/index.ts:534` | Baixo |
| DB Queue stage | `queue_stage` + `priority_order` + `cloned_from` com indices | `supabase/migrations/20260215103000_nightworker_queue_stage_and_worker_tokens.sql:5`, `supabase/migrations/20260215103000_nightworker_queue_stage_and_worker_tokens.sql:44`, `supabase/migrations/20260215103000_nightworker_queue_stage_and_worker_tokens.sql:51` | Baixo |
| DB Claim RPC | Claim atomico com `FOR UPDATE SKIP LOCKED` | `supabase/migrations/20260215103000_nightworker_queue_stage_and_worker_tokens.sql:81` | Baixo |
| DB Claim policy | Claim atual seleciona apenas `queue_stage='prioritized'` | `supabase/migrations/20260215103000_nightworker_queue_stage_and_worker_tokens.sql:76` | Medio |
| DB reset stalled | `reset_stalled_prompts` usa janela de 15 minutos | `supabase/migrations/20260215090000_nightworker_claim_processing_heartbeats.sql:87` | Medio |
| DB cron | Agenda auto somente se `pg_cron` existe; caso contrario, manual | `supabase/migrations/20260215090000_nightworker_claim_processing_heartbeats.sql:179`, `supabase/migrations/20260215090000_nightworker_claim_processing_heartbeats.sql:185` | Medio |
| DB pipeline constraints | Campos pipeline + checks e unique parcial por `cloned_from is null` | `supabase/migrations/20260216000000_nightworker_pipeline_support.sql:4`, `supabase/migrations/20260216000000_nightworker_pipeline_support.sql:15`, `supabase/migrations/20260216000000_nightworker_pipeline_support.sql:38` | Baixo |
| Frontend polling | Lista: 15s ativo / 30s idle; detalhe: 15s para pending/processing; pipeline: 10s/30s | `src/hooks/useNightWorkerApi.ts:81`, `src/hooks/useNightWorkerApi.ts:129`, `src/hooks/useNightWorkerApi.ts:177`, `src/hooks/useNightWorkerApi.ts:204` | Baixo |
| Frontend Kanban | Doing reflete backend `processing`; drag done/failed para backlog/prioritized dispara reprocess | `src/components/night-worker/PromptsKanban.tsx:57`, `src/components/night-worker/PromptsKanban.tsx:93` | Baixo |
| Frontend UX rule | Aviso explicito: backlog nao executa | `src/pages/NWPrompts.tsx:166` | Baixo |
| Frontend pipeline | Templates localStorage + run page cria step1 com metadata; detail mostra barra com navegacao por step | `src/lib/nightworker/pipelineTemplates.ts:3`, `src/pages/NWRunTemplate.tsx:57`, `src/pages/NWRunTemplate.tsx:80`, `src/pages/NWPromptDetail.tsx:44`, `src/pages/NWPromptDetail.tsx:186` | Baixo |
| Worker chain | Encadeia so apos `mark_done` true; cria proximo com `queue_stage='prioritized'` | `src/night_worker/worker.py:306`, `src/night_worker/worker.py:313`, `src/night_worker/worker.py:418`, `src/night_worker/worker.py:428` | Baixo |
| Worker retry metadata | Rate limit persiste `failed + next_retry_at` no banco | `src/night_worker/worker.py:323`, `src/night_worker/worker.py:328` | Baixo |
| Worker attempts | Incrementa `attempts` com base no valor atual | `src/night_worker/worker.py:310`, `src/night_worker/worker.py:331`, `src/night_worker/worker.py:337` | Baixo |
| Worker identity | Reusa `worker_id` via `worker_state.json` | `src/night_worker/worker.py:42`, `src/night_worker/worker.py:55`, `src/night_worker/worker.py:175`, `src/night_worker/worker.py:200` | Baixo |
| Worker config | Le apenas `config.json` | `src/night_worker/worker.py:116`, `src/night_worker/worker.py:128` | Baixo |
| Worker auth token | Prioriza `SUPABASE_WORKER_TOKEN`; fallback service role | `src/night_worker/worker.py:67`, `src/night_worker/worker.py:69`, `src/night_worker/worker.py:71` | Medio |
| Providers output | Claude/Gemini capturam stdout; Codex prioriza arquivo last-message; OpenAI stdout | `src/night_worker/providers/claude.py:57`, `src/night_worker/providers/gemini.py:48`, `src/night_worker/providers/codex.py:37`, `src/night_worker/providers/codex.py:106`, `src/night_worker/providers/openai.py:34` | Alto |
| OpenAI cwd | Provider OpenAI nao usa `work_dirs`/`cwd` | `src/night_worker/providers/openai.py:22`, `src/night_worker/providers/openai.py:34` | Medio |

## 1.1 Esperado vs Implementado (gaps)

| Tema | Esperado | Implementado | Gap/Impacto |
|---|---|---|---|
| Claim backlog fallback | Priorizar `prioritized` e depois backlog por `created_at` | RPC atual seleciona apenas `queue_stage='prioritized'` | Backlog nunca executa automaticamente (ok se for regra de produto; risco se usuario esperar fallback) |
| Reset stalled threshold | 10 min | 15 min | Janela de recuperacao mais lenta |
| Captura de resultado | Resultado rico para usuario e pipeline | Predominio de stdout/last-message, sem diff de filesystem | `previous_result` pode ser fraco/curto em pipelines |
| OpenAI provider cwd | Respeitar target folder igual outros providers | `openai.py` nao configura `cwd` | Comportamento inconsistente entre providers |
| Public create/list | Pode exigir auth em ambientes sensiveis | `POST /prompts` e `GET /prompts` publicos por design | Exposicao operacional se URL vazar |
| Cron de reset | Sempre ativo | So agenda se `pg_cron` instalado | Ambiente sem `pg_cron` depende de job externo/manual |

## 2) Casos de Uso detalhados (UC-001 a UC-020)

### UC-001 - Fluxo feliz prompt unico
- Ator: Usuario + Worker
- Pre-condicoes: Edge online; worker provider ativo com token valido
- Passos:
1. Usuario envia `POST /prompts`.
2. Worker faz `POST /claim`.
3. Worker executa provider e faz `PATCH /prompts/:id` para `done`.
- Resultado esperado: Prompt termina `done` com `result_content` e evento.
- Erros esperados: 400 (payload invalido), 403 (token invalido no worker).
- Observabilidade: logs edge `created/claim/patch_ok`, tabela `nw_prompt_events`.

### UC-002 - Fluxo falha de provider
- Ator: Worker
- Pre-condicoes: Prompt pending claimed
- Passos:
1. Provider retorna erro nao rate-limit.
2. Worker envia `PATCH status=failed`.
- Resultado esperado: `status=failed`, `error` preenchido.
- Erros esperados: 403/409 no patch.
- Observabilidade: evento `failed`, metrica `prompt_updated`.

### UC-003 - Rate limit com retry metadata
- Ator: Worker
- Pre-condicoes: Prompt pending claimed
- Passos:
1. Provider retorna `RATE_LIMIT`.
2. Worker envia `failed` com `next_retry_at` (+5 min).
- Resultado esperado: retry persistido no banco.
- Erros esperados: patch failure.
- Observabilidade: log WARN rate limit + campos `attempts` e `next_retry_at`.

### UC-004 - Timeout de provider
- Ator: Worker
- Pre-condicoes: timeout configurado
- Passos:
1. CLI excede timeout.
2. Worker marca `failed`.
- Resultado esperado: prompt finaliza em failed.
- Erros esperados: subprocess exception.
- Observabilidade: log timeout no provider.

### UC-005 - Seguranca PATCH sem escopo
- Ator: Cliente nao autorizado
- Pre-condicoes: Prompt existente
- Passos:
1. Chamar `PATCH /prompts/:id` sem token (ou token sem patch).
- Resultado esperado: 403.
- Erros esperados: nenhum adicional.
- Observabilidade: log `forbidden` no edge.

### UC-006 - Seguranca claim sem escopo
- Ator: Cliente nao autorizado
- Pre-condicoes: Prompt pending existente
- Passos:
1. Chamar `POST /claim` sem token.
- Resultado esperado: 403.
- Observabilidade: log `forbidden`.

### UC-007 - Kanban move backlog -> prioritized
- Ator: Usuario
- Pre-condicoes: Prompt pending no backlog
- Passos:
1. Drag card para coluna prioritized.
2. Front chama `POST /prompts/:id/move`.
- Resultado esperado: `queue_stage=prioritized`, `priority_order` definido.
- Erros esperados: 409 se nao estiver pending.
- Observabilidade: update no DB e refresh da lista.

### UC-008 - Reorder de priorizados
- Ator: Usuario
- Pre-condicoes: >=2 prompts priorizados
- Passos:
1. Drag reorder na coluna prioritized.
2. Front chama `POST /prompts/reorder`.
- Resultado esperado: `priority_order` atualizado.
- Erros esperados: 400 ids invalidos/duplicados.
- Observabilidade: retorno `{updated, requested}`.

### UC-009 - Reprocess por drag de done para backlog/prioritized
- Ator: Usuario
- Pre-condicoes: Prompt done/failed
- Passos:
1. Drag card final para backlog/prioritized.
2. Front dispara `POST /prompts/:id/reprocess`.
- Resultado esperado: clone pending/prioritized com `cloned_from`.
- Erros esperados: 409 se status nao terminal.
- Observabilidade: eventos `reprocess_requested` e `reprocessed`.

### UC-010 - Pipeline 3 passos happy path
- Ator: Usuario + Worker
- Pre-condicoes: template valido; workers ativos
- Passos:
1. `NWRunTemplate` cria step1 com metadata pipeline.
2. Worker conclui step1 e cria step2.
3. Worker conclui step2 e cria step3.
4. Worker conclui step3.
- Resultado esperado: passos 1..3 done; sem step4.
- Observabilidade: `GET /prompts?pipeline_id=` ordenado por `pipeline_step`.

### UC-011 - Pipeline para em falha
- Ator: Worker
- Pre-condicoes: step2 falha
- Passos:
1. Step1 done gera step2.
2. Step2 failed.
- Resultado esperado: step3 nao criado.
- Observabilidade: ausencia de row step3.

### UC-012 - Pipeline reprocess de passo falho
- Ator: Usuario + Worker
- Pre-condicoes: step2 failed
- Passos:
1. Reprocessar step2.
2. Clone step2 done.
3. Worker cria step3.
- Resultado esperado: pipeline retoma sem quebrar historico.
- Observabilidade: clone com `cloned_from`, mesmo `pipeline_id`.

### UC-013 - Idempotencia pipeline (duplicate create)
- Ator: Worker/Sistema
- Pre-condicoes: step N ja existe
- Passos:
1. Tentar criar mesmo `(pipeline_id, pipeline_step)`.
- Resultado esperado: 200 com `idempotent: true` e `id` existente.
- Observabilidade: log `create_idempotent`.

### UC-014 - Pipeline com resultado vazio
- Ator: Worker
- Pre-condicoes: provider retorna sucesso com stdout vazio
- Passos:
1. step1 done com `result_content=''`.
2. chain cria step2 com `{previous_result}` vazio.
- Resultado esperado: step2 criado; avaliar utilidade do prompt.
- Observabilidade: `content` do step2 e qualidade de output.

### UC-015 - Concorrencia 2 workers mesmo provider
- Ator: Dois workers
- Pre-condicoes: multiplos pending priorizados
- Passos:
1. Ambos chamam claim simultaneo.
- Resultado esperado: sem duplicidade de processamento.
- Observabilidade: `FOR UPDATE SKIP LOCKED` no RPC.

### UC-016 - Prompt travado em processing
- Ator: Sistema
- Pre-condicoes: prompt processing com `processing_started_at` antigo
- Passos:
1. Executar `reset_stalled_prompts()`.
- Resultado esperado: volta para pending, incrementa attempts.
- Observabilidade: row atualizada com `error='Worker timeout - reset by cron'`.

### UC-017 - Editar prompt pendente
- Ator: Usuario
- Pre-condicoes: status pending
- Passos:
1. `POST /prompts/:id/edit` com name/content/target_folder.
- Resultado esperado: update aplicado.
- Erros esperados: 409 se status != pending.
- Observabilidade: evento `edit`.

### UC-018 - Navegacao de steps no detalhe
- Ator: Usuario
- Pre-condicoes: prompt com `pipeline_id`
- Passos:
1. Abrir `NWPromptDetail`.
2. Clicar em step na progress bar.
- Resultado esperado: navega para prompt daquele step.
- Observabilidade: rota `/nw/prompts/:id` atualizada.

### UC-019 - CRUD templates localStorage
- Ator: Usuario
- Pre-condicoes: frontend carregado
- Passos:
1. Criar, editar, deletar template em `NWTemplates`.
- Resultado esperado: persistencia em `nightworker_templates`.
- Observabilidade: localStorage + toasts.

### UC-020 - Executar template
- Ator: Usuario
- Pre-condicoes: template com >=1 step
- Passos:
1. Abrir `/nw/templates/:id/run`.
2. Submeter prompt base.
- Resultado esperado: cria step1 priorizado e redireciona detalhe.
- Observabilidade: `POST /prompts` com pipeline metadata.

## 3) Plano de Testes por camada

### A) Frontend (React)
- [ ] Render de paginas `/nw`, `/nw/submit`, `/nw/prompts`, `/nw/prompts/:id`, `/nw/templates`, `/nw/templates/:id/run`.
- [ ] Polling lista: 15s ativo, 30s idle.
- [ ] Polling detalhe: 15s para pending/processing.
- [ ] Kanban drag backlog/prioritized.
- [ ] Kanban drag done/failed para reprocess.
- [ ] Doing readonly refletindo `processing` backend.
- [ ] Pipeline progress bar + click de steps.
- [ ] Templates CRUD em localStorage.
- [ ] Run template cria step1 com metadata pipeline.
- [ ] Estados de loading/error/toast.
- [ ] Sidebar com link `/nw/templates`.

### B) Edge Function / API
- [ ] `POST /prompts` valido (simples e pipeline).
- [ ] `POST /prompts` invalido (provider/content/uuid/pipeline constraints).
- [ ] `POST /prompts` idempotencia por conflito pipeline.
- [ ] `GET /prompts` filtros status/provider/queue_stage/pipeline_id.
- [ ] `GET /prompts` ordenacao por pipeline_step quando pipeline_id.
- [ ] `GET /prompts/:id` com eventos.
- [ ] `PATCH /prompts/:id` valida campos pipeline.
- [ ] `PATCH /prompts/:id` idempotencia terminal.
- [ ] `POST /claim` auth + retorno claim.
- [ ] `POST /heartbeat` auth + upsert heartbeat.
- [ ] `POST /prompts/:id/move` so pending.
- [ ] `POST /prompts/:id/edit` so pending.
- [ ] `POST /prompts/:id/reprocess` preserva pipeline metadata.
- [ ] `POST /prompts/reorder` valida UUID e duplicados.
- [ ] `POST /worker-tokens` service_role.
- [ ] Payload > 1MB -> 413.

### C) Worker (Python)
- [ ] claim -> process -> mark_done.
- [ ] claim -> process -> mark_failed.
- [ ] rate_limit -> failed + next_retry_at.
- [ ] timeout handling nos providers.
- [ ] chain apos done com metadata correta.
- [ ] sem chain apos failed.
- [ ] truncamento `{previous_result}` em 120k.
- [ ] truncamento content final em 500k.
- [ ] idempotencia no create do proximo step.
- [ ] target_folder/cwd para claude, gemini, codex.
- [ ] heartbeat periodico.
- [ ] reuso worker_id via worker_state.json.
- [ ] comportamento com result vazio.

### D) Banco (PostgreSQL)
- [ ] constraints pipeline (`step >=1`, `total>=step`).
- [ ] unique parcial `(pipeline_id,pipeline_step) where cloned_from is null`.
- [ ] `claim_prompts` atomico com `SKIP LOCKED`.
- [ ] `claim_prompts` respeita ordem por `priority_order`.
- [ ] `reorder_prioritized_prompts` atualiza ordem.
- [ ] `reset_stalled_prompts` reseta stuck.
- [ ] agendamento cron ativo quando `pg_cron` disponivel.

## 4) Matriz de cobertura (Requisito x Testes)

| Req | Descricao | UC | TC | Camadas |
|---|---|---|---|---|
| R-01 | Criar prompt simples sem quebrar fluxo atual | UC-001 | TC-P0-001, TC-P0-002, TC-P1-016 | Frontend, Edge |
| R-02 | Claim atomico sem race | UC-015 | TC-P0-010, TC-P0-011 | Edge, DB, Worker |
| R-03 | PATCH protegido por escopo | UC-005, UC-006 | TC-P0-006, TC-P0-007, TC-P1-021 | Edge, Security |
| R-04 | Kanban persistente no DB | UC-007, UC-008 | TC-P0-008, TC-P0-009 | Frontend, Edge, DB |
| R-05 | Reprocess preserve pipeline metadata | UC-012 | TC-P0-014, TC-P1-022 | Edge, Worker, Frontend |
| R-06 | Pipeline chaining automatico | UC-010 | TC-P0-012, TC-P0-013 | Worker, Edge, DB |
| R-07 | Idempotencia pipeline step | UC-013 | TC-P0-015, TC-P1-023 | Edge, DB, Worker |
| R-08 | Resultado pipeline em detail/progress bar | UC-018 | TC-P1-024, TC-P1-025 | Frontend |
| R-09 | Seguranca worker tokens/scopes | UC-005, UC-006 | TC-P0-006..TC-P0-007, TC-P1-026..TC-P1-028 | Edge, DB |
| R-10 | Recuperacao de stuck prompts | UC-016 | TC-P1-029 | DB, Operacao |
| R-11 | Templates CRUD localStorage | UC-019 | TC-P1-030, TC-P2-031 | Frontend |
| R-12 | Qualidade de `previous_result` | UC-014 | TC-P2-036, TC-P2-037 | Worker, Providers |

## 5) Matriz de casos de teste (40 casos)

| TC_ID | Prioridade | Tipo | Cenario | Passos | Dados de teste | Resultado esperado | Automatizavel? | Camada |
|---|---|---|---|---|---|---|---|---|
| TC-P0-001 | P0 | API | Criar prompt valido | POST /prompts | provider=gemini | 201 + id | Sim | Edge |
| TC-P0-002 | P0 | E2E | Prompt unico happy path | create->claim->done | content curto | done com result | Sim | Full |
| TC-P0-003 | P0 | API | Provider invalido | POST /prompts | provider=invalid | 400 | Sim | Edge |
| TC-P0-004 | P0 | API | Pipeline metadata sem pipeline_id | POST /prompts | pipeline_step=1 | 400 | Sim | Edge |
| TC-P0-005 | P0 | API | Payload >1MB | POST /prompts | body grande | 413 | Sim | Edge |
| TC-P0-006 | P0 | Security | PATCH sem token | PATCH /prompts/:id | status=done | 403 | Sim | Edge |
| TC-P0-007 | P0 | Security | CLAIM sem token | POST /claim | provider=claude | 403 | Sim | Edge |
| TC-P0-008 | P0 | API | Move pending backlog->prioritized | POST /prompts/:id/move | stage=prioritized | 200 + priority_order | Sim | Edge |
| TC-P0-009 | P0 | API | Reorder priorizados | POST /prompts/reorder | ids[] validos | 200 updated>=1 | Sim | Edge/DB |
| TC-P0-010 | P0 | Concurrency | 2 workers mesmo provider | POST /claim concorrente | limit=1 | ids distintos | Semi | Edge/DB |
| TC-P0-011 | P0 | DB | SKIP LOCKED efetivo | claim paralelo | prompts pendentes | sem duplicidade | Semi | DB |
| TC-P0-012 | P0 | Worker | Pipeline cria proximo step | step1 done | pipeline 3 steps | step2 criado | Sim | Worker/Edge |
| TC-P0-013 | P0 | Worker | Pipeline stop on failure | step2 falha | erro provider | step3 nao criado | Sim | Worker |
| TC-P0-014 | P0 | API | Reprocess preserva metadata | POST /reprocess | prompt pipeline failed | clone com pipeline_id/step | Sim | Edge |
| TC-P0-015 | P0 | API/DB | Idempotencia duplicate step | POST mesmo step duas vezes | mesmo pipeline_id/step | 2a resposta 200 idempotent | Sim | Edge/DB |
| TC-P1-016 | P1 | Front | Polling lista ativo/idle | observar refetch | statuses mistos | 15s ativo, 30s idle | Sim | Frontend |
| TC-P1-017 | P1 | Front | Polling detalhe | abrir prompt pending | id valido | 15s enquanto ativo | Sim | Frontend |
| TC-P1-018 | P1 | Front | Kanban doing readonly | tentar drop em doing | card pending | sem alteracao | Sim | Frontend |
| TC-P1-019 | P1 | Front/API | Drag done->prioritized reprocess | drag card final | done id | clone criado | Semi | Front+Edge |
| TC-P1-020 | P1 | API | Edit pending permitido | POST /edit | name/content | 200 + evento edit | Sim | Edge |
| TC-P1-021 | P1 | API | Edit nao pending bloqueado | POST /edit | status=done | 409 | Sim | Edge |
| TC-P1-022 | P1 | API | Reprocess status nao terminal | POST /reprocess | status=pending | 409 | Sim | Edge |
| TC-P1-023 | P1 | Worker | chain idempotente em erro create | simular duplicate | create retorna idempotent/None | worker nao crasha | Semi | Worker |
| TC-P1-024 | P1 | Front | Progress bar pipeline render | abrir detalhe pipeline | pipeline_id | steps renderizados | Sim | Frontend |
| TC-P1-025 | P1 | Front | Navegar clicando step | click step button | step com promptId | navega /nw/prompts/:id | Sim | Frontend |
| TC-P1-026 | P1 | Security | Heartbeat sem token | POST /heartbeat | provider=claude | 403 | Sim | Edge |
| TC-P1-027 | P1 | Security | worker-tokens sem service_role | POST /worker-tokens | worker_name=x | 403 | Sim | Edge |
| TC-P1-028 | P1 | Security | token expirado/revogado | claim/patch | token invalido | 403 | Semi | Edge/DB |
| TC-P1-029 | P1 | DB | reset_stalled executa | SELECT reset_stalled_prompts() | processing antigo | volta pending | Sim | DB |
| TC-P1-030 | P1 | Front | Templates CRUD | criar/editar/deletar | template custom | persistencia localStorage | Sim | Frontend |
| TC-P2-031 | P2 | Front | Defaults templates carregam | limpar storage e abrir templates | sem chave local | 3 templates default | Sim | Frontend |
| TC-P2-032 | P2 | API | GET /prompts filtro pipeline_id | list pipeline | uuid valido | ordenado por step asc | Sim | Edge |
| TC-P2-033 | P2 | API | GET /prompts pipeline_id invalido | query invalida | not-uuid | 400 | Sim | Edge |
| TC-P2-034 | P2 | API | PATCH idempotente terminal | PATCH done duas vezes | mesmo id | 2a 200 idempotent | Sim | Edge |
| TC-P2-035 | P2 | Worker | openai provider cwd inconsistente | executar openai com target_folder | pasta com arquivos | validar comportamento | Nao | Provider |
| TC-P2-036 | P2 | Worker | previous_result truncado 120k | step1 com output >120k | pipeline | step2 content truncado | Sim | Worker |
| TC-P2-037 | P2 | Worker | result vazio em chain | stdout vazio | pipeline 2 steps | step2 criado com placeholder vazio | Sim | Worker |
| TC-P2-038 | P2 | API | Campos extras create ignorados | POST /prompts com extras | worker_id/status | status permanece pending | Sim | Edge |
| TC-P2-039 | P2 | Front | Error state de conexao | desligar API | abrir prompts | mensagens de erro/loading corretas | Nao | Frontend |
| TC-P2-040 | P2 | Ops | Cron indisponivel | sem pg_cron | verificar notices | exige scheduler externo | Nao | DB/Ops |

## 6) Testes de API (curl prontos)

Defina variaveis:
```bash
export BASE_URL="https://<project>.supabase.co/functions/v1/nightworker-prompts"
export SERVICE_TOKEN="<service_role_or_worker_token_with_scopes>"
export CLAIM_TOKEN="<token_with_claim_scope>"
export PATCH_TOKEN="<token_with_patch_scope>"
export HEARTBEAT_TOKEN="<token_with_heartbeat_scope>"
```

### 6.1 POST /prompts (valido)
```bash
curl -i -X POST "$BASE_URL/prompts" \
  -H "Content-Type: application/json" \
  -d '{"provider":"gemini","name":"qa-simple","content":"hello world","target_folder":"C:\\code\\tmp"}'
# Expected: 201 + {"id":"<uuid>"}
```

### 6.2 POST /prompts (pipeline valido)
```bash
PIPELINE_ID=$(python - <<'PY'
import uuid
print(uuid.uuid4())
PY
)

curl -i -X POST "$BASE_URL/prompts" \
  -H "Content-Type: application/json" \
  -d "{\"provider\":\"claude\",\"name\":\"pipeline-step1\",\"content\":\"validate: hello\",\"target_folder\":\"C:\\\\code\\\\tmp\",\"queue_stage\":\"prioritized\",\"pipeline_id\":\"$PIPELINE_ID\",\"pipeline_step\":1,\"pipeline_total_steps\":2,\"pipeline_template_name\":\"QA Pipeline\",\"pipeline_config\":{\"template_version\":1,\"steps\":[{\"provider\":\"claude\",\"role\":\"validate\",\"instruction\":\"{input}\"},{\"provider\":\"claude\",\"role\":\"review\",\"instruction\":\"prev={previous_result}\\ninput={input}\"}],\"original_input\":\"hello\"}}"
# Expected: 201 + id
```

### 6.3 POST /prompts (pipeline invalido: step sem pipeline_id)
```bash
curl -i -X POST "$BASE_URL/prompts" \
  -H "Content-Type: application/json" \
  -d '{"provider":"claude","name":"bad","content":"x","pipeline_step":1,"pipeline_total_steps":2}'
# Expected: 400 (pipeline_id is required when sending pipeline metadata)
```

### 6.4 GET /prompts por pipeline
```bash
curl -i "$BASE_URL/prompts?pipeline_id=$PIPELINE_ID&limit=50"
# Expected: 200, prompts ordenados por pipeline_step ASC
```

### 6.5 PATCH /prompts/:id (requer patch)
```bash
PROMPT_ID="<uuid>"
curl -i -X PATCH "$BASE_URL/prompts/$PROMPT_ID" \
  -H "Authorization: Bearer $PATCH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"done","result_content":"ok","attempts":1,"event_type":"done"}'
# Expected: 200
```

### 6.6 PATCH sem auth
```bash
curl -i -X PATCH "$BASE_URL/prompts/$PROMPT_ID" \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}'
# Expected: 403
```

### 6.7 POST /claim (auth claim)
```bash
curl -i -X POST "$BASE_URL/claim" \
  -H "Authorization: Bearer $CLAIM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider":"claude","limit":5,"worker_id":"qa-worker-1"}'
# Expected: 200 + array
```

### 6.8 POST /heartbeat
```bash
curl -i -X POST "$BASE_URL/heartbeat" \
  -H "Authorization: Bearer $HEARTBEAT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider":"claude","status":"active","worker_id":"qa-worker-1"}'
# Expected: 200
```

### 6.9 POST /prompts/:id/reprocess
```bash
DONE_ID="<done_or_failed_uuid>"
curl -i -X POST "$BASE_URL/prompts/$DONE_ID/reprocess" \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: 201 clone with status pending and queue_stage prioritized
```

### 6.10 POST /prompts/:id/move
```bash
PENDING_ID="<pending_uuid>"
curl -i -X POST "$BASE_URL/prompts/$PENDING_ID/move" \
  -H "Content-Type: application/json" \
  -d '{"stage":"prioritized"}'
# Expected: 200
```

### 6.11 POST /prompts/reorder
```bash
curl -i -X POST "$BASE_URL/prompts/reorder" \
  -H "Content-Type: application/json" \
  -d '{"ids":["<uuid1>","<uuid2>"]}'
# Expected: 200 {updated, requested}
```

### 6.12 POST /worker-tokens (service role)
```bash
curl -i -X POST "$BASE_URL/worker-tokens" \
  -H "Authorization: Bearer $SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"worker_name":"qa-worker","scopes":["claim","patch","heartbeat"],"expires_in_hours":24}'
# Expected: 201 + plain_token
```

## 7) Testes especificos de Pipeline (passo a passo)

### 7.1 Happy path (3 steps)
1. Criar step1 via `POST /prompts` com metadata pipeline.
2. Worker claim/process step1 -> done.
3. Worker cria step2 automaticamente.
4. Validar step2 `pipeline_id` igual, `pipeline_step=2`, `queue_stage='prioritized'`.
5. Worker processa step2 -> done e cria step3.
6. Worker processa step3 -> done.
7. Validar inexistencia de step4.

### 7.2 Failure stop
1. step1 done -> cria step2.
2. step2 falha.
3. Validar que step3 nao foi criado.

### 7.3 Reprocess resume
1. Reprocessar step2 failed.
2. Clone step2 criado com `cloned_from`.
3. Clone step2 done.
4. Worker cria step3.

### 7.4 Idempotencia
1. Simular create duplicado para mesmo `(pipeline_id, pipeline_step)`.
2. Esperar 2a resposta 200 idempotent com id existente.

### 7.5 Resultado vazio
1. step1 done com `result_content=''`.
2. step2 ainda e criado.
3. Validar `content` de step2 sem placeholder literal.

### 7.6 Config invalido
1. Prompt com `pipeline_config.steps=[]`.
2. Worker deve logar erro e nao crashar.

### 7.7 Provider invalido em step seguinte
1. Definir provider inexistente no proximo step.
2. `POST /prompts` do chain deve falhar validacao.
3. Worker deve logar warning e parar encadeamento.

## 8) Testes de seguranca/autorizacao

- [ ] GET /prompts sem token -> 200.
- [ ] POST /prompts sem token -> 201/200.
- [ ] PATCH /prompts/:id sem token -> 403.
- [ ] PATCH com token sem scope patch -> 403.
- [ ] POST /claim sem token -> 403.
- [ ] POST /claim sem scope claim -> 403.
- [ ] POST /heartbeat sem token -> 403.
- [ ] POST /worker-tokens sem service_role -> 403.
- [ ] Token expirado/revogado -> negado.
- [ ] Injetar `status=done` no create -> ignorado (continua pending).
- [ ] Injetar `worker_id` no create -> ignorado.
- [ ] `pipeline_total_steps < pipeline_step` -> 400.

## 9) Testes de resiliencia/concorrencia

- [ ] Dois workers mesmo provider sem duplicidade (SKIP LOCKED).
- [ ] Worker crash no meio do processing.
- [ ] Reset stalled retorna prompt para pending.
- [ ] Worker reinicia e preserva worker_id.
- [ ] Falha de rede entre done e chain (gap operacional).
- [ ] Corrida de create do mesmo pipeline step (idempotencia).
- [ ] Volume alto (1000+ prompts) com claim em lotes.

## 10) Regressao (nao pode quebrar)

- [ ] Prompt unico continua funcional.
- [ ] GET /prompts sem filtro continua retornando lista.
- [ ] filtros `status`, `provider`, `queue_stage` funcionam.
- [ ] Kanban 5 colunas renderiza.
- [ ] Move backlog/prioritized funcional.
- [ ] Reprocess done/failed funcional.
- [ ] Health mostra workers ativos via heartbeat.
- [ ] Auth service_role e worker token continua valido.
- [ ] Prompts sem pipeline nao mostram progress bar.

## 11) Plano de automacao e CI/CD

### Unit
- TypeScript: `npx tsc --noEmit`
- Funcoes puras: normalizacao de prompt/template e UUID validation.

### Integration
- Script de contrato API (`scripts/test_edge_api.sh`).
- Script de seguranca (`scripts/test_security.sh`).

### End-to-end
- Pipeline real com worker (`scripts/test_worker_pipeline.py`).
- Opcional UI E2E com Playwright para `/nw/templates` e `/nw/prompts/:id`.

### Exemplo de workflow
```yaml
name: NightWorker QA
on:
  push:
    paths: ['src/night_worker/**', 'supabase/**', 'src/pages/NW**', 'src/hooks/useNightWorkerApi.ts']
  workflow_dispatch: {}

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx tsc --noEmit

  api-tests:
    runs-on: ubuntu-latest
    env:
      BASE_URL: ${{ secrets.SUPABASE_EDGE_URL }}
      SERVICE_TOKEN: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
    steps:
      - uses: actions/checkout@v4
      - run: bash scripts/test_edge_api.sh
      - run: bash scripts/test_security.sh

  worker-script-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: python -m py_compile src/night_worker/worker.py
      - run: python -m py_compile src/night_worker/supabase_api.py
      - run: python -m py_compile scripts/test_worker_pipeline.py
```

## 12) Scripts executaveis entregues

- `C:\code\minimal-idea-spark\scripts\test_edge_api.sh`
- `C:\code\minimal-idea-spark\scripts\test_security.sh`
- `C:\code\claude-auto\scripts\test_worker_pipeline.py`

## 13) Risco tecnico critico: qualidade de `previous_result`

Situacao atual:
- Claude/Gemini salvam stdout.
- Codex salva `--output-last-message` ou stdout.
- Nao existe captura de diff de filesystem.

Impacto:
- Pipeline pode encadear com contexto pobre (ex.: "OK"), reduzindo qualidade dos proximos passos.

Mitigacoes sugeridas (prioridade):
1. Incluir instrucao padrao de resposta estruturada (resumo tecnico + checklist + arquivos alterados) em todos os providers.
2. Opcional: capturar `git diff --name-only` e anexar ao `result_content` quando repo git existir.
3. Opcional: gravar artefato extra (`result_manifest.json`) com metadados de saida.
4. Criar alarme QA quando `result_content` do step anterior vier vazio em pipeline.
