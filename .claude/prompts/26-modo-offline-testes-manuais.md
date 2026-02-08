# Testes manuais: Modo offline e sincronização

## 1. Ir offline, criar item, voltar online, ver sync

1. Abra o app (Dashboard, Journal ou Opportunities).
2. No Chrome DevTools: **Application** → **Service Workers** (ou **Network** → throttling **Offline**).
3. Ative **Offline** (ou use "Offline" no throttling da aba Network).
4. Verifique:
   - Barra amarela no topo: "Você está offline..."
   - Ícone de nuvem no header/sidebar indica offline (ícone CloudOff).
5. Crie uma **nova entrada no Journal** (conteúdo + humor + energia → Salvar).
   - Deve aparecer "Journal entry saved!" e o item na lista.
6. Ou crie uma **nova oportunidade** (Opportunities → botão + → preencher → Salvar).
   - Deve aparecer "Opportunity created!" e o item na lista.
7. Volte para **Online** (desmarque Offline no DevTools).
8. Verifique:
   - Toast ou indicador "Sincronizando X itens..." (se houver fila).
   - Após alguns segundos, ícone volta a "Online" e a fila esvazia.
9. Em **Settings** → **Sincronização**: status "Online" e "Na fila" vazio (ou 0 itens).

## 2. Ver itens na fila e limpar fila

1. Com o app **offline**, crie 2 entradas de journal (ou 2 oportunidades).
2. Vá em **Settings** → **Sincronização**.
3. Deve mostrar "Na fila: 2 itens" (ou similar).
4. Clique em **Ver itens na fila**: deve abrir um modal listando os 2 itens (create_daily_log / create_opportunity + localId).
5. Opcional: clique em **Limpar fila pendente** → confirmar. A fila deve zerar (os itens continuam no estado local; apenas a sincronização pendente é descartada).
6. Volte online: não deve haver sincronização para esses itens se a fila foi limpa.

## 3. Conflitos (Manter meu / Usar do servidor)

Conflitos aparecem quando o servidor rejeita um item (ex.: duplicata) ou há versão mais nova no servidor.

1. Com **offline**, crie um journal ou oportunidade.
2. Volte **online** e deixe a sync rodar. Se o backend retornar conflito (ex.: regra de negócio ou constraint), o item pode ir para a lista de **conflitos**.
3. Em **Settings** → **Sincronização** → **Ver itens na fila**, se houver conflitos, cada um terá:
   - **Manter meu**: reenvia o item para a fila (tentará sincronizar de novo).
   - **Usar do servidor**: descarta o conflito e mantém o que está no servidor.

## 4. Indicador persistente (header/sidebar)

- **Offline**: ícone de nuvem cortada (CloudOff); tooltip "Offline".
- **Online, fila vazia**: ícone de nuvem (Cloud); tooltip "Online".
- **Sincronizando**: ícone de loading (Loader2); tooltip "Sincronizando X itens...".
- **Online com itens na fila**: ícone de nuvem; tooltip com quantidade pendente.

## 5. Páginas críticas offline (cache)

1. Com o app já carregado, vá para **Dashboard**, **Journal**, **Opportunities**.
2. Fique **offline**.
3. Navegue entre essas páginas: devem carregar (SPA + cache do Service Worker).
4. Dados locais (lista de journal, oportunidades, etc.) vêm do estado/localStorage; devem aparecer normalmente.
5. Novas criações (journal, oportunidade) entram na fila e aparecem na lista local.

## 6. Mapeamento localId → serverId

1. Crie uma **oportunidade offline** e depois volte **online** para sincronizar.
2. Depois de sincronizada, **edite** essa oportunidade (ex.: mude o título) ainda online ou offline.
3. Se estiver offline, a alteração entra na fila; ao voltar online a sync usa o mapeamento (localId → UUID no servidor) e o update é aplicado no registro correto.
4. Em **Settings** → **Sincronização**, o botão **Limpar mapeamento de IDs** remove esse mapeamento (use só em caso de problemas).

## 7. Service Worker e cache

1. **Application** → **Cache Storage**: deve existir cache `canvas-v3-static`, `canvas-v3-dynamic`, `canvas-v3-api`.
2. Com **offline**, recarregar a página: a app deve abrir (fallback para index.html em navegação).
3. Assets estáticos (JS, CSS, imagens) devem ser servidos do cache (estratégia cache-first para estáticos).

## Arquivos principais

- `src/lib/pwa/sync-queue.ts` – Fila e conflitos
- `src/lib/pwa/sync-processor.ts` – Processador Supabase + mapeamento de IDs
- `src/lib/pwa/sync-id-map.ts` – Mapeamento localId → serverId
- `src/hooks/useSyncStatus.ts` – Status e ações de sync
- `src/components/SyncStatusIndicator.tsx` – Indicador no header/sidebar
- `src/lib/pwa/offline-manager.ts` – Conectividade e registro do flush da fila
