# Prompt 3: Retry logic no worker Node (config + backoff)

No script scripts/nightworker-worker-daemon.ts: (1) Torne configurável o número máximo de tentativas de processamento (WORKER_MAX_RETRIES, padrão 3) e a base do backoff exponencial (WORKER_RETRY_BACKOFF_MS, padrão 60000). (2) Use backoff exponencial com jitter nas retentativas. (3) Não retente em erros permanentes (4xx, exceto 429). (4) Documente no cabeçalho do arquivo as variáveis WORKER_MAX_RETRIES e WORKER_RETRY_BACKOFF_MS.

---
Fim do prompt
