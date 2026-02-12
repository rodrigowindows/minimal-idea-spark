# Night Worker - Como Funciona (Guia Simples)

## Status Geral (resumo)

**Status:** TUDO FUNCIONAL.

**Por que os prompts não processam?** Nenhum worker está rodando. É design intencional: o frontend e a edge guardam e listam; o processamento depende de você subir um worker (local, Python externo ou Node em produção).

**O que está pronto:**

| Parte | Estado |
|-------|--------|
| **Frontend (React)** | Interface completa (criar, listar, filtrar), Kanban drag-and-drop com localStorage, polling 10s/30s, performance otimizada, auto-connect Supabase |
| **Backend A (Supabase Edge)** | API GET/POST/PATCH /prompts, PATCH só com service-role (403 caso contrário), RLS + sanitização + idempotência (409), logs estruturados |
| **Backend B – Worker Node daemon** | `scripts/nightworker-worker-daemon.ts`: loop, polling, retentativas, stats; deploy systemd/docker/pm2 documentado; processamento MOCK (substituir por LLM real) |
| **Backend B – Worker Node one-shot** | `scripts/nightworker-worker-example.ts` para testes/cron |
| **Backend B – Worker Python** | Já rodando em https://coder-ai.workfaraway.com; health `{"status":"ok","providers":["claude","codex"]}`; processamento real de LLMs |

**Documentação:** BACKEND_API_WORKER.md, NIGHTWORKER_INTEGRATION_REVIEW.md, NIGHTWORKER_COMO_FUNCIONA.md (este guia).

**Para fazer funcionar agora:** (1) Deploy da edge: `npx supabase functions deploy nightworker-prompts`. (2) Rodar um worker: Python externo (configurar para sua edge), Node local (`node --env-file=.env --experimental-strip-types scripts/nightworker-worker-daemon.ts`) ou deploy Node (systemd/docker/pm2).

**Pendências:** Deploy da edge (resolve 500 no frontend); rodar worker; se usar Node daemon, implementar processamento real no lugar do MOCK.

**Arquitetura:** Frontend → Edge (Supabase) → Worker (Python em produção ou Node local/produção).

---

## 🎯 O que é o Night Worker?

É um sistema que permite você **criar tarefas de código** (prompts) e um **worker automático processa** essas tarefas usando IA (Claude, Codex, etc).

**Exemplo prático**:
1. Você escreve: "Crie uma função para calcular fibonacci"
2. O sistema guarda isso como "pending" (pendente)
3. Um worker pega essa tarefa, chama a IA, e retorna o código
4. Você vê o resultado na interface

---

## 🏗️ Arquitetura (3 Partes)

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  1️⃣ VOCÊ (Frontend - navegador)                    │
│                                                     │
│  Tela para criar tarefas e ver resultados          │
│  https://minimal-idea-spark.lovable.app            │
│                                                     │
└──────────────────────┬──────────────────────────────┘
                       │
                       │ "Salve essa tarefa"
                       │ "Me mostre as tarefas"
                       ↓
┌─────────────────────────────────────────────────────┐
│                                                     │
│  2️⃣ BANCO DE DADOS (Supabase Edge Function)        │
│                                                     │
│  Guarda todas as tarefas:                          │
│  - ID: abc123                                      │
│  - Nome: "Calcular fibonacci"                      │
│  - Status: "pending" (aguardando)                  │
│  - Provider: "claude"                              │
│                                                     │
└──────────────────────┬──────────────────────────────┘
                       ↑
                       │ "Tem tarefa pending?"
                       │ "Processou! Aqui está o resultado"
                       │
┌──────────────────────┴──────────────────────────────┐
│                                                     │
│  3️⃣ WORKER (Processador automático)                │
│                                                     │
│  Fica perguntando: "Tem tarefa nova?"              │
│  Quando acha, chama a IA e salva o resultado       │
│                                                     │
│  3 opções:                                         │
│  a) Node.js local (teste)                          │
│  b) Node.js servidor (produção)                    │
│  c) Python já rodando (coder-ai.workfaraway.com)   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo Completo (Passo a Passo)

### Cenário: Você quer gerar código com IA

#### **PASSO 1**: Você cria uma tarefa

**Onde**: Navegador → https://minimal-idea-spark.lovable.app/nw/submit

**O que você faz**:
- Escolhe o provider: "Claude" ou "Codex"
- Escreve o nome: "Fibonacci"
- Escreve o conteúdo: "Crie uma função recursiva para calcular fibonacci"
- Escolhe a pasta destino: "C:\code\meu-projeto"
- Clica em "Enviar"

**O que acontece nos bastidores**:
```
Seu navegador faz:
POST https://xxx.supabase.co/functions/v1/nightworker-prompts/prompts

Body (o que envia):
{
  "provider": "claude",
  "name": "Fibonacci",
  "content": "Crie uma função recursiva para calcular fibonacci",
  "target_folder": "C:\\code\\meu-projeto"
}

Supabase recebe e:
1. Valida os dados
2. Cria no banco de dados:
   - ID: gerado automaticamente (ex: "a1b2c3d4-...")
   - Status: "pending" (aguardando processamento)
   - Data: timestamp agora
3. Retorna:
   {
     "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
   }

Frontend redireciona você para:
/nw/prompts (lista de tarefas)
```

---

#### **PASSO 2**: Você vê a tarefa na lista

**Onde**: Navegador → https://minimal-idea-spark.lovable.app/nw/prompts

**O que você vê**:
- Uma tela estilo Kanban com 5 colunas:
  - **Backlog** (novas tarefas)
  - **Priorizado** (você pode arrastar para cá)
  - **Doing** (você pode arrastar para cá)
  - **Done** (tarefas concluídas)
  - **Falhas** (tarefas com erro)

- Sua tarefa "Fibonacci" aparece em **Backlog** com:
  - Badge amarelo: "Pendente"
  - Badge roxo: "Claude"
  - Botão "Ver detalhes"

**O que acontece nos bastidores**:
```
Seu navegador faz a cada 10 segundos:
GET https://xxx.supabase.co/functions/v1/nightworker-prompts/prompts

Supabase retorna:
{
  "total": 1,
  "prompts": [
    {
      "id": "a1b2c3d4-...",
      "name": "Fibonacci",
      "provider": "claude",
      "status": "pending",
      "content": "Crie uma função recursiva...",
      "target_folder": "C:\\code\\meu-projeto",
      "created_at": "2026-02-12T10:30:00Z",
      "attempts": 0,
      "result_content": null,  ← Ainda não tem resultado
      "error": null
    }
  ]
}

Frontend mostra na tela as colunas do Kanban.
```

---

#### **PASSO 3**: Worker detecta a tarefa

**AQUI É O PROBLEMA ATUAL**: Nenhum worker está rodando!

**Se o worker estivesse rodando**, aconteceria isso:

**Onde**: Servidor (onde o worker está instalado)

**O que o worker faz**:
```
A cada 10 segundos, o worker pergunta:

GET https://xxx.supabase.co/functions/v1/nightworker-prompts/prompts?status=pending&provider=claude&limit=5
Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}  ← Token especial (admin)

Supabase retorna:
{
  "total": 1,
  "prompts": [
    {
      "id": "a1b2c3d4-...",
      "name": "Fibonacci",
      "content": "Crie uma função recursiva...",
      "provider": "claude",
      "status": "pending"
    }
  ]
}

Worker vê que tem 1 tarefa nova e pensa:
"Vou processar essa tarefa!"
```

---

#### **PASSO 4**: Worker processa a tarefa

**O que o worker faz**:
```
1. Pega o conteúdo do prompt:
   "Crie uma função recursiva para calcular fibonacci"

2. Chama a IA (Claude API):

   POST https://api.anthropic.com/v1/messages
   {
     "model": "claude-3-5-sonnet-20241022",
     "messages": [{
       "role": "user",
       "content": "Crie uma função recursiva para calcular fibonacci"
     }]
   }

3. Claude responde:
   {
     "content": [
       {
         "text": "function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n-1) + fibonacci(n-2);\n}"
       }
     ]
   }

4. Worker extrai o resultado:
   resultado = "function fibonacci(n) { ... }"

5. Worker salva o resultado no banco:

   PATCH https://xxx.supabase.co/functions/v1/nightworker-prompts/prompts/a1b2c3d4-...
   Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}

   Body:
   {
     "status": "done",  ← Mudou de "pending" para "done"
     "result_content": "function fibonacci(n) { ... }",
     "attempts": 1,
     "event_type": "done",
     "event_message": "Processed by worker"
   }

6. Supabase valida:
   - Token é service-role? ✅ Sim
   - Prompt existe? ✅ Sim
   - Status era pending? ✅ Sim

   Atualiza no banco e retorna:
   {
     "id": "a1b2c3d4-...",
     "status": "done"
   }

7. Worker registra no log:
   [2026-02-12T10:30:15.234Z] ✅ Done {"id":"a1b2c3d4-...","name":"Fibonacci"}
```

---

#### **PASSO 5**: Você vê o resultado

**Onde**: Navegador (ainda em /nw/prompts)

**O que você vê**:
- Após 10 segundos (próximo polling), sua tarefa "Fibonacci" **move automaticamente** de "Backlog" para "Done"
- Badge muda de amarelo "Pendente" para verde "Concluído"
- Botão "Ver detalhes" agora mostra o código gerado

**O que acontece nos bastidores**:
```
Seu navegador faz (polling automático a cada 10s):
GET https://xxx.supabase.co/functions/v1/nightworker-prompts/prompts

Supabase retorna (AGORA COM RESULTADO):
{
  "total": 1,
  "prompts": [
    {
      "id": "a1b2c3d4-...",
      "name": "Fibonacci",
      "provider": "claude",
      "status": "done",  ← MUDOU!
      "result_content": "function fibonacci(n) { ... }",  ← TEM RESULTADO!
      "created_at": "2026-02-12T10:30:00Z",
      "updated_at": "2026-02-12T10:30:15Z",  ← Atualizado há 15s
      "attempts": 1
    }
  ]
}

Frontend detecta que status mudou de "pending" → "done"
Move o card da coluna "Backlog" para "Done"
```

---

#### **PASSO 6**: Você vê os detalhes

**Onde**: Navegador → Clica em "Ver detalhes"

**O que você vê**:
- Nome: Fibonacci
- Provider: Claude
- Status: Concluído ✅
- Código gerado:
  ```javascript
  function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n-1) + fibonacci(n-2);
  }
  ```
- Linha do tempo (eventos):
  - ✅ Criado em 12/02 10:30:00
  - ✅ Processado em 12/02 10:30:15 (15 segundos depois)

**O que acontece nos bastidores**:
```
GET https://xxx.supabase.co/functions/v1/nightworker-prompts/prompts/a1b2c3d4-...

Supabase retorna:
{
  "id": "a1b2c3d4-...",
  "name": "Fibonacci",
  "provider": "claude",
  "status": "done",
  "content": "Crie uma função recursiva...",
  "result_content": "function fibonacci(n) { ... }",
  "target_folder": "C:\\code\\meu-projeto",
  "created_at": "2026-02-12T10:30:00Z",
  "updated_at": "2026-02-12T10:30:15Z",
  "attempts": 1,
  "events": [  ← Linha do tempo
    {
      "type": "done",
      "message": "Processed by worker",
      "created_at": "2026-02-12T10:30:15Z"
    }
  ]
}

Frontend mostra tudo formatado na tela.
```

---

## 🚨 Por que não está funcionando agora?

### Problema: Prompts ficam "Pendente" para sempre

**Causa**: Nenhum worker está rodando!

**O que está faltando**: O PASSO 3, 4 e 5 não acontecem.

**Analogia**: É como uma fila de impressora sem impressora ligada.
- Você manda imprimir (cria prompt) ✅
- O computador guarda na fila (Supabase salva) ✅
- Mas a impressora está desligada (worker não está rodando) ❌
- Os documentos ficam "pendentes" para sempre ⏳

---

## ✅ Solução: Ligar o Worker

### Opção 1: Worker Local (Teste rápido)

**Para**: Testar se funciona no seu computador.

**Como fazer**:

1. Abra o terminal na pasta do projeto:
   ```bash
   cd C:\code\minimal-idea-spark
   ```

2. Certifique que tem as variáveis de ambiente no `.env`:
   ```env
   SUPABASE_URL=https://ekaflizdchjdrqgcdlkq.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (token admin)
   ```

3. Rode o worker:
   ```bash
   node --env-file=.env --experimental-strip-types scripts/nightworker-worker-daemon.ts
   ```

4. Você vai ver logs assim:
   ```
   [2026-02-12T10:30:00.000Z] 🚀 Worker daemon started {
     "base": "https://ekaflizdchjdrqgcdlkq.supabase.co/functions/v1/nightworker-prompts",
     "providers": ["codex", "claude"],
     "poll_interval_ms": 10000
   }
   [2026-02-12T10:30:10.000Z] 📦 Batch fetched {"provider":"codex","count":0}
   [2026-02-12T10:30:10.000Z] 📦 Batch fetched {"provider":"claude","count":1}
   [2026-02-12T10:30:10.000Z] 🔧 Processing prompt {"id":"a1b2c3d4-...","name":"Fibonacci"}
   [2026-02-12T10:30:15.000Z] ✅ Done {"id":"a1b2c3d4-...","name":"Fibonacci"}
   ```

5. **IMPORTANTE**: Este worker usa **MOCK** (simulação). Não chama IA de verdade, só simula o processamento. Para produção, precisa implementar chamada real da IA.

**Vantagens**:
- ✅ Rápido para testar
- ✅ Roda no seu computador
- ✅ Vê logs em tempo real

**Desvantagens**:
- ❌ Precisa deixar terminal aberto
- ❌ Não processa IA de verdade (MOCK)
- ❌ Para quando você fecha o terminal

---

### Opção 2: Worker Python (Produção - JÁ RODANDO!)

**Para**: Usar em produção com processamento real de IA.

**Como funciona**: Já existe um worker Python rodando em:
```
https://coder-ai.workfaraway.com
```

**Testar se está funcionando**:
```bash
curl https://coder-ai.workfaraway.com/health
```

Deve retornar:
```json
{
  "status": "ok",
  "providers": ["claude", "codex"],
  "uptime": "23h 24m 47s",
  "version": "1.0.0"
}
```

**Como usar**: Este worker precisa ser configurado para apontar para o seu Supabase. Provavelmente já está configurado, mas você pode verificar se está processando os prompts.

**Vantagens**:
- ✅ Já está rodando 24/7
- ✅ Processa IA de verdade (não é mock)
- ✅ Múltiplas réplicas (escalável)

**Desvantagens**:
- ⚠️ Precisa ter acesso ao servidor para configurar
- ⚠️ Não vê logs localmente

---

### Opção 3: Deploy Worker Node.js (Produção)

**Para**: Ter seu próprio worker rodando 24/7.

**Como fazer**:

#### A) Com Systemd (Linux servidor):

1. Criar arquivo de serviço:
   ```bash
   sudo nano /etc/systemd/system/nightworker.service
   ```

2. Colar este conteúdo:
   ```ini
   [Unit]
   Description=Night Worker Daemon
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/var/www/minimal-idea-spark
   EnvironmentFile=/var/www/minimal-idea-spark/.env
   ExecStart=/usr/bin/node --env-file=.env --experimental-strip-types scripts/nightworker-worker-daemon.ts
   Restart=always
   RestartSec=10

   [Install]
   WantedBy=multi-user.target
   ```

3. Ativar e iniciar:
   ```bash
   sudo systemctl enable nightworker
   sudo systemctl start nightworker
   sudo systemctl status nightworker
   ```

4. Ver logs:
   ```bash
   sudo journalctl -u nightworker -f
   ```

#### B) Com Docker:

1. Criar `Dockerfile` na raiz:
   ```dockerfile
   FROM node:20-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   CMD ["node", "--env-file=.env", "--experimental-strip-types", "scripts/nightworker-worker-daemon.ts"]
   ```

2. Build e rodar:
   ```bash
   docker build -t nightworker .
   docker run -d --env-file .env --name nightworker --restart unless-stopped nightworker
   ```

3. Ver logs:
   ```bash
   docker logs -f nightworker
   ```

#### C) Com PM2 (Node.js process manager):

1. Instalar PM2:
   ```bash
   npm install -g pm2
   ```

2. Iniciar worker:
   ```bash
   pm2 start scripts/nightworker-worker-daemon.ts --interpreter node --node-args="--env-file=.env --experimental-strip-types" --name nightworker
   ```

3. Salvar e configurar auto-start:
   ```bash
   pm2 save
   pm2 startup
   ```

4. Ver logs:
   ```bash
   pm2 logs nightworker
   ```

**Vantagens**:
- ✅ Roda 24/7 automaticamente
- ✅ Reinicia se cair (auto-restart)
- ✅ Logs persistentes

**Desvantagens**:
- ⚠️ Precisa configurar servidor
- ⚠️ Precisa implementar processamento real (atualmente MOCK)

---

## 🎨 Recursos da Interface

### Kanban Drag-and-Drop

Você pode **arrastar os cards** entre as colunas para organizar:

```
┌──────────┐  ┌────────────┐  ┌────────┐  ┌──────┐  ┌─────────┐
│ Backlog  │  │ Priorizado │  │ Doing  │  │ Done │  │ Falhas  │
│          │  │            │  │        │  │      │  │         │
│ [Card 1] │  │            │  │        │  │      │  │         │
│ [Card 2] │  │            │  │        │  │      │  │         │
└──────────┘  └────────────┘  └────────┘  └──────┘  └─────────┘
     │              ↑
     └──────────────┘
     Você pode arrastar!
```

**IMPORTANTE**: Isso é apenas **visual/organizacional**. Não afeta o processamento!
- Todos os prompts com `status=pending` serão processados
- A ordem de processamento é por data de criação (mais antigo primeiro)
- Arrastar para "Priorizado" ou "Doing" não acelera o processamento

**O que é salvo**:
- As colunas "Priorizado" e "Doing" são salvas no `localStorage` do seu navegador
- Se você recarregar a página, eles ficam onde você deixou
- Se você abrir em outro navegador, volta para o Backlog (cada navegador tem seu próprio localStorage)

### Filtros

Na tela de Prompts, você pode filtrar:

**Por Status**:
- Todos
- Pendentes (amarelo)
- Concluídos (verde)
- Falhas (vermelho)

**Por Provider**:
- Todos
- Codex
- Claude

**Por Data**:
- Escolha "De" e "Até"
- Mostra apenas prompts criados nesse período

**Por Nome**:
- Digite na barra de busca
- Filtra em tempo real

### Polling Inteligente

O frontend **atualiza automaticamente** sem você precisar dar F5:

- **Com pending**: Atualiza a cada **10 segundos**
- **Sem pending**: Atualiza a cada **30 segundos** (poupa recursos)

**Exemplo**:
```
10:30:00 → Você cria prompt (status: pending)
10:30:10 → Frontend busca de novo (ainda pending)
10:30:15 → Worker processa (status: done)
10:30:20 → Frontend busca de novo (vê que virou done!) ✅
         → Move automaticamente para coluna "Done"
```

---

## 🔐 Segurança

### Tokens (2 tipos)

**1. SUPABASE_ANON_KEY** (token público):
- Usado pelo frontend (navegador)
- Pode criar prompts (POST)
- Pode ler prompts (GET)
- **NÃO PODE** atualizar prompts (PATCH retorna 403)
- Está no código do frontend (público, tudo bem)

**2. SUPABASE_SERVICE_ROLE_KEY** (token admin):
- Usado pelo worker (servidor)
- Pode fazer tudo (GET, POST, PATCH)
- **Nunca deve estar no frontend**
- **Nunca deve ser commitado no git**
- Só o worker usa (por isso precisa service-role para atualizar)

### RLS (Row Level Security)

O Supabase tem **2 camadas de segurança**:

**Camada 1 - Edge Function**:
```typescript
if (req.method === 'PATCH' && !isServiceRole(req)) {
  return json({ error: 'Forbidden' }, 403)
}
```

**Camada 2 - Postgres RLS**:
```sql
CREATE POLICY "Allow UPDATE only for service-role"
ON nw_prompts FOR UPDATE
USING (auth.jwt() ->> 'role' = 'service_role')
```

**Defense in depth**: Mesmo se alguém bypassar a edge function, o Postgres bloqueia.

---

## 📊 Logs e Monitoramento

### Logs do Worker

Quando o worker está rodando, você vê logs assim:

**Emoji Guide**:
- 🚀 = Worker iniciou
- 📡 = Operação normal
- 📦 = Buscou batch de prompts
- 🔧 = Processando prompt
- ✅ = Sucesso (done)
- ❌ = Falha (failed)
- ⚠️ = Warning (retentativa)
- 💤 = Idle (sem pending)
- 📊 = Estatísticas
- 🛑 = Shutdown

**Exemplo de log completo**:
```
[2026-02-12T10:30:00.000Z] 🚀 Worker daemon started {
  "base": "https://xxx.supabase.co/functions/v1/nightworker-prompts",
  "providers": ["codex","claude"],
  "poll_interval_ms": 10000,
  "idle_interval_ms": 30000,
  "max_batch_size": 5
}

[2026-02-12T10:30:10.000Z] 📡 request {"request_id":"req-123","method":"GET","path":"prompts?status=pending&provider=codex&limit=5"}
[2026-02-12T10:30:10.123Z] 📡 response {"request_id":"req-123","status":200,"latency_ms":123}
[2026-02-12T10:30:10.123Z] 📦 Batch fetched {"provider":"codex","count":0}

[2026-02-12T10:30:10.124Z] 📡 request {"request_id":"req-124","method":"GET","path":"prompts?status=pending&provider=claude&limit=5"}
[2026-02-12T10:30:10.234Z] 📡 response {"request_id":"req-124","status":200,"latency_ms":110}
[2026-02-12T10:30:10.234Z] 📦 Batch fetched {"provider":"claude","count":1}

[2026-02-12T10:30:10.234Z] 🔧 Processing prompt {"id":"a1b2c3d4-...","name":"Fibonacci"}
[2026-02-12T10:30:11.234Z] 📡 request {"request_id":"req-125","method":"PATCH","path":"prompts/a1b2c3d4-..."}
[2026-02-12T10:30:11.345Z] 📡 response {"request_id":"req-125","status":200,"latency_ms":111}
[2026-02-12T10:30:11.345Z] ✅ Done {"id":"a1b2c3d4-...","name":"Fibonacci"}

[2026-02-12T10:30:20.000Z] 💤 Idle, next poll in 30s {}

[2026-02-12T10:31:50.000Z] 📊 Stats {
  "uptime": "1m",
  "polls": 10,
  "processed": 1,
  "succeeded": 1,
  "failed": 0,
  "errors": 0
}
```

### Estatísticas

O worker mostra estatísticas **a cada 10 polls** (ou quando você aperta Ctrl+C):

```
📊 Stats {
  "uptime": "2h 15m",      ← Quanto tempo rodando
  "polls": 150,            ← Quantas vezes buscou prompts
  "processed": 42,         ← Total de prompts processados
  "succeeded": 38,         ← Quantos deram certo
  "failed": 3,             ← Quantos falharam
  "errors": 1              ← Quantos erros críticos
}
```

---

## ❓ Troubleshooting (Resolver Problemas)

### Problema 1: Prompts ficam "Pendente" para sempre

**Sintoma**: Você cria prompt, ele aparece amarelo "Pendente", mas nunca muda para "Concluído".

**Causa**: Worker não está rodando.

**Solução**: Iniciar worker (ver seção "Como Ligar o Worker" acima).

**Como verificar**:
```bash
# Ver se tem prompts pendentes
curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "https://xxx.supabase.co/functions/v1/nightworker-prompts/prompts?status=pending"

# Se retornar prompts, é porque worker não está pegando eles
```

---

### Problema 2: Frontend mostra "500 Unexpected error"

**Sintoma**: Ao abrir /nw/prompts, vê erro 500 no console.

**Causa**: Edge function não está deployada com as últimas mudanças.

**Solução**:
```bash
npx supabase functions deploy nightworker-prompts
```

**Como verificar**:
```bash
# Testar se edge function responde
curl https://xxx.supabase.co/functions/v1/nightworker-prompts/health

# Deve retornar: {"status":"ok","version":"edge",...}
```

---

### Problema 3: Worker retorna "403 Forbidden" ao fazer PATCH

**Sintoma**: Worker roda mas não consegue atualizar prompts.

**Logs do worker**:
```
⚠️  API PATCH prompts/abc123 {"status":403}
```

**Causa**: Worker está usando token errado (anon em vez de service-role).

**Solução**: Verificar `.env`:
```env
# ERRADO (não funciona para PATCH)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...anon...

# CERTO (deve ser service-role)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...service_role...
```

**Como pegar o token certo**:
1. Supabase Dashboard → Project Settings → API
2. Copiar "service_role" (não "anon"!)

---

### Problema 4: Worker processa mas resultado não aparece

**Sintoma**: Worker diz "✅ Done" mas frontend ainda mostra "Pendente".

**Causa**: Frontend pode estar usando cache antigo.

**Solução**:
1. Espere 30 segundos (próximo polling)
2. Ou dê refresh (F5) na página
3. Ou clique em "Limpar" no filtro

**Como verificar**:
```bash
# Ver status diretamente no banco
curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "https://xxx.supabase.co/functions/v1/nightworker-prompts/prompts/abc123"

# Conferir campo "status" e "result_content"
```

---

### Problema 5: Worker consome muita CPU/memória

**Sintoma**: Servidor fica lento quando worker está rodando.

**Causa**: Polling muito frequente ou batch muito grande.

**Solução**: Aumentar intervalos no `.env`:
```env
# Valores padrão (agressivo)
WORKER_POLL_INTERVAL_MS=10000   # 10 segundos
WORKER_MAX_BATCH_SIZE=5         # 5 prompts por vez

# Valores conservadores (economiza recursos)
WORKER_POLL_INTERVAL_MS=30000   # 30 segundos
WORKER_MAX_BATCH_SIZE=1         # 1 prompt por vez
```

---

## 🎓 Conceitos Importantes

### 1. Polling

**O que é**: Worker fica perguntando "tem tarefa nova?" repetidamente.

**Por que não usar Webhook**: Supabase Edge não tem fila de mensagens nativa. Polling é mais simples.

**Otimização**: O worker é inteligente:
- Se tem pending: pergunta a cada 10s (rápido)
- Se não tem pending: pergunta a cada 30s (economiza)

### 2. Idempotência

**O que é**: Fazer a mesma operação 2x não quebra nada.

**Exemplo**:
```
1. Worker processa prompt abc123
2. Worker tenta PATCH (status: done)
3. PATCH funciona (200 OK)
4. Worker crasheia e reinicia
5. Worker tenta PATCH de novo (status: done)
6. Edge retorna 409 "já processado"
7. Worker trata 409 como sucesso ✅
```

**Por que importante**: Worker pode crashar/reiniciar. Idempotência garante que não vai processar 2x ou quebrar.

### 3. Service-Role vs Anon

**Service-Role** (admin):
- Acesso total ao banco
- Bypassa RLS (Row Level Security)
- Usado pelo worker (servidor confiável)
- **NUNCA** expor no frontend

**Anon** (público):
- Acesso limitado (apenas o que RLS permite)
- Usado pelo frontend (navegador)
- Pode ser público (está no código)
- Não pode fazer PATCH (403)

### 4. RLS (Row Level Security)

**O que é**: Postgres policy que controla quem pode fazer o quê.

**Exemplo**:
```sql
-- Qualquer um pode ler (GET)
CREATE POLICY "Allow SELECT for all"
ON nw_prompts FOR SELECT
USING (true);

-- Apenas service-role pode atualizar (PATCH)
CREATE POLICY "Allow UPDATE only for service-role"
ON nw_prompts FOR UPDATE
USING (auth.jwt() ->> 'role' = 'service_role');
```

**Por que importante**: Mesmo se alguém descobrir a URL da API, não consegue hackear porque Postgres bloqueia no nível do banco.

---

## 📝 Resumo de Comandos

### Testar se tudo está OK

```bash
# 1. Testar edge function
curl https://xxx.supabase.co/functions/v1/nightworker-prompts/health

# 2. Testar worker Python externo
curl https://coder-ai.workfaraway.com/health

# 3. Ver prompts pendentes
curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "https://xxx.supabase.co/functions/v1/nightworker-prompts/prompts?status=pending"
```

### Rodar worker local

```bash
# Node.js daemon (loop infinito)
node --env-file=.env --experimental-strip-types scripts/nightworker-worker-daemon.ts

# Node.js one-shot (processa 1x e para)
node --env-file=.env --experimental-strip-types scripts/nightworker-worker-example.ts claude
```

### Deploy edge function

```bash
# Fazer deploy das mudanças
npx supabase functions deploy nightworker-prompts

# Ver logs da edge function
npx supabase functions logs nightworker-prompts
```

### Deploy worker produção

```bash
# Systemd (Linux)
sudo systemctl start nightworker
sudo systemctl status nightworker
sudo journalctl -u nightworker -f

# Docker
docker run -d --env-file .env --name nightworker nightworker
docker logs -f nightworker

# PM2
pm2 start scripts/nightworker-worker-daemon.ts --name nightworker
pm2 logs nightworker
```

---

## 🎯 Próximos Passos

Para fazer o sistema funcionar completo:

1. **Deploy edge function** (resolver 500 errors):
   ```bash
   npx supabase functions deploy nightworker-prompts
   ```

2. **Escolher qual worker usar**:
   - **Opção A**: Python externo (já funciona, produção)
   - **Opção B**: Node.js local (para testar)
   - **Opção C**: Node.js deploy (seu próprio worker)

3. **Testar o fluxo completo**:
   - Criar prompt no frontend
   - Ver worker pegar e processar
   - Ver resultado aparecer no frontend

4. **Implementar processamento real** (se usar Node.js):
   - Substituir MOCK em `processPrompt()`
   - Integrar com Claude API / Codex CLI

---

## 📚 Documentação Adicional

- [BACKEND_API_WORKER.md](./BACKEND_API_WORKER.md) - Documentação técnica do worker
- [NIGHTWORKER_INTEGRATION_REVIEW.md](./NIGHTWORKER_INTEGRATION_REVIEW.md) - Revisão completa
- [NIGHTWORKER_BACKEND_CHECKLIST.md](./NIGHTWORKER_BACKEND_CHECKLIST.md) - Checklist técnico

---

**Última atualização**: 2026-02-12
**Revisado por**: Claude (Sonnet 4.5)
