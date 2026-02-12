# api_server.py vs worker.py — Por que o prompt fica "Aguardando processamento"?

## Situação típica

- Você criou um prompt no frontend (ex.: ID `3a5ef6b2-7c20-4e96-a307-f98d8ba665ec`).
- O status fica **"Aguardando processamento"** e nunca muda.
- Você está rodando a **Night Worker API** (api_server.py) em `http://localhost:5555` e **não vê nada nos logs** relacionado a esse prompt.

## Explicação em uma frase

**api_server.py não é o programa que processa prompts guardados na Supabase Edge.** Quem processa é o **worker.py** (em modo Supabase). Os logs que você está vendo são do api_server; o worker que precisaria rodar é outro processo.

---

## Dois fluxos diferentes

### Fluxo 1: Frontend usa **Supabase Edge** (API A)

- O frontend envia `POST /prompts` para a **Edge** (`.../functions/v1/nightworker-prompts`).
- O prompt fica no **banco Supabase** com status `pending`.
- Para esse prompt sair de "Aguardando processamento", é preciso um **worker que fale com a Edge**:
  - **worker.py** (em `claude-auto/night-worker/`) com **`supabase_mode=true`** no `config.txt`.
  - Esse worker faz **GET** na Edge (`/prompts?status=pending&provider=...`) com **SUPABASE_SERVICE_ROLE_KEY**, processa e faz **PATCH** com o resultado.
- O **api_server.py** (porta 5555) **não consulta a Edge** e **não processa** esses prompts. Por isso você não vê nada nos logs do api_server quando o prompt está na Supabase.

### Fluxo 2: Frontend usa **api_server** (API B file-based)

- O frontend envia `POST /prompts` para o **api_server** (ex.: `http://localhost:5555`).
- O api_server grava um arquivo em `night-worker/input/` (ou `night-worker -codex/input/`).
- Para o prompt ser processado, é preciso rodar o **worker.py** com **`supabase_mode=false`**, que lê a pasta **input/** e processa os arquivos.
- Nesse fluxo, os logs de "recebi prompt" / "processando" aparecem no **worker.py**, não no api_server (o api_server só recebe POST e grava em disco).

---

## O que fazer quando o prompt está na Edge e fica pendente

1. **Confirmar que a Edge está no ar**  
   - Deploy: `npx supabase functions deploy nightworker-prompts`  
   - Teste: `curl "https://<seu-projeto>.supabase.co/functions/v1/nightworker-prompts/health"`

2. **Subir o worker que consome a Edge**  
   - No projeto **claude-auto**, em `night-worker/`:
     - No `config.txt`: `supabase_mode=true`, `supabase_url=...`, `supabase_service_role_key=...`, `nightworker_api_url=https://<seu-projeto>.supabase.co/functions/v1/nightworker-prompts`
     - Rodar: `python worker.py` (ou o script de serviço que você usa).
   - Esse processo é que vai aparecer nos logs pegando o prompt e processando.

3. **Não confundir com o api_server**  
   - Rodar só o api_server (porta 5555) **não** faz os prompts da Edge serem processados.  
   - O api_server é outra API (file-based); o worker que esvazia a fila da Edge é o worker.py em modo Supabase.

---

## Sobre o 401 nos logs do api_server

Exemplo:

```text
GET /prompts?status=pending&provider=claude&limit=5 HTTP/1.1" 401 Unauthorized
```

- O **api_server** exige **Bearer token** em GET/POST (configurado em `config.txt`, ex.: `api_token=...`).
- Esse 401 significa que **alguém** (ex.: outro serviço ou o Lovable) está chamando o **api_server** em `/prompts` **sem token válido**.
- Isso é **independente** do seu prompt na Edge: o prompt na Edge só é processado pelo **worker.py** que fala com a **Edge**, não pelo api_server.

---

## Resumo

| Onde o prompt foi criado? | Quem processa?           | Onde aparecem os logs? |
|---------------------------|--------------------------|-------------------------|
| **Supabase Edge**         | **worker.py** (supabase_mode=true) | **worker.py**           |
| **api_server** (POST em :5555) | **worker.py** (supabase_mode=false) lendo **input/** | **worker.py**           |

**api_server.py** = API que recebe prompts e grava em arquivo (e opcionalmente lista).  
**worker.py** = Processo que realmente processa (lendo da Edge ou da pasta input/).  
Por isso, ao usar a Edge, você **não** vê o seu prompt sendo processado nos logs do api_server.
