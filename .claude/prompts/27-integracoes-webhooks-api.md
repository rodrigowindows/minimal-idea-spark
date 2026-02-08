C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Integrações Externas, Webhooks e API

Conectar o app a ferramentas externas e automações:

1. API key por usuário/workspace para acesso programático (leitura/escrita)
2. Webhooks de saída: notificar URL externa em eventos (nova oportunidade, status alterado, journal)
3. Página de gerenciamento: criar/revogar API keys e configurar webhooks
4. Documentação mínima da API (endpoints, auth, exemplos) em /api-docs ou markdown
5. Rate limiting e logs de uso da API
6. Integração opcional com Zapier/Make (webhooks como trigger ou action)
7. Importação via API (criar oportunidades em lote a partir de CSV/JSON)
8. Webhooks de entrada opcional (receber dados de serviços externos para criar itens)

**Arquivos esperados:**
- `src/pages/Settings.tsx` ou `Integrations.tsx` com API keys e webhooks
- `src/lib/api/keys.ts`, `src/lib/api/webhooks.ts`
- Edge functions: `supabase/functions/api-auth/index.ts`, `supabase/functions/webhook-deliver/index.ts`
- Tabelas: `api_keys`, `webhook_endpoints`, `webhook_logs`
- Documentação em `docs/api.md` ou rota estática com exemplos
