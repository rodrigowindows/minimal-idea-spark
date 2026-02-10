# Checklist de release (pré-deploy)

Verificar antes de cada deploy:

- [ ] `npm run build` conclui sem erros
- [ ] Variáveis de produção configuradas (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY; opcional: VITE_DEEPGRAM_API_KEY, VITE_OPENAI_API_KEY)
- [ ] Testes passando: `npm run test` (e `npm run test:e2e` se disponível)
- [ ] Sem erros/avisos de a11y em fluxos principais (ex.: abrir Dashboard, Command Palette, gravar áudio)
- [ ] Layout estável: sidebar + main sem overflow horizontal; mobile com header e bottom nav
- [ ] Smoke manual: login → criar oportunidade → abrir Cmd+K → trocar tema
- [ ] (Opcional) Rodar script: `scripts/pre-deploy.ps1`
- [ ] (Opcional) Rodar script: `scripts/pre-deploy.sh`

## Smoke tests manuais (pós-deploy)

1. Abrir o app e fazer login (ou usar modo anônimo se permitido).
2. Criar uma oportunidade e ver na lista.
3. Abrir Command Palette (Ctrl+K / Cmd+K) e buscar.
4. Trocar tema (dark/light) e conferir se aplica.
5. Em mobile: abrir menu, bottom nav e gravar áudio (se configurado).
6. Conferir 404: acessar rota inexistente e ver tela NotFound com link para Home.

## Segurança

- Não commitar `.env`; usar apenas `.env.example` com placeholders.
- Secrets das Edge Functions apenas no Supabase Dashboard.
