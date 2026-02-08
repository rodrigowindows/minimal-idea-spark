C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Empty States, Loading e Tratamento de Erros

Melhorar feedback visual em todos os cenários:

1. Empty state em cada página principal quando não há dados (Opportunities, Journal, Habits, Goals, Calendar, Notifications, Templates, Images, Version history)
2. Ilustração ou ícone + texto explicativo + CTA (ex: "Nenhuma oportunidade ainda. Clique para capturar a primeira.")
3. Loading states consistentes: skeleton ou spinner por seção, não tela branca
4. Error Boundary global que captura erros de render e mostra tela de fallback com "Tentar novamente"
5. Error Boundary por rota ou por área (ex: Consultant, Automation) onde fizer sentido
6. Mensagens de erro amigáveis (rede, 500, timeout) com sugestão de ação
7. Retry automático ou botão "Tentar novamente" em chamadas de API falhas
8. Estado "offline" visível (banner ou toast) quando PWA detectar falta de rede

**Arquivos esperados:**
- `src/components/EmptyState.tsx` (reutilizável: ícone, título, descrição, ação)
- `src/components/ErrorBoundary.tsx` (fallback UI, botão retry, opcional log)
- Uso de ErrorBoundary em `App.tsx` ou no router
- `src/components/LoadingSkeleton.tsx` ou skeletons por página (ex: DashboardSkeleton)
- Aplicar EmptyState nas páginas listadas acima onde já existir lista vazia
- `src/hooks/useOnlineStatus.ts` ou uso de evento online/offline para banner
- Atualizar componentes que fazem fetch para mostrar loading e erro de forma consistente
