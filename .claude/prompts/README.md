# Prompts – O que precisa ser feito

Lista de prompts para implementar ou melhorar funcionalidades no **Minimal Idea Spark**. Cada arquivo `.md` contém o contexto do projeto, instruções e arquivos esperados.

## Funcionalidades principais (01–16)

| # | Arquivo | Descrição |
|---|---------|-----------|
| 01 | `01-audio-to-text-integration.md` | Integração áudio para texto (transcrição) |
| 02 | `02-multi-account-system.md` | Múltiplas contas e workspaces |
| 03 | `03-ai-powered-rag-priority-system.md` | RAG e priorização com AI |
| 04 | `04-smart-calendar-integration.md` | Integração com calendário |
| 05 | `05-real-time-collaboration.md` | Colaboração em tempo real |
| 06 | `06-ai-content-generator.md` | Gerador de conteúdo com AI |
| 07 | `07-smart-search-system.md` | Busca inteligente |
| 08 | `08-analytics-dashboard.md` | Dashboard de analytics e insights |
| 09 | `09-task-automation-system.md` | Automação de tarefas |
| 10 | `10-mobile-app-pwa.md` | PWA / app mobile |
| 11 | `11-ai-assistant-chat.md` | Chat com assistente AI |
| 12 | `12-template-library.md` | Biblioteca de templates |
| 13 | `13-notification-center.md` | Centro de notificações |
| 14 | `14-version-control-history.md` | Histórico e versionamento |
| 15 | `15-ai-image-generation.md` | Geração de imagens com AI |
| 16 | `16-tags-labels-categorizacao.md` | Tags, labels e categorização avançada |

## Qualidade, i18n e UX (17–22)

| # | Arquivo | Descrição |
|---|---------|-----------|
| 17 | `17-testes-e-qualidade.md` | Testes unitários, E2E, CI e cobertura |
| 18 | `18-internacionalizacao-i18n.md` | i18n completo (pt-BR, en, etc.) |
| 19 | `19-acessibilidade-wcag.md` | Acessibilidade WCAG 2.1 AA |
| 20 | `20-performance-e-otimizacao.md` | Performance, code split, virtualização |
| 21 | `21-onboarding-e-tutorial.md` | Onboarding e tour para novos usuários |
| 22 | `22-export-backup-completo.md` | Export e backup completo de dados |

## Segurança, UX e integrações (23–27)

| # | Arquivo | Descrição |
|---|---------|-----------|
| 23 | `23-seguranca-2fa-privacidade.md` | Segurança, 2FA e privacidade (LGPD) |
| 24 | `24-temas-personalizacao-dark-mode.md` | Temas, personalização e dark mode |
| 25 | `25-atalhos-teclado-comandos-rapidos.md` | Atalhos de teclado e paleta de comandos |
| 26 | `26-sincronizacao-offline-cache.md` | Sincronização offline e cache |
| 27 | `27-integracoes-webhooks-api.md` | Integrações externas, webhooks e API |

## Relatórios, dashboard e dados (28–33)

| # | Arquivo | Descrição |
|---|---------|-----------|
| 28 | `28-relatorios-pdf-impressao.md` | Relatórios, export PDF e impressão |
| 29 | `29-war-room-widgets-customizaveis.md` | War Room com widgets customizáveis (drag and drop) |
| 30 | `30-lembretes-prazos-notificacoes.md` | Lembretes, prazos e notificações por data |
| 31 | `31-metas-okrs-objetivos.md` | Metas, OKRs e objetivos ligados a oportunidades |
| 32 | `32-integracao-email-digest.md` | Integração com email (captura + digest) |
| 33 | `33-import-notion-obsidian-markdown.md` | Import de Notion, Obsidian e Markdown |

## Fluxo de telas e UX (34–39)

| # | Arquivo | Descrição |
|---|---------|-----------|
| 34 | `34-navegacao-sidebar-agrupamento.md` | Sidebar com seções, colapsar e páginas recentes |
| 35 | `35-fluxo-telas-breadcrumbs-deep-links.md` | Breadcrumbs, voltar, rotas /opportunities/:id e /journal/:date |
| 36 | `36-empty-states-404-loading-consistente.md` | Empty states, 404 e loading em todas as telas |
| 37 | `37-padrao-pagina-page-header-layout.md` | PageHeader reutilizável e layout de conteúdo consistente |
| 38 | `38-mobile-bottom-nav-fluxo.md` | Bottom nav com i18n, FAB e swipe no mobile |
| 39 | `39-busca-global-command-palette.md` | Cmd+K com busca global e ações rápidas |

## Organização, docs e qualidade (40–49)

| # | Arquivo | Descrição |
|---|---------|-----------|
| 40 | `40-documentacao-tecnica-adr.md` | Documentação técnica, ARCHITECTURE e ADRs |
| 41 | `41-deploy-cicd-ambientes.md` | Deploy, build, CI/CD e ambientes |
| 42 | `42-design-system-tokens-componentes.md` | Design system: tokens, cores e componentes base |
| 43 | `43-monitoramento-logs-error-tracking.md` | Monitoramento, logs e error tracking (Sentry opcional) |
| 44 | `44-unificar-i18n-traducoes.md` | Unificar i18n (LanguageContext vs react-i18next) |
| 45 | `45-estado-global-cache-persistencia.md` | Estado global, cache e persistência (contextos, React Query) |
| 46 | `46-formularios-validacao-padrao.md` | Formulários e validação (padrão único, a11y) |
| 47 | `47-listas-tabelas-virtualizacao.md` | Listas longas, tabelas e virtualização |
| 48 | `48-modais-drawers-overlays-padrao.md` | Modais, drawers e overlays (padrão e a11y) |
| 49 | `49-checklist-release-pre-deploy.md` | Checklist de release e pré-deploy |

## Como usar

- Abra o `.md` do número desejado.
- O prompt já inclui o caminho do projeto e a instrução de implementar sem perguntas.
- Use a seção **Arquivos esperados** como referência do que criar ou alterar.

Os arquivos `.txt` nesta pasta são duplicatas ou rascunhos; priorize os `.md` com o mesmo número.

## Verificação pós-implementação

Após implementar os prompts, use a **quadruple check** em `docs/QUADRUPLE_CHECK.md`: estrutura (Check 1), CSS/layout (Check 2), a11y/erros (Check 3), consistência de código (Check 4).
