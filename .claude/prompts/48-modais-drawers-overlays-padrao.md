C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Modais, Drawers e Overlays (Padrão e A11y)

Uso consistente e acessível de diálogos e painéis:

1. Sempre usar o componente Dialog/Sheet do `src/components/ui/` (Radix); não criar modais com div + position fixed solto
2. Cada DialogContent deve ter DialogTitle visível ou para leitores de tela; e DialogDescription ou aria-describedby={undefined} para suprimir aviso (já ajustado no dialog.tsx)
3. Foco: ao abrir, foco no primeiro elemento interativo (botão primário ou input); ao fechar, devolver foco ao elemento que abriu (Radix já faz; garantir que o trigger tenha ref se necessário)
4. Teclado: Esc fecha; não capturar Tab fora do modal (focus trap já vem do Radix)
5. Sheet (drawer) mobile: mesma regra de título/descrição; lado (left/right) consistente — menu principal left, detalhes opcional right
6. Overlays de fullscreen (ex: Deep Work): garantir que tenham role e que o foco não escape para a página por baixo; botão de sair sempre visível e acessível
7. Revisar 2-3 modais existentes (Settings modal, CommandPalette, CustomizeWarRoomModal) e garantir que seguem o padrão; corrigir qualquer que ainda mostre aviso de a11y no console

**Arquivos esperados:**
- `src/components/ui/dialog.tsx` e `sheet.tsx`: já com aria-describedby; documentar em comentário o uso de DialogTitle + DialogDescription
- Revisão de pelo menos 2 modais com falta de título/descrição e correção
- Opcional: componente wrapper Modal que exige title e optional description para padronizar
