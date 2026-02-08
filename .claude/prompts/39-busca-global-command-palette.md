C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Busca Global e Command Palette (Cmd+K)

Uma única entrada para buscar e agir em todo o app:

1. Atalho global Cmd+K (Mac) / Ctrl+K (Windows) abre um modal/dialog (command palette)
2. Dentro da palette: busca unificada usando SmartSearch (opportunities, journal, knowledge base) com resultados agrupados por tipo e link para abrir o item (deep link)
3. Ações rápidas: "Nova oportunidade", "Nova entrada no journal", "Abrir Consultant", "Modo Deep Work", "Ir para Settings"
4. Navegação rápida: listar páginas principais (Dashboard, Opportunities, Journal, etc.) e ao digitar filtrar por nome; Enter navega
5. Palette acessível: foco no input ao abrir, navegação por setas, Esc fecha, aria-label e role="dialog"
6. Exibir atalho "⌘K" no canto do header ou na sidebar para descobribilidade
7. Em mobile: botão no header ou no FAB que abre a mesma palette (busca + ações)
8. Integrar com useSearch e SmartSearch existentes; evitar duplicar lógica de busca

**Arquivos esperados:**
- `src/components/CommandPalette.tsx` (modal com input, tabs ou seções: Buscar / Ações / Páginas)
- `src/hooks/useKeyboardShortcuts.ts`: adicionar Cmd/Ctrl+K para abrir palette
- `src/contexts/AppContext.tsx` ou estado global: commandPaletteOpen, setCommandPaletteOpen
- Integração com `useSearch` e exibição de resultados de SmartSearch na palette
- Botão no AppLayout (header ou sidebar) "Buscar ⌘K" que abre a palette
- Mobile: mesmo componente acionável por botão no header ou FAB
