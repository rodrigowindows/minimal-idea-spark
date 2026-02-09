C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Listas, Tabelas e Virtualização

Garantir que listas longas não travem o app e tenham UX consistente:

1. Identificar listas que podem ter muitos itens: oportunidades, journal entries, notificações, histórico de versões, resultados de busca. Se uma lista renderiza 100+ itens no DOM, considerar virtualização
2. Adicionar lib de virtualização (ex: @tanstack/react-virtual ou react-window) apenas onde necessário; usar lista virtual para scroll com janela de itens visíveis
3. Tabelas: se houver tabela com muitas linhas (ex: Opportunities em vista tabela, Version history), aplicar virtualização na body ou paginação (ex: 20 itens por página com "Carregar mais")
4. Lista acessível: lista virtual deve manter roles (list, listitem), foco e navegação por teclado (setas); aria-rowcount e aria-rowindex se for tabela
5. Loading e empty state: enquanto carrega, skeleton ou spinner; quando vazia, mensagem e CTA (ex: "Nenhuma oportunidade. Criar primeira.")
6. Performance: evitar re-render de toda a lista ao atualizar um item; usar key estável (id) e, se possível, atualizar apenas o item alterado (estado local ou cache por id)

**Arquivos esperados:**
- Instalação de @tanstack/react-virtual (ou similar) e uso em uma lista longa existente (ex: oportunidades ou journal)
- Componente reutilizável VirtualList ou uso documentado do virtualizer em uma página
- Empty state e loading em listas principais (Opportunities, Journal, Notifications)
- Opcional: paginação "Carregar mais" como alternativa à virtualização em alguma tela
