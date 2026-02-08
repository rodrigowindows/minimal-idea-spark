C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Import de Notas Externas (Notion, Obsidian, Markdown)

Importar conteúdo de outras ferramentas para oportunidades e knowledge base:

1. Import de arquivo(s) Markdown: cada # Título ou bloco vira oportunidade ou item de knowledge base
2. Upload de export do Notion (HTML ou CSV): mapear para oportunidades com título e notas
3. Import de pasta/vault Obsidian (múltiplos .md): preservar links internos como referência
4. Preview antes de importar: listar itens que serão criados e permitir ajustar mapeamento
5. Opção de importar como rascunho (status Backlog) ou manter datas originais se disponíveis
6. Evitar duplicatas: detectar títulos similares e perguntar mesclar ou pular
7. Import de anexos/imagens: fazer upload para storage e linkar no conteúdo
8. Log de import (quantos criados, erros) e opção de desfazer (rollback) na mesma sessão

**Arquivos esperados:**
- `src/lib/import/markdown-parser.ts`, `notion-parser.ts`, `obsidian-parser.ts`
- `src/pages/Import.tsx` ou modal em Settings com upload e opções
- `src/components/Import/ImportPreview.tsx`, `ImportResult.tsx`
- Edge function opcional para processar arquivos grandes no servidor
- Migração ou uso de storage para anexos importados
