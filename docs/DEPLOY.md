# Deploy

## Pré-requisitos

- Node.js 18+
- Conta Supabase (para auth e dados)
- Variáveis de ambiente (ver `.env.example`)

## Build

```bash
npm ci
npm run build
```

O output fica em `dist/` (Vite). A base da aplicação é `/`; para subpath, configure `base` em `vite.config.ts`.

Opcional: rodar `scripts/pre-deploy.ps1` para lint + testes + build em sequência.
Opcional: para Linux/macOS, rodar `scripts/pre-deploy.sh`.

## Variáveis de produção

Definir no ambiente de deploy (Vercel, Netlify, etc.) ou em `.env` local para build:

| Variável | Obrigatório | Uso |
|----------|-------------|-----|
| `VITE_SUPABASE_URL` | Sim (se usar auth/dados) | URL do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Sim | Chave anon/public |
| `VITE_OPENAI_API_KEY` | Para RAG/Smart Capture | Usado pelas Edge Functions |
| `VITE_DEEPGRAM_API_KEY` | Para transcrição de voz | Client-side; opcional (fallback browser) |

**Não** commitar `.env` com valores reais. Usar apenas `.env.example` como referência.

## Deploy estático (Vercel / Netlify / Supabase)

1. Conectar o repositório ao serviço.
2. Configurar as variáveis de ambiente acima.
3. Build command: `npm run build`
4. Output directory: `dist`
5. (Opcional) Redirects: SPA fallback `/*` → `/index.html` para client-side routing.

## Edge Functions (Supabase)

As funções em `supabase/functions/` devem ser publicadas separadamente:

```bash
npx supabase functions deploy transcribe-audio
npx supabase functions deploy rag-chat
# ... demais funções
```

Configurar secrets no Dashboard (Supabase → Edge Functions → Secrets): `OPENAI_API_KEY`, etc.

## Pós-deploy

Usar o [Checklist de release](RELEASE_CHECKLIST.md) e os smoke tests manuais para validar.
