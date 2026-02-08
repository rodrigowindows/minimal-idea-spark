C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Navegação e Agrupamento da Sidebar

Organizar a sidebar (muitos itens) para melhor fluxo e descoberta:

1. Agrupar itens em seções com título: Principal (War Room, Consultant, Opportunities, Journal), Produtividade (Habits, Goals, Calendar, Priorities, Weekly Review), Ferramentas (Content, Automation, Templates, Images, Version History, Notifications), Config (Workspace, Settings)
2. Seções colapsáveis (expandir/recolher) com estado persistido por usuário
3. Opção "Favoritos" ou "Recentes": últimas 3–5 páginas visitadas no topo ou em seção própria
4. Sidebar colapsada (só ícones) mostrar tooltip com nome e atalho (Alt+1 etc.)
5. Ordem dos itens dentro de cada grupo alinhada ao fluxo de uso (ex: Opportunities antes de Journal)
6. Em mobile (drawer): mesmas seções para não perder itens; scroll suave
7. Deep Work e Collapse permanecem no rodapé da sidebar
8. i18n para títulos das seções (Principal, Produtividade, Ferramentas, Config)

**Arquivos esperados:**
- `src/components/layout/Sidebar.tsx` (refatorar com grupos e estado colapsado)
- `src/contexts/AppContext.tsx` ou localStorage para sidebar sections expanded e recent pages
- `src/hooks/useRecentPages.ts` (registrar pathname ao navegar, retornar últimos N)
- Ajustes em `NavLink` ou novo `SidebarNavItem` com tooltip quando collapsed
- Chaves de tradução para grupos em LanguageContext
