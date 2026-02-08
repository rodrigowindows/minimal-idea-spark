C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Tags, Labels e Categorização Avançada

Sistema de organização com tags e labels para oportunidades, journal e knowledge base:

1. Criar, editar e excluir tags (com cor e ícone opcional)
2. Atribuir múltiplas tags a oportunidades e entradas de journal
3. Filtros por tag na listagem (e combinação com status, data, etc.)
4. Tags sugeridas por AI a partir do conteúdo
5. Tags globais por workspace/organization
6. Autocomplete ao digitar # ou selecionar tags
7. Estatísticas por tag (quantidade de itens, tendências)
8. Agrupamento e ordenação por tag nas views

**Arquivos esperados:**
- `src/lib/tags/tag-service.ts` (CRUD e associações)
- `src/components/tags/TagPicker.tsx`, `TagBadge.tsx`, `TagFilter.tsx`
- Migração Supabase para tabelas `tags` e `opportunity_tags` / `journal_tags` (ou polimórfico)
- Atualização de Opportunities e Journal para usar tags
- Seção de gerenciamento de tags em Settings ou página dedicada
