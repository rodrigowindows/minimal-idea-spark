C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Uso de AI, Limites e Central de Ajuda

Transparência no uso de AI e suporte ao usuário:

1. Onde houver chamadas a AI (Consultant, Content Generator, Insights, Assistant, Images): mostrar indicador de "usando AI" ou custo/limite se aplicável
2. Página ou seção em Settings "Uso de AI" com resumo (ex: chamadas este mês, limites se houver)
3. Rate limit ou feedback amigável quando API retornar 429 (ex: "Muitas requisições. Tente em alguns minutos.")
4. Central de Ajuda: página ou drawer com FAQ, links para documentação, atalhos e "Como usar" por feature
5. Tooltip ou link "O que é isso?" em features como RAG, Prioridades, Automação
6. Mensagens de erro da API de AI traduzidas e amigáveis (não expor stack)
7. Opção de desativar features que usam AI por preferência (ex: não sugerir automações)
8. Contato ou link para suporte (email, Discord, etc.) na Ajuda ou no rodapé

**Arquivos esperados:**
- `src/lib/ai/usage-tracker.ts` (opcional: contagem em localStorage por mês)
- `src/pages/Help.tsx` ou `src/components/Help/HelpCenter.tsx` (FAQ, atalhos, links)
- Seção em Settings "Uso de AI" e/ou "Ajuda"
- Tratamento de 429 nas chamadas a Edge Functions de AI (toast + mensagem)
- Componente reutilizável para "loading de AI" (ex: `AILoadingIndicator.tsx`)
- Atualizar README com link para ajuda ou suporte se aplicável
