C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Empty States, 404 e Loading Consistentes

Padronizar estados vazios, erro e carregamento em todo o app:

1. Usar o componente `EmptyState` em todas as listagens quando não houver dados (Opportunities, Journal, Habits, Goals, Notifications, Templates, Version History, etc.) com mensagem e ação contextual (ex: "Nenhuma oportunidade" + "Criar primeira oportunidade")
2. 404 (NotFound): layout alinhado ao app (mesmo header/sidebar ou tela cheia com link para Home e para Settings), texto e botões em i18n
3. Loading: skeleton ou spinner consistente; preferir skeleton nas listagens (cards/linhas) já usado em algumas páginas
4. Error Boundary: garantir que todas as rotas estejam dentro de um Error Boundary com fallback amigável (mensagem, "Recarregar", "Voltar ao início") e log opcional
5. Estado de erro de rede/API: toast ou banner reutilizável (ex: "Não foi possível carregar. Tente novamente.") com retry
6. Empty state para busca sem resultados (ex: "Nenhum resultado para X" com sugestão de limpar filtros)
7. Documentar padrões em comentário ou storybook: quando usar EmptyState vs skeleton vs spinner
8. Acessibilidade: aria-live para loading e empty, role="alert" para erros

**Arquivos esperados:**
- Revisão de todas as páginas que listam dados: usar `EmptyState` com ícone e ação
- `src/pages/NotFound.tsx` (redesign com i18n, links, opcionalmente layout)
- `src/components/ErrorFallback.tsx` (fallback do ErrorBoundary com ações)
- `src/components/LoadingSkeleton.tsx` ou variantes por tipo de lista (card, table)
- `src/App.tsx` ou `AppLayout`: ErrorBoundary envolvendo Outlet com fallback
- Chaves de tradução para empty states e 404
