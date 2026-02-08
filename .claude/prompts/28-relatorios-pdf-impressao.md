C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Relatórios, Export PDF e Impressão

Gerar relatórios e saídas para leitura ou compartilhamento:

1. Relatório semanal/mensal em PDF (resumo de oportunidades, journal, métricas)
2. Export de uma oportunidade ou lista filtrada para PDF
3. Layout de impressão amigável para War Room e Journal (CSS print)
4. Opção de incluir ou ocultar seções no relatório (escolha do usuário)
5. Gráficos e scorecard no PDF (usar lib como jsPDF + html2canvas ou react-pdf)
6. Envio do relatório por email (agendado ou sob demanda)
7. Template de relatório customizável (cabeçalho, logo, rodapé)
8. Histórico de relatórios gerados (opcional)

**Arquivos esperados:**
- `src/lib/reports/generate-pdf.ts` ou uso de @react-pdf/renderer / jsPDF
- `src/pages/Reports.tsx` ou seção em Analytics com "Gerar relatório"
- `src/components/ReportPreview.tsx`, `ReportOptionsModal.tsx`
- Estilos de impressão em componentes principais (media print)
- Edge function opcional para envio por email
