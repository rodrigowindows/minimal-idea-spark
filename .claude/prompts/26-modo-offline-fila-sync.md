C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Modo Offline, Fila de Sync e Conflitos

Completar experiência offline do PWA:

1. Fila de ações pendentes quando offline (criar oportunidade, journal, etc.) com persistência em IndexedDB ou localStorage
2. Ao voltar online: enviar fila na ordem e mostrar progresso (toast ou barra "Sincronizando X itens")
3. Tratamento de conflitos: quando servidor rejeitar ou houver versão mais nova, mostrar opção "Manter meu" / "Usar do servidor" ou mesclar
4. Indicador persistente de status: online / offline / sincronizando (ícone no header ou sidebar)
5. Páginas críticas com dados locais funcionando offline (Dashboard, Journal, Opportunities com cache)
6. Service Worker atualizado para cache de assets e estratégia de fallback
7. Testes manuais documentados: ir offline, criar item, voltar online, ver sync
8. Opção em Settings: "Limpar fila pendente" ou "Ver itens na fila"

**Arquivos esperados:**
- `src/lib/pwa/sync-queue.ts` (enqueue, process, persist queue)
- `src/hooks/useSyncStatus.ts` (online, syncing, pendingCount, lastError)
- `src/components/SyncStatusIndicator.tsx` (ícone + tooltip ou barra)
- Integrar fila com criação/edição de oportunidades e journal (e outros que usem backend)
- Atualizar `lib/pwa/offline-manager.ts` para usar a fila
- `public/sw.js` ou estratégia de cache revisada
- Seção em Settings "Sincronização" com status e botão limpar fila (se houver itens)
