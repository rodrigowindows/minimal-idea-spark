C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Atalhos de Teclado e Comandos Rápidos

Produtividade via teclado e paleta de comandos:

1. Atalhos globais: N (nova oportunidade), J (journal), W (War Room), C (Consultant), / (busca)
2. Paleta de comandos (Cmd/Ctrl+K) para navegação e ações
3. Navegação por teclado em listas (setas, Enter, Esc)
4. Atalhos no Deep Work (iniciar pausa, pular, sair)
5. Página ou modal "Atalhos" listando todos (em Ajuda ou Settings)
6. Evitar conflitos com atalhos do browser (onde possível)
7. Suporte a acessibilidade (anúncio de atalhos para leitores de tela)
8. Atalhos customizáveis opcional (salvar preferências)

**Arquivos esperados:**
- `src/hooks/useKeyboardShortcuts.ts` ou `src/lib/shortcuts/registry.ts`
- `src/components/CommandPalette.tsx` (Cmd+K) com busca e ações
- `src/components/ShortcutsHelp.tsx` ou seção em Settings/Ajuda
- Aplicar em layout principal e páginas (War Room, Opportunities, Journal)
- Documentar atalhos no README ou arquivo de ajuda
