C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Metas, OKRs e Objetivos de Alto Nível

Objetivos e key results ligados às oportunidades:

1. Criar metas/objetivos (ex: OKR – Objective + Key Results) com prazo
2. Vincular oportunidades a uma meta (uma oportunidade pode contribuir para um key result)
3. Progresso da meta calculado a partir das oportunidades (ex: % concluídas)
4. Visualização em árvore ou lista: Meta → Key results → Oportunidades
5. Dashboard ou widget no War Room com metas ativas e progresso
6. Ciclo temporal (trimestre, semestre) para OKRs
7. Histórico de metas encerradas e resultado final
8. Sugestão de AI para quebrar meta em oportunidades (opcional)

**Arquivos esperados:**
- Migrações: tabelas `goals` ou `okrs`, `key_results`, e FK em `opportunities`
- `src/pages/Goals.tsx` ou seção em War Room / Analytics
- `src/components/Goals/GoalCard.tsx`, `GoalProgress.tsx`, `LinkOpportunityModal.tsx`
- `src/lib/goals/goal-service.ts` (CRUD e cálculo de progresso)
- Widget "Metas" no War Room mostrando resumo
