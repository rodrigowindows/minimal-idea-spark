C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Export e Backup Completo de Dados

Permitir que o usuário exporte e faça backup de todos os seus dados:

1. Export em JSON completo (opportunities, journal, knowledge base, settings)
2. Export em CSV para oportunidades e journal (para planilhas)
3. Opção de export por workspace/organization
4. Agendamento de backup automático (lembrete ou envio por email)
5. Restauração a partir de arquivo JSON (import)
6. Preview antes de importar (mostrar resumo do que será importado)
7. Tratamento de conflitos na importação (substituir, mesclar, pular)
8. Inclusão de anexos/imagens no backup quando aplicável

**Arquivos esperados:**
- `src/lib/export/backup.ts` (gerar JSON/CSV)
- `src/lib/export/restore.ts` (validar e importar)
- `src/pages/Settings.tsx` ou página dedicada com seção "Backup e exportação"
- `src/components/ExportImport/ExportModal.tsx`, `ImportModal.tsx`
- Edge function opcional `supabase/functions/export-data/index.ts` se backup server-side for necessário
