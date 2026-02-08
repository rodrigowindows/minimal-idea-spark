C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Fluxo de Telas: Breadcrumbs, Voltar e Deep Links

Melhorar orientação e links diretos para itens:

1. Breadcrumbs em páginas internas (ex: Home > Oportunidades > [Título da oportunidade], Home > Journal > 08/02/2025)
2. Rotas com ID: `/opportunities/:id` para abrir oportunidade direto (dialog ou página); `/journal/:date` para abrir dia no journal
3. Botão "Voltar" consistente no header quando aplicável (voltar para listagem ou página anterior)
4. Ao compartilhar link (SharedView já existe): garantir que links internos em emails/notificações usem `/opportunities/:id` ou `/shared/:token`
5. Transição suave entre páginas (opcional: animação leve de fade/slide com framer-motion)
6. Scroll ao topo ao trocar de rota
7. Estado da listagem preservado ao voltar (ex: filtros em Opportunities) quando possível (scroll restoration)
8. 404 com breadcrumb "Home" e links para Dashboard e Settings

**Arquivos esperados:**
- `src/components/layout/PageBreadcrumbs.tsx` (usa useLocation e match de rotas)
- Rotas em `App.tsx`: `/opportunities/:id`, `/journal/:date` (ou query ?date=)
- Páginas ou wrappers que leem params e abrem dialog/panel correspondente
- `src/components/layout/BackButton.tsx` ou uso de useNavigate(-1) com fallback
- Ajuste em `NotFound.tsx` com breadcrumb e i18n
- Scroll to top: hook `useScrollToTopOnRouteChange` ou efeito no layout
