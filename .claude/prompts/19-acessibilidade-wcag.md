C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Acessibilidade (WCAG)

Tornar o app acessível conforme WCAG 2.1 nível AA:

1. Navegação por teclado em todas as telas (tab order, focus visible)
2. Atributos ARIA onde necessário (roles, labels, live regions)
3. Contraste de cores adequado (verificar com ferramenta)
4. Textos alternativos em ícones e imagens
5. Skip links para conteúdo principal
6. Focus trap em modais e drawers
7. Anúncios para leitores de tela em ações dinâmicas (toast, notificações)
8. Redução de movimento respeitando prefers-reduced-motion
9. Formulários com labels associados e mensagens de erro acessíveis

**Arquivos esperados:**
- `src/components/SkipLink.tsx` ou similar
- Revisão de componentes shadcn/ui para ARIA/labels
- `src/index.css` ou tema com focus-visible e reduced-motion
- Documento ou comentários com checklist WCAG aplicado
