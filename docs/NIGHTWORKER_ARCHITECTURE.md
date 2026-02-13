# 🏗️ Arquitetura Night Worker - Estrutura Completa

## 📌 Escopo

> **Nota sobre paths**: Este documento usa paths Windows de exemplo (`C:\code\claude-auto\`) para ilustrar a estrutura. Adapte para seu ambiente (Linux, macOS, ou outro diretório).

**Repositórios envolvidos**:
- **Frontend (este repo)**: `minimal-idea-spark/` — UI React, hooks, páginas de Night Worker
- **API Layer (repo externo)**: `claude-auto/` — FastAPI server, orchestrator, workers
- **Vendors (repo externo)**: `claude-auto/night-worker*` — Workers específicos por LLM

**Objetivo deste doc**: Documentar a arquitetura completa do sistema Night Worker, incluindo frontend, API, vendors, fluxo de dados, opções de orquestração, e roadmap.

---

## 📊 Visão Geral do Sistema

O Night Worker é um sistema de processamento de prompts para múltiplos LLMs (Claude, Codex, Gemini) com arquitetura vendor-based.

### Componentes Principais

```
┌─────────────────────────────────────────────────────────┐
│ FRONTEND (React + Supabase)                             │
│ - minimal-idea-spark/                                   │
│ - UI para criar/listar/visualizar prompts               │
│ - Kanban drag-and-drop                                  │
└────────────────┬────────────────────────────────────────┘
                 │ HTTP REST API
                 ↓
┌─────────────────────────────────────────────────────────┐
│ API LAYER (FastAPI)                                     │
│ - C:\code\claude-auto\api_server.py                     │
│ - Porta 5555                                            │
│ - Recebe POST /prompts → Roteia para vendor correto     │
│ - GET /prompts → Lista de todos vendors                 │
│ - GET /prompts/:id/status → Busca em todos vendors      │
└────────────────┬────────────────────────────────────────┘
                 │ File System (input/)
                 ↓
┌─────────────────────────────────────────────────────────┐
│ VENDORS (Workers Independentes)                         │
│                                                         │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│ │ Claude      │ │ Codex       │ │ Gemini      │       │
│ │ night-worker│ │ night-worker│ │ night-worker│       │
│ │             │ │ -codex      │ │ -gemini     │       │
│ ├─────────────┤ ├─────────────┤ ├─────────────┤       │
│ │ worker.py   │ │ worker.py   │ │ worker.py   │       │
│ │ input/      │ │ input/      │ │ input/      │       │
│ │ done/       │ │ done/       │ │ done/       │       │
│ │ results/    │ │ results/    │ │ results/    │       │
│ └─────────────┘ └─────────────┘ └─────────────┘       │
└─────────────────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────┐
│ LLM PROVIDERS (CLI/API)                                 │
│ - Claude CLI (@anthropic-ai/claude-cli)                 │
│ - GitHub Copilot CLI (gh copilot)                       │
│ - Gemini API (google.generativeai)                      │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo de Dados Atual

### Criação de Prompt

```
1. User → Frontend → POST /prompts
   {
     "provider": "claude",
     "name": "criar-componente",
     "content": "Escreva uma função...",
     "target_folder": "C:\\code\\project"
   }

2. api_server.py → Identifica provider="claude"
   → Mapeia para: C:\code\claude-auto\night-worker
   → Cria arquivo: night-worker/input/{id}_{name}.txt

3. worker.py (Claude) → Loop 60s
   → Detecta arquivo em input/
   → Processa com Claude CLI
   → Move para done/
   → Salva resultado em results/

4. Frontend → GET /prompts (polling 15s)
   → api_server → Escaneia done/ de todos vendors
   → Retorna lista atualizada com status="done"
```

### Processamento (Problema Atual)

**Hoje**: Cada vendor precisa rodar `worker.py` **separadamente** (3 processos)

```bash
# Terminal 1
cd night-worker
python worker.py

# Terminal 2
cd "night-worker -codex"
python worker.py

# Terminal 3
cd "night-worker -gemini"
python worker.py
```

**Proposta**: Orchestrator central no root

```bash
# Um único processo
cd C:\code\claude-auto
python orchestrator.py  # Gerencia todos os 3 vendors
```

---

## 🎯 Arquitetura Proposta (Melhorada)

### Opção 1: Orchestrator Central (Recomendado)

Criar `C:\code\claude-auto\orchestrator.py` que:

1. **Lê config.txt** → Descobre todos os vendors
2. **Para cada vendor**:
   - Inicia thread/processo separado
   - Monitora pasta `input/`
   - Processa com LLM correto
   - Move para `done/`
3. **Log centralizado** de todos vendors
4. **Health check** unificado

**Vantagens**:
- ✅ Um único processo para gerenciar tudo
- ✅ Logs centralizados
- ✅ Fácil de monitorar
- ✅ Controle de recursos (max threads, rate limiting)

**Desvantagens**:
- ⚠️ Mais complexo de implementar
- ⚠️ Se cair, todos vendors param

---

### Opção 2: Supervisor de Processos (PM2/Systemd)

Usar ferramenta externa para gerenciar múltiplos `worker.py`:

**PM2 (Node.js)**:
```bash
pm2 start night-worker/worker.py --name claude-worker
pm2 start "night-worker -codex/worker.py" --name codex-worker
pm2 start "night-worker -gemini/worker.py" --name gemini-worker
pm2 list  # Ver todos
```

**Windows Service**:
```powershell
# Criar 3 serviços Windows
New-Service -Name "NightWorker-Claude" -Binary "python C:\code\claude-auto\night-worker\worker.py"
New-Service -Name "NightWorker-Codex" -Binary "python C:\code\claude-auto\night-worker -codex\worker.py"
New-Service -Name "NightWorker-Gemini" -Binary "python C:\code\claude-auto\night-worker -gemini\worker.py"
```

**Vantagens**:
- ✅ Usa ferramentas maduras e testadas
- ✅ Auto-restart em caso de crash
- ✅ Logs separados por vendor
- ✅ Cada vendor isolado (falha de 1 não afeta outros)

**Desvantagens**:
- ⚠️ Dependência externa (PM2/systemd)
- ⚠️ Mais processos rodando

---

### Opção 3: Hybrid (API Server + Workers Embutidos)

Modificar `api_server.py` para incluir workers como **threads**:

```python
# api_server.py
from threading import Thread
import time

def worker_thread(vendor_name, vendor_path):
    """Thread que processa prompts de um vendor."""
    while True:
        input_dir = Path(vendor_path) / "input"
        for prompt_file in input_dir.glob("*.txt"):
            process_prompt(vendor_name, prompt_file)
        time.sleep(60)

# Ao iniciar api_server, inicia threads dos workers
for vendor_name, vendor_path in config.items():
    if vendor_name.startswith("provider_"):
        thread = Thread(target=worker_thread, args=(vendor_name, vendor_path))
        thread.daemon = True
        thread.start()
```

**Vantagens**:
- ✅ Um único processo (`api_server.py`)
- ✅ Simples de iniciar (um comando)
- ✅ Compartilha memória e config

**Desvantagens**:
- ⚠️ Se API cair, workers caem juntos
- ⚠️ GIL do Python (threads não são paralelas de verdade)

---

## 📝 Estrutura de Arquivos Atual

```
C:\code\claude-auto\
│
├── api_server.py              # API HTTP (FastAPI)
├── config.txt                 # Config central com vendors
├── START_API.bat              # Inicia API
│
├── night-worker\              # Vendor Claude
│   ├── worker.py              # Worker Claude
│   ├── config.txt             # Config específico
│   ├── START.bat              # Inicia worker
│   ├── input\                 # Prompts pending
│   ├── done\                  # Prompts processados
│   ├── results\               # Resultados .md
│   └── llm_providers\
│       ├── claude_cli.py
│       └── ...
│
├── night-worker -codex\       # Vendor Codex
│   ├── worker.py              # (mesmo código)
│   ├── config.txt             # llm_provider=codex_cli
│   └── ...
│
└── night-worker -gemini\      # Vendor Gemini
    ├── worker.py              # (mesmo código)
    ├── config.txt             # llm_provider=gemini_api
    └── ...
```

---

## 🚀 Como Funciona Hoje (Passo a Passo)

### 1. Iniciar Sistema

```bash
# Terminal 1: API Server
cd C:\code\claude-auto
python api_server.py
# → Porta 5555 aguardando HTTP

# Terminal 2: Worker Claude
cd night-worker
python worker.py
# → Loop checando input/ a cada 60s

# Terminal 3: Worker Codex (opcional)
cd "night-worker -codex"
python worker.py

# Terminal 4: Worker Gemini (opcional)
cd "night-worker -gemini"
python worker.py
```

### 2. Frontend Cria Prompt

```javascript
// Frontend
fetch('http://localhost:5555/prompts', {
  method: 'POST',
  body: JSON.stringify({
    provider: 'claude',
    name: 'teste',
    content: 'Escreva hello world',
    target_folder: 'C:\\code\\test'
  })
})
```

### 3. API Roteia para Vendor

```python
# api_server.py
provider = get_provider('claude')  # night-worker/
filepath = provider.input_dir / f"{id}_{name}.txt"
filepath.write_text(content)
```

### 4. Worker Processa

```python
# night-worker/worker.py (loop)
for txt_file in input_dir.glob("*.txt"):
    result = process_with_claude_cli(txt_file)
    save_result(result)
    move_to_done(txt_file)
```

### 5. Frontend Atualiza Status

```javascript
// Polling a cada 15s
fetch('http://localhost:5555/prompts')
// → API escaneia done/ de todos vendors
// → Retorna lista atualizada
```

---

## 🔧 Pontos de Melhoria

### 1. **Orchestrator Central** (Prioridade Alta)

Criar `orchestrator.py` que:
- Lê `config.txt`
- Inicia threads para cada vendor
- Centraliza logs
- Permite start/stop de vendors individualmente

### 2. **Modo Supabase** (Produção)

Em vez de file-based (`input/`), usar Supabase Edge:
- Workers fazem `GET /prompts?status=pending&provider=claude`
- Processam
- Fazem `PATCH /prompts/:id` com resultado
- **Vantagem**: Estado centralizado, múltiplas máquinas podem processar

### 3. **Retry Logic** (Resiliência)

- Se processamento falhar → mover para `failed/`
- Auto-retry com backoff exponencial
- Max 3 tentativas

### 4. **Observabilidade** (Monitoramento)

- Metrics: prompts/min, latência média, taxa de erro
- Alertas: worker parado, fila muito grande
- Dashboard: Grafana + Prometheus

### 5. **Rate Limiting** (Evitar Ban)

- Claude API: max 50 req/min
- Codex: max 20 req/min
- Implementar queue com throttling

---

## 📚 Dependências

### Python
```txt
fastapi
uvicorn
pydantic
anthropic
google-generativeai
python-dotenv
requests
```

### CLI Tools
```bash
# Claude CLI
npm install -g @anthropic-ai/claude-cli

# GitHub Copilot CLI
gh extension install github/gh-copilot
```

---

## 🎯 Roadmap

### Fase 1: Estabilizar Atual ✅
- [x] API Server funcionando
- [x] Workers processando
- [ ] Orchestrator central

### Fase 2: Modo Supabase 🚧
- [x] Edge Function deployada
- [ ] Workers consumindo Edge
- [ ] Service role key configurada

### Fase 3: Produção 📅
- [ ] Deploy em servidor (VPS/Cloud)
- [ ] Systemd/PM2 para auto-restart
- [ ] Logs centralizados (Loki/CloudWatch)
- [ ] Monitoramento (Grafana)

---

## 💡 Ideias para Outras LLMs

Você mencionou "passar para outras llm da ideias". Aqui estão sugestões:

### GPT-4 (OpenAI)
- Adicionar `night-worker -gpt4/`
- `llm_provider=openai_api`
- Usar OpenAI SDK

### Llama (Local)
- Adicionar `night-worker -llama/`
- `llm_provider=ollama_cli`
- Rodar Ollama localmente

### Mistral
- Adicionar `night-worker -mistral/`
- `llm_provider=mistral_api`

### Perplexity
- Adicionar `night-worker -perplexity/`
- `llm_provider=perplexity_api`

**Padrão**: Cada LLM = novo vendor com `worker.py` + config específico

---

## ❓ Dúvidas Arquiteturais

1. **Prefere Orchestrator central ou múltiplos processos?**
2. **Modo file-based (atual) ou Supabase Edge (produção)?**
3. **Prioridade: Adicionar mais LLMs ou estabilizar atuais?**
4. **Deploy local ou em servidor?**

---

## 📊 Score / O que faz sentido

Esta seção classifica as propostas e componentes deste documento por prioridade e alinhamento com o cenário atual.

| Item | Score | Nota |
|------|-------|------|
| **Visão Geral e Fluxo Atual** | ✅ Alta | Documenta estado atual; essencial para novos desenvolvedores e LLMs entenderem o sistema. |
| **Manter API + Vendors Separados** | ✅ Alta | Separação de responsabilidades clara; API roteia, workers processam. Facilita escalonamento e manutenção. |
| **Documentação neste repo** | ✅ Alta | Centraliza conhecimento do frontend + referências à API externa. Facilita onboarding. |
| **Modo Supabase (Produção)** | ✅ Alta | Estado centralizado, múltiplas máquinas, RLS, logs estruturados. Já parcialmente implementado (Edge deployada). |
| **Retry Logic + Resiliência** | ✅ Alta | Evita perda de prompts em caso de falha temporária. Backoff exponencial é padrão de mercado. |
| **Orchestrator Central (Opção 1)** | 🟡 Média | Simplifica gerenciamento (1 processo vs 3), mas ponto único de falha. Depende de contexto: dev local vs produção. |
| **PM2/Systemd (Opção 2)** | 🟡 Média | Ferramentas maduras, isolamento de processos, auto-restart. Ideal para produção, mas requer infra. |
| **Hybrid (Opção 3)** | 🟡 Média | Simples de iniciar (1 comando), mas GIL do Python limita paralelismo real. Bom para dev local. |
| **Rate Limiting** | 🟡 Média | Importante para evitar ban de APIs (Claude, Codex), mas não bloqueante para MVP. Implementar quando volume aumentar. |
| **Observabilidade (Grafana/Prometheus)** | 🔵 Baixa | Útil para produção em larga escala, mas overkill para estágio atual. Começar com logs estruturados (já feito). |
| **Adicionar mais LLMs (GPT-4, Llama, Mistral)** | 🔵 Baixa | Interessante para diversificar, mas primeiro estabilizar Claude e Codex. Vendor pattern facilita adição futura. |
| **Deploy em VPS/Cloud** | 🔵 Baixa | Necessário para produção 24/7, mas não urgente se worker Python externo já está rodando. |
| **Implementar orchestrator neste repo (minimal-idea-spark)** | ❌ N/A | Não se aplica; orchestrator.py deve ficar em `claude-auto/` (API layer), não no frontend. |

### Legendas
- ✅ **Alta**: Alinhado com estado atual, próximos passos críticos, ou já implementado.
- 🟡 **Média**: Válido, mas depende de contexto (local vs produção, volume, recursos).
- 🔵 **Baixa**: Útil, mas não bloqueante; pode ser adiado para depois do MVP estável.
- ❌ **N/A**: Não se aplica ao `minimal-idea-spark` ou ao cenário atual.

### Recomendação Geral

**Para estabilizar o sistema agora**:
1. Deploy da Edge Function (resolver 500 errors no frontend)
2. Configurar worker Python externo OU rodar worker Node local (escolher uma opção)
3. Testar fluxo completo (criar → processar → ver resultado)
4. Adicionar retry logic básico (max 3 tentativas)

**Para produção escalável** (futuro):
1. Orchestrator central (Opção 1) OU PM2 (Opção 2)
2. Modo Supabase 100% (abandonar file-based local)
3. Observabilidade (logs estruturados → Grafana)
4. Rate limiting por provider

---

**Última atualização**: 2026-02-12
**Status**: Sistema funcional, melhorias propostas
**Repositório**: [minimal-idea-spark](https://github.com/your-org/minimal-idea-spark)
