C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Estado Global, Cache e Persistência

Organizar onde e como o estado é guardado para evitar duplicação e inconsistência:

1. Listar contextos atuais (AppContext, AuthContext, RealtimeContext, ThemeContext, WarRoomLayoutContext, LanguageContext, WorkspaceProvider): documentar em comentário ou docs qual é a responsabilidade de cada um e que dados persistem (localStorage, Supabase, só memória)
2. Dados que devem persistir entre sessões: tema (dark/light), idioma, layout do War Room (order/visible), sidebar colapsada — garantir que estejam em localStorage ou Supabase e que a leitura inicial seja síncrona ou com fallback para não piscar UI
3. React Query (QueryClient): já usado; garantir que staleTime/gcTime estejam configurados e que queries críticas tenham key consistente; evitar fetches duplicados na mesma tela
4. Cache de busca/histórico: useSearch e semantic-search já usam localStorage para search_history quando a tabela não existe; manter essa estratégia e documentar
5. Sincronização offline (fila de sync): se já existir, garantir que o estado "pending" seja visível e que não haja perda de dados ao voltar online
6. Não criar novos contextos globais sem necessidade; preferir estado local + lift quando uma única árvore precisar; se um dado for usado em 3+ lugares distantes, aí sim considerar context ou store

**Arquivos esperados:**
- Documento curto em `docs/STATE.md` ou secção no ARCHITECTURE listando contextos e persistência
- Revisão de um contexto que persiste (ex: ThemeContext ou WarRoomLayoutContext) para garantir hidratação sem flash
- React Query config em App.tsx revisada (opcional: keys centralizadas em constante)
