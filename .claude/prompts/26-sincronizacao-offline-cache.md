C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Sincronização Offline e Cache

Usar o app sem conexão e sincronizar quando voltar online:

1. Service Worker já existe (PWA); garantir cache de assets e rotas críticas
2. Cache local de oportunidades, journal e knowledge base (IndexedDB ou similar)
3. Fila de operações offline (criar/editar/excluir) e sincronizar ao reconectar
4. Indicador visual de status: online / offline / sincronizando
5. Resolução de conflitos na sync (timestamp, last-write-wins ou merge manual)
6. Leitura de dados em modo offline a partir do cache
7. Mensagens claras quando ação requer conexão (ex: AI, upload)
8. Opção de "forçar atualização" para limpar cache e recarregar

**Arquivos esperados:**
- `src/lib/offline/sync-manager.ts` ou uso de lib (e.g. Dexie + sync)
- `src/lib/offline/queue.ts` para operações pendentes
- `src/contexts/NetworkStatusContext.tsx` (online/offline/syncing)
- Atualização de `public/sw.js` para estratégias de cache
- Componente `OfflineBanner.tsx` ou indicador no header
- Persistência local (Dexie, idb, ou Supabase local cache se disponível)
