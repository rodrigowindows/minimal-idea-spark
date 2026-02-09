C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Monitoramento, Logs e Error Tracking

Melhorar visibilidade de erros e comportamento em produção:

1. Error Boundary global já existe; garantir que capture erros de render e exiba UI amigável (mensagem + botão "Recarregar"); opcionalmente enviar evento para um serviço (ex: console.error com estrutura fixa para futura integração Sentry)
2. Criar utilitário de log (ex: `src/lib/logger.ts`): em dev loga no console; em produção pode ser no-op ou enviar apenas erros; não expor dados sensíveis
3. Tratamento de erros em chamadas críticas: Supabase (auth, realtime), Deepgram, fetch de Edge Functions — sempre catch e mensagem amigável ao usuário (toast ou inline); logar detalhes apenas em dev
4. Remover ou guardar com flag qualquer `console.log` desnecessário em código de produção (hooks, contexts, libs)
5. Opcional: integração com Sentry (ou similar) apenas se VITE_SENTRY_DSN estiver definido; inicialização condicional no `main.tsx`
6. Página de erro 404 e rota * já devem mostrar NotFound; garantir que erros de rede em rotas críticas não quebrem a app (fallback de dados)

**Arquivos esperados:**
- `src/lib/logger.ts` (ou equivalente) com log/error condicional por env
- Revisão de `ErrorBoundary` e uso em App/AppLayout
- Tratamento de erro em 2-3 pontos críticos (auth, transcribe, sync) com mensagem ao usuário
- README ou comentário sobre como ativar Sentry no futuro (opcional)
