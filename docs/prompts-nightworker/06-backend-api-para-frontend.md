# Backend Night Worker API – Documento para o Frontend

Use este documento para revisar e integrar o frontend (minimal-idea-spark) com o backend Night Worker API (projeto claude-auto).

---

## 1. Visão geral

- **O que é:** API HTTP (FastAPI) que recebe prompts e roteia para workers (Claude ou Codex) conforme o parâmetro `provider` de cada request.
- **Base URL:** `http://localhost:5555` (porta configurável em `config.txt` no projeto claude-auto).
- **Documentação interativa:** `http://localhost:5555/docs` (Swagger UI).

---

## 2. Autenticação

- Endpoints de prompts exigem o header:
  ```http
  Authorization: Bearer <token>
  ```
- O token é fixo e definido em `config.txt` no backend (`api_token`). O frontend deve obter esse valor (variável de ambiente, configuração ou input do usuário) e enviá-lo em todas as requisições autenticadas.
- Respostas de erro:
  - **401:** Token não fornecido ou formato inválido (esperado: `Bearer <token>`).
  - **403:** Token inválido.

---

## 3. Endpoints

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/health` | Não | Health check. Retorna `status`, `providers[]`, `uptime`, `version`. |
| POST | `/prompts` | Sim | Enviar prompt. Body: `provider`, `name`, `content`, `target_folder`. Retorna `id`, `provider`, `status`, `filename`, `message`. |
| GET | `/prompts` | Sim | Listar prompts. Query: `provider?`, `status?`, `limit` (1–200). Retorna `total`, `prompts[]`, `providers[]`. |
| GET | `/prompts/{prompt_id}/status` | Sim | Status de um prompt. Retorna `id`, `provider`, `status`, `filename`, `path`, `content`, `result` (quando aplicável). |

---

## 4. Modelos de dados

### POST /prompts – body

```json
{
  "provider": "claude",
  "name": "criar-componente-login",
  "content": "Crie um formulário de login com email e senha.",
  "target_folder": "C:\\code\\meu-projeto"
}
```

- **provider:** string. Valores típicos: `"claude"` ou `"codex"` (conforme config do backend).
- **name:** string, mínimo 1 caractere; preferir sem espaços (ex.: kebab-case).
- **content:** string, mínimo 1 caractere; instruções do prompt.
- **target_folder:** string; caminho absoluto da pasta do projeto no servidor onde o worker vai atuar.

### POST /prompts – resposta (201)

```json
{
  "id": "a1b2c3d4",
  "provider": "claude",
  "status": "pending",
  "filename": "a1b2c3d4_criar-componente-login.txt",
  "message": "Prompt salvo em claude/input/. Worker processará automaticamente."
}
```

- **id:** string (8 caracteres); usar para consultar status e resultado.

### Status possíveis de um prompt

- **pending:** na fila ou em processamento.
- **done:** processado com sucesso (pode haver `result` em markdown).
- **failed:** processamento falhou.

### GET /prompts – query params

- **provider:** opcional. Filtra por provider (ex.: `claude`, `codex`).
- **status:** opcional. Filtra por `pending`, `done` ou `failed`.
- **limit:** número entre 1 e 200 (default 50).

### GET /prompts – resposta

```json
{
  "total": 10,
  "prompts": [
    {
      "id": "a1b2c3d4",
      "provider": "claude",
      "status": "done",
      "filename": "a1b2c3d4_criar-componente-login.txt",
      "created_at": "2025-02-10T12:00:00",
      "has_result": true
    }
  ],
  "providers": ["claude", "codex"]
}
```

### GET /prompts/{prompt_id}/status – resposta

- **pending:** `id`, `provider`, `status`, `filename`, `path`, `content`.
- **done:** além dos acima, `result` (string, markdown do resultado).
- **failed:** `id`, `provider`, `status`, `filename`, `path` (sem `result` útil).

### GET /health – resposta

```json
{
  "status": "ok",
  "providers": ["claude", "codex"],
  "uptime": "0h 5m 30s",
  "version": "1.0.0"
}
```

---

## 5. Fluxo sugerido no frontend

1. **Verificar API:** `GET /health` para confirmar que a API está no ar e listar `providers` disponíveis.
2. **Enviar tarefa:** `POST /prompts` com body JSON; guardar o `id` retornado.
3. **Acompanhar:** polling em `GET /prompts/{id}/status` até `status` ser `done` ou `failed`; ou usar `GET /prompts` (com filtros opcionais) para listar e mostrar status.
4. **Tratar erros:** 400 (provider inválido, etc.), 401 (não autenticado), 403 (token inválido), 404 (prompt não encontrado).

---

## 6. CORS

O backend envia CORS permissivo (`allow_origins=["*"]`). Nenhuma configuração extra é necessária no backend para chamadas a partir do frontend em outra origem.

---

## 7. Resumo de códigos de erro

- **400:** Provider inexistente ou parâmetros inválidos (ex.: provider não encontrado na listagem).
- **401:** Header `Authorization` ausente ou formato diferente de `Bearer <token>`.
- **403:** Token incorreto.
- **404:** Nenhum prompt encontrado com o `prompt_id` informado em nenhum provider.

---

Fim do documento. Use este conteúdo para revisar a integração do frontend com a Night Worker API.
