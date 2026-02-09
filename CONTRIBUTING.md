# Contribuindo

## Convenções

- **Commits:** mensagens em português ou inglês; preferir imperativo (ex.: "Adiciona suporte a Deepgram", "Corrige layout do sidebar").
- **Branch:** `main` como branch principal; features em branches nomeadas (ex.: `feat/command-palette`, `fix/audio-timeout`).

## Onde criar código

- **Novos componentes de UI:** `src/components/` (subpastas por domínio: `layout/`, `smart-capture/`, `war-room/`, etc.).
- **Componentes base reutilizáveis:** `src/components/ui/` (seguir padrão shadcn/Radix).
- **Hooks:** `src/hooks/` (prefixo `use`).
- **Contextos:** `src/contexts/`.
- **Serviços e libs:** `src/lib/` (subpastas por domínio: `search/`, `rag/`, `pwa/`, etc.).
- **Páginas/rotas:** `src/pages/` e registro em `App.tsx`.

## Testes

- Testes unitários/integração junto ao módulo (`*.test.ts` / `*.test.tsx`) ou em `src/test/`.
- E2E em `e2e/` (Playwright). Rodar `npm run test` e `npm run test:e2e` antes de abrir PR.

## Documentação

- Decisões de arquitetura: `docs/adr/` (usar template `0000-template.md`).
- Visão geral e arquitetura: `docs/README.md`, `docs/ARCHITECTURE.md`.
