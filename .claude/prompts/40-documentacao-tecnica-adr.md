C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Documentação Técnica e ADRs

Documentar decisões e estrutura do projeto para manter consistência:

1. Criar pasta `docs/` na raiz com: `README.md` (visão geral do projeto, stack, como rodar), `ARCHITECTURE.md` (camadas: UI, hooks, contexts, Supabase, Edge Functions)
2. ADRs (Architecture Decision Records) em `docs/adr/`: template e pelo menos 2-3 ADRs (ex: "Por que Supabase", "Por que React Query", "Por que LanguageContext + i18next")
3. Comentários JSDoc nos contextos principais (AppContext, AuthContext, RealtimeContext) e em hooks compartilhados (useLocalData, useSearch)
4. README principal do repositório com: pré-requisitos, clone, `npm install`, `.env.example`, scripts (dev, build, test), estrutura de pastas resumida
5. Documentar variáveis de ambiente em `.env.example` com comentários (VITE_SUPABASE_URL, VITE_DEEPGRAM_API_KEY, etc.)
6. Opcional: CONTRIBUTING.md com convenções de commit e onde criar novos componentes

**Arquivos esperados:**
- `docs/README.md` e `docs/ARCHITECTURE.md`
- `docs/adr/0000-template.md` e 2-3 ADRs numerados
- Comentários em `src/contexts/AppContext.tsx`, `src/hooks/useLocalData.ts` (ou equivalentes)
- README na raiz atualizado; `.env.example` comentado
