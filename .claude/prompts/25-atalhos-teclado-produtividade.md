C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Atalhos de Teclado e Produtividade

Sistema centralizado de atalhos para uso rápido:

1. Atalhos globais: N = Nova captura/opportunity, J = Journal, C = Consultant, / = Busca, ? = Abrir ajuda de atalhos
2. Atalhos por página quando relevante (ex: no Consultant Enter para enviar, no Calendar setas para navegar)
3. Modal ou drawer "Atalhos" (?) listando todos, com busca
4. Evitar conflito com atalhos do navegador (Ctrl+K, etc.) ou documentar exceções
5. Persistir preferências de atalhos customizáveis (opcional: em Settings)
6. Indicador visual de "focus" em elementos focáveis (focus-visible)
7. Atalho para Deep Work e para fechar modais (Escape)
8. Integrar com o onboarding: mostrar atalhos na primeira vez

**Arquivos esperados:**
- `src/hooks/useKeyboardShortcuts.ts` (registrar callbacks por key, cleanup)
- `src/contexts/ShortcutContext.tsx` ou provider que registra atalhos globais
- `src/components/KeyboardShortcutsHelp.tsx` (já pode existir) expandir com lista completa e busca
- Documentar atalhos no README ou em Help
- Atualizar páginas principais para usar atalhos (Dashboard, Consultant, Journal, etc.)
- Garantir que Escape feche modais/drawers (verificar componentes ui)
