C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Performance e Otimização

Otimizar carregamento e uso de recursos:

1. Code splitting por rota (lazy load de páginas com React.lazy + Suspense)
2. Otimizar bundle (analisar com rollup-plugin-visualizer ou similar)
3. Memoização de componentes pesados (React.memo, useMemo, useCallback onde fizer sentido)
4. Virtualização de listas longas (Opportunities, Journal, Notifications)
5. Lazy load de imagens com placeholder
6. Reduzir re-renders desnecessários (verificar contextos)
7. Cache de dados do Supabase (estratégia stale-while-revalidate onde aplicável)
8. Métricas de Core Web Vitals e objetivo de LCP < 2.5s

**Arquivos esperados:**
- Atualizar `src/App.tsx` ou router com lazy loading de rotas
- `src/components/VirtualList.tsx` ou uso de lib (react-window/react-virtuoso)
- Ajustes em `vite.config.ts` se necessário (chunkSplit, etc.)
- Documentar métricas no README ou em comentários
