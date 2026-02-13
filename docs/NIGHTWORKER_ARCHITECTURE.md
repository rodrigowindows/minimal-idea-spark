# 🏗️ Arquitetura Night Worker - Estrutura Completa

## 📌 Escopo

> **Nota sobre paths**: Este documento usa paths Windows de exemplo (\C:\code\claude-auto\\\) para ilustrar a estrutura. Adapte para seu ambiente (Linux, macOS, ou outro diretório).

**Repositórios envolvidos**:
- **Frontend (este repo)**: \minimal-idea-spark/\ — UI React, hooks, páginas de Night Worker.
- **API Layer (repo externo)**: \claude-auto/\ — FastAPI server, orchestrator, workers.
- **Vendors (repo externo)**: \claude-auto/night-worker*\ — Workers específicos por LLM.

**Objetivo deste doc**: Documentar a arquitetura completa do sistema Night Worker, incluindo frontend, API, vendors, fluxo de dados, opções de orquestração, e roadmap.

---

## 📊 Visão Geral do Sistema

O Night Worker é um sistema de processamento de prompts para múltiplos LLMs (Claude, Codex, Gemini) com arquitetura vendor-based.

### Componentes Principais

\\\
┌───────────────────────────────────────────────┐
│ FRONTEND (React + Supabase)                   │
│ - minimal-idea-spark/                         │
│ - UI para criar/listar/visualizar prompts     │
│ - Kanban drag-and-drop                        │
└────────────────┬──────────────────────────────┘
                 │ HTTP REST API
                 ↓
┌───────────────────────────────────────────────┐
│ API LAYER (FastAPI)                           │
│ - C:\code\claude-auto\api_server.py           │
│ - Porta 5555                                  │
│ - Gerenciamento dinâmico de Providers         │
│ - Recebe POST /prompts → Roteia para vendor   │
│ - GET /status/md → Relatório em Markdown      │
└────────────────┬──────────────────────────────┘
                 │ File System (input/)
                 ↓
┌───────────────────────────────────────────────┐
│ VENDORS (Workers Independentes)               │
│                                               │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│ │ Claude      │ │ Codex       │ │ Gemini      ││
│ │ night-worker│ │ -codex      │ │ -gemini     ││
│ ├─────────────┤ ├─────────────┤ ├─────────────┤│
│ │ worker.py   │ │ worker.py   │ │ worker.py   ││
│ │ input/      │ │ input/      │ │ input/      ││
│ │ done/       │ │ done/       │ │ done/       ││
│ └─────────────┘ └─────────────┘ └─────────────┘│
└────────────────┬──────────────────────────────┘
                 │
                 ↓
┌───────────────────────────────────────────────┐
│ LLM PROVIDERS (CLI/API)                       │
│ - Claude CLI (@anthropic-ai/claude-cli)       │
│ - OpenAI API (gpt-4o)                         │
│ - Gemini API (google-generativeai)            │
└───────────────────────────────────────────────┘
\\\

---

## 🔄 Fluxo de Dados Atual

### Criação de Prompt

1. **User → Frontend → POST /prompts**: O usuário envia o prompt escolhendo o provider (claude, codex, gemini).
2. **api_server.py → Roteamento**: Identifica o provider e salva o arquivo \.txt\ na pasta \input/\ correspondente em \claude-auto\.
3. **worker.py → Processamento**: O worker do vendor específico (ex: \-gemini\) detecta o arquivo, chama o LLM Provider e salva o resultado em \esults/\.
4. **Frontend → Status**: O frontend faz polling na API, que escaneia as pastas \done/\ e \esults/\ para retornar o status final.

---

## 🎯 Arquitetura de Orquestração

Atualmente, o sistema suporta três modelos de execução:

### Opção 1: Gerenciamento via API (Novo)
A \pi_server.py\ agora permite listar, adicionar e remover providers via endpoints HTTP (\/providers\). Isso permite que o sistema seja expandido sem reiniciar o servidor principal.

### Opção 2: Orchestrator Central (Planejado)
Um script \orchestrator.py\ no root de \claude-auto\ para iniciar todos os workers em threads ou sub-processos, centralizando os logs.

### Opção 3: Supervisor Externo (PM2/Systemd)
Uso de ferramentas como PM2 para garantir que cada \worker.py\ e a \pi_server.py\ estejam sempre rodando e reiniciem em caso de falha.

---

## 🛠 Estrutura de Arquivos (claude-auto)

\\\
C:\code\claude-auto\
├── api_server.py              # API HTTP Unificada (FastAPI)
├── config.txt                 # Configurações globais e caminhos dos providers
├── START_API.bat              # Inicia o servidor central
├── START_GEMINI.bat           # Inicia o worker Gemini especificamente
├── night-worker\              # Vendor Claude
├── night-worker -codex\       # Vendor Codex (OpenAI)
└── night-worker -gemini\      # Vendor Gemini (Google)
\\\

---

## ⚙️ Retry Logic e Resiliência

O sistema implementa **Exponential Backoff com Jitter** para lidar com falhas temporárias (como Rate Limits):
- **Base**: 1 minuto.
- **Progressão**: 1m, 2m, 4m, 8m... até o limite configurado.
- **Jitter**: Variação aleatória de ±20% para evitar colisões de requisições simultâneas.
- **Erros Permanentes**: O sistema identifica erros 4xx (exceto 429) e move o prompt para falha permanente sem retentar.

---

## 🚀 Roadmap

### Fase 1: Estabilização e Multitenancy LLM ✅
- [x] Suporte a Claude, Codex e Gemini.
- [x] API de gerenciamento de providers.
- [x] Relatórios de status em Markdown (\/status/md\).

### Fase 2: Robustez e Produção 🚧
- [ ] Implementação do Orchestrator Central.
- [ ] Integração total com Supabase Edge para processamento remoto.
- [ ] Dashboard de monitoramento (Grafana).

---

## 📊 Score / O que faz sentido

| Item | Score | Nota |
| :--- | :--- | :--- |
| **Visão Geral e Fluxo** | ✅ Alta | Essencial para entender a conexão entre os repositórios. |
| **Manter API + Vendors Separados** | ✅ Alta | Permite trocar de LLM ou atualizar workers sem afetar a API. |
| **Suporte a Múltiplos Providers** | ✅ Alta | Gemini, Claude e Codex cobrem a maioria das necessidades de código. |
| **Retry Logic (Backoff)** | ✅ Alta | Crítico para estabilidade contra Rate Limits de APIs de IA. |
| **API de Gerenciamento** | 🟡 Média | Útil para setups dinâmicos, mas o config.txt manual ainda é confiável. |
| **Orchestrator Central** | 🟡 Média | Bom para simplicidade, mas PM2 resolve melhor o auto-restart. |
| **Observabilidade (Grafana)** | 🔵 Baixa | Útil apenas em escala de produção real. |
| **Implementar orchestrator neste repo** | 🚫 N/A | Deve permanecer isolado no backend (\claude-auto\). |

---
**Última atualização**: 2026-02-12
**Status**: Funcional com múltiplos providers
