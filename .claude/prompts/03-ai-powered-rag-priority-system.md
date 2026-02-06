C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Sistema RAG com Priorização Inteligente por AI

Implemente sistema RAG que mantém prioridades e objetivos em foco:

1. Crie vector database para armazenar objetivos/prioridades
2. Embeddings automáticos de metas e contexto do usuário
3. RAG que sempre considera prioridades nas respostas
4. Sistema de "contexto persistente" com objetivos
5. AI sugere ações baseadas nas prioridades
6. Reavaliação automática de prioridades
7. Dashboard de tracking de objetivos
8. Integração com todas as features do app

**Arquivos esperados:**
- `lib/rag/priority-context.ts`
- `lib/rag/goal-embeddings.ts`
- `components/PriorityDashboard.tsx`
- `supabase/functions/rag-priority/index.ts`
- Atualizar `rag-chat` existente
