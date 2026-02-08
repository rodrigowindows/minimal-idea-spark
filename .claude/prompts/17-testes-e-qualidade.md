C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Testes e Qualidade de Código

Cobertura de testes e ferramentas de qualidade:

1. Testes unitários para hooks críticos (useXPSystem, usePriorities, useRagChat)
2. Testes de integração para fluxos principais (login, criar oportunidade, journal)
3. Testes E2E com Playwright ou Cypress (smoke tests das páginas)
4. Configurar coverage report (Vitest/Istanbul)
5. Testes de acessibilidade básicos (jest-axe ou similar)
6. CI pipeline (GitHub Actions) rodando testes em push/PR
7. Mocks consistentes para Supabase e APIs
8. Documentar como rodar testes no README

**Arquivos esperados:**
- `src/test/setup.ts` (expandir se necessário)
- Testes em `*.test.ts` / `*.test.tsx` junto aos módulos ou em `src/test/`
- `playwright.config.ts` ou `cypress.config.ts` (E2E)
- `.github/workflows/test.yml` (CI)
- Atualizar `README.md` com secção de testes
