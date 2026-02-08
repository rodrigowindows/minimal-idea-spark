# API – Minimal Idea Spark

Acesso programático por API key (em desenvolvimento: backend Supabase).

## Autenticação

Envie o header em todas as requisições:

```
Authorization: Bearer <sua_api_key>
```

A API key pode ser criada em **Configurações → Integrações**. Guarde o valor no primeiro momento; depois só é exibido o prefixo.

## Endpoints (planejado)

- `GET /api/v1/opportunities` – listar oportunidades
- `POST /api/v1/opportunities` – criar oportunidade
- `PATCH /api/v1/opportunities/:id` – atualizar oportunidade
- `GET /api/v1/journal` – listar entradas do diário
- `POST /api/v1/journal` – criar entrada

## Webhooks

Configure URLs em **Configurações → Integrações**. Eventos (quando disponíveis no backend):

- `opportunity_created`
- `opportunity_updated`
- `journal_created`

O payload será enviado como `application/json` com o corpo do evento.

## Rate limit

(Planejado: limite por minuto por API key.)
