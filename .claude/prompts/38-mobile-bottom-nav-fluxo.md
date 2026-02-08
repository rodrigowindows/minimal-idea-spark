C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Mobile: Bottom Nav e Fluxo

Otimizar navegação e fluxo no mobile:

1. Bottom nav (`MobileNav`) usar textos e labels do i18n (LanguageContext), não hardcoded "Home", "Tasks", "Advisor", "Stats"
2. Considerar adicionar "Journal" ou "Mais" no bottom nav: 5º item ou menu "Mais" que abre drawer com resto das páginas (como na sidebar)
3. FAB (botão Capture): manter comportamento de ir para "/" e focar Smart Capture; alternativa: FAB abre command palette (Cmd+K) em mobile para "Nova oportunidade", "Nova entrada no journal", "Buscar"
4. Swipe entre páginas: já existe entre [/, /opportunities, /consultant, /analytics]; incluir Journal na sequência ou permitir configurar quais páginas fazem parte do swipe
5. Banner de offline e "Update available" já existem; garantir que não cubram o FAB e que sejam acessíveis (aria-live)
6. Safe area: garantir padding bottom no main e no nav com env(safe-area-inset-bottom) em todos os dispositivos
7. Touch targets: todos os itens do bottom nav e FAB com min 44x44px (já parcialmente feito)
8. Ao abrir drawer (menu hamburger), destacar página atual e permitir fechar ao selecionar uma página

**Arquivos esperados:**
- `src/components/MobileNav.tsx` (i18n, opcional "Mais", FAB opcional com command palette)
- Chaves em `LanguageContext` ou arquivo de traduções para nav labels
- Ajuste do array `pages` para swipe e/ou configuração de páginas swipeáveis
- Revisão de safe-area e touch targets no layout mobile
- Se "Mais" for implementado: drawer ou sheet com lista de páginas (reutilizar itens da Sidebar)
