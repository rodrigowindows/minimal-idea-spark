# api_server.py vs worker.py — Guia de Fluxo

## FAQ: Por que nada acontece?

### 1. Movi para "Doing", mas o backend não atualizou. Por quê?
As colunas **Priorizado** e **Doing** no Kanban são organizadores visuais locais (salvos no seu navegador). O Night Worker é um sistema **pull-based**:
- O backend (Edge ou api_server) guarda os prompts.
- O **worker.py** (outro processo) fica perguntando: "Tem algo pendente?".
- Mover para "Doing" na UI **não avisa o worker**. O worker sempre processará os itens na ordem em que foram criados.

### 2. Por que vejo erro 401 Unauthorized nos logs?
Se você vir `401 Unauthorized` nos logs do `api_server` (porta 5555), significa que:
- **Alguém está tentando acessar sua API sem a senha correta.**
- Se o IP for externo (ex: `136.28.40.32`), são bots de internet fazendo varredura. Isso é normal e sua API os bloqueou com sucesso.
- Se for o seu próprio worker, verifique se o `api_token` no `config.txt` da API é o mesmo que o worker está enviando.

### 3. Posso alterar o status do prompt manualmente?
**Não.** O frontend não possui permissão para realizar `PATCH` nos prompts (alterar status, resultado ou erro). Essa é uma tarefa exclusiva do **worker**. Se o frontend tentar, a Edge Function retornará `403 Forbidden`. O status é a prova de que o worker realmente processou a tarefa.

## Resumo de Responsabilidades

| Componente | O que faz? |
|------------|------------|
| **Frontend** | Interface para você criar e ver prompts. |
| **API (Edge/5555)** | O "Cartório": Recebe e guarda os pedidos. |
| **Worker (worker.py)** | O "Motor": É quem realmente executa o Claude/Codex e devolve o resultado. |

**Dica**: Sempre confira se o badge **"Worker Ativo"** está aparecendo no topo da página de Prompts. Se não estiver, o seu `worker.py` pode estar parado ou mal configurado.

**Arquitetura completa do sistema** (frontend, api_server, vendors, opções de orquestração): [NIGHTWORKER_ARCHITECTURE.md](./NIGHTWORKER_ARCHITECTURE.md).
