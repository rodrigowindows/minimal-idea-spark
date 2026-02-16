# Minimal Idea Spark

React + TypeScript app with **Canvas**-style second brain: War Room dashboard, Strategic Consultant (AI chat), Opportunities, Journal, Analytics, XP gamification, time blocking, and Deep Work mode with Pomodoro.

_Repo editado via OpenClaw dentro do container para teste de Git (sexto commit)._ 

## Quick start

```sh
npm i
npm run dev
```

Open [http://localhost:8080](http://localhost:8080). Data is mock by default.

**Variáveis de ambiente:** copie `.env.example` para `.env` e preencha:

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `VITE_SUPABASE_URL` | Sim (para auth/dados) | URL do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Sim | Chave anon/public |
| `VITE_OPENAI_API_KEY` | Para RAG/Smart Capture | Usado pelas Edge Functions |
| `VITE_DEEPGRAM_API_KEY` | Para voz | Transcrição; sem ela, fallback no browser |

Depois rode as migrations em `supabase/migrations/` se usar Supabase.

### Night Worker (opcional)

Sistema de processamento assíncrono de prompts com arquitetura de dois backends:

- **Backend A (API)**: Supabase edge function (padrão) OU servidor externo (ex.: `coder-ai.workfaraway.com`)
  - API CRUD para prompts (`GET/POST/PATCH /prompts`)
  - Fonte de verdade; não processa, apenas persiste
- **Backend B (Worker)**: Script Node.js/Python/Go que consome API e processa prompts (chama LLM/CLI)
  - Busca pendentes, processa, devolve resultado via PATCH
  - Roda via cron, Docker, systemd (separado do frontend)

**Configuração:**

1. **Supabase edge (padrão)**: nada a fazer, deriva automaticamente de `VITE_SUPABASE_URL`
2. **Servidor externo**: definir `VITE_NIGHTWORKER_API_URL=https://seu-servidor.com` no `.env`
3. **Primeiro acesso**: ir em `/nw/connect`, digitar URL + token Bearer (anon para frontend, service-role para workers)

**Scripts disponíveis:**

```sh
npm run qa:nightworker                          # Testa API completa (GET/POST/PATCH)
node scripts/nightworker-worker-example.ts      # Worker exemplo (requer SUPABASE_SERVICE_ROLE_KEY)
node scripts/qa-nightworker-e2e-flow.ts         # E2E completo (create → patch → list)
```

Ver [docs/NIGHTWORKER_BACKEND_CHECKLIST.md](docs/NIGHTWORKER_BACKEND_CHECKLIST.md) para detalhes técnicos.

## Tests

Unit tests (Vitest), E2E (Playwright in `e2e/`), and CI (`.github/workflows/test.yml`). Accessibility: SkipLink, focus-visible, and `prefers-reduced-motion` in `src/index.css`.

### Unit & Integration Tests (Vitest)

```sh
npm run test          # Run all tests once
npm run test:watch    # Watch mode (re-run on file changes)
npm run test:coverage # Run with coverage report (output in coverage/)
```

Tests are in `*.test.ts` / `*.test.tsx` files alongside their source modules:

| Category | Files | What they cover |
|----------|-------|-----------------|
| **Hook unit tests** | `src/hooks/useXPSystem.test.ts`, `usePriorities.test.ts`, `useRagChat.test.ts` | XP gamification, priority CRUD, RAG chat streaming |
| **Component tests** | `src/components/smart-capture/SmartCapture.test.tsx`, `src/components/war-room/TheOneThing.test.tsx` | UI interactions, rendering, user events |
| **Integration tests** | `src/pages/Auth.test.tsx`, `Opportunities.test.tsx`, `Journal.test.tsx` | Full page flows: login/signup, opportunity list/filter, journal create/list |
| **Utility tests** | `src/lib/constants.test.ts` | XP reward calculations, gamification config |
| **Accessibility tests** | `src/test/accessibility.test.tsx` | jest-axe a11y checks for core UI components |

### E2E Tests (Playwright)

```sh
npx playwright install   # First time: install Chromium
npm run test:e2e         # Run E2E smoke tests
```

E2E tests live in `e2e/` and cover:
- Page load & navigation smoke tests
- Auth form rendering and toggle
- Route redirects (auth guard)
- 404 handling
- Basic accessibility (no duplicate IDs)

Playwright auto-starts the dev server on port 8080 unless `CI=1`.

### Mocks

- **Supabase mock**: `src/test/mocks/supabase.ts` — reusable Supabase client mock with auth, DB, and functions stubs
- **Context mock**: `src/test/mocks/contexts.tsx` — `TestProviders` wrapper with QueryClient, Router, and Tooltip providers
- **Test setup**: `src/test/setup.ts` — global mocks for matchMedia, IntersectionObserver, ResizeObserver, import.meta.env
- Per-file `vi.mock()` for sonner, framer-motion, react-i18next, etc.

### Coverage

Coverage is generated with `v8` provider. Run `npm run test:coverage` and open `coverage/index.html` for detailed per-file reports.

### CI Pipeline

GitHub Actions (`.github/workflows/test.yml`) runs on every push/PR to `main`/`master`:

1. **Unit & Integration Tests** — lint, test with coverage, build
2. **E2E Tests** — Playwright smoke tests against production build

Coverage and Playwright reports are uploaded as artifacts.

## Features

- **War Room (Dashboard)** – Smart Capture, The One Thing, Opportunity Radar, XP widget, Time Blocking, Energy Balance, Quick Journal
- **Consultant** – AI-style chat with mock responses
- **Opportunities** – List/filter by status (Backlog, Doing, Review, Done)
- **Journal** – Entries with mood and energy
- **Analytics** – Weekly scorecard, level progress, achievements
- **Deep Work** – Full-screen focus + Pomodoro (Esc or X to exit)
- **Supabase** – Migrations and Edge Functions (RAG, smart-capture) under `supabase/`

## Estrutura de pastas (resumo)

- `src/components/` – UI (layout, smart-capture, war-room, ui base)
- `src/contexts/` – Estado global (App, Auth, Theme, Language, Realtime, Workspace)
- `src/hooks/` – useLocalData, useSearch, useAudioTranscription, useRealtimeSync, etc.
- `src/lib/` – Serviços (audio-transcription, search, rag, automation, pwa, export)
- `src/pages/` – Rotas (Dashboard, Journal, Opportunities, Settings, …)
- `supabase/functions/` – Edge Functions (rag-chat, generate-embedding, vector-search, transcribe-audio, …)
- `docs/` – Documentação técnica e ADRs (ver `docs/README.md`)

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish. Antes do deploy, use o [Checklist de release](docs/RELEASE_CHECKLIST.md) e, se preferir, rode `scripts/pre-deploy.ps1` (Windows) ou `scripts/pre-deploy.sh` (Linux/macOS).

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
