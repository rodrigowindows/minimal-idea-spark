C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# War Room – Widgets Customizáveis

Permitir que o usuário personalize o dashboard (War Room):

1. Mostrar/ocultar widgets (Smart Capture, The One Thing, Radar, XP, Time Blocking, etc.)
2. Reordenar widgets por arrastar e soltar (drag and drop)
3. Persistir layout por usuário (localStorage ou perfil no Supabase)
4. Tamanho de widget opcional (compacto / normal / grande) onde fizer sentido
5. Modal ou painel "Customizar War Room" para gerenciar visibilidade e ordem
6. Layout responsivo: ordem e visibilidade podem variar em mobile
7. Restaurar layout padrão com um clique
8. Novos widgets futuros entram na lista de opções automaticamente

**Arquivos esperados:**
- `src/contexts/WarRoomLayoutContext.tsx` ou estado em Settings
- `src/components/WarRoom/WidgetGrid.tsx` com drag-and-drop (dnd-kit ou similar)
- `src/components/WarRoom/CustomizeWarRoomModal.tsx`
- Schema ou JSON em user profile para layout (widget_ids, order, visibility)
- Atualizar página War Room para usar layout salvo
