C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Checklist de Release e Pré-Deploy

Documentar passos para liberar uma nova versão com qualidade:

1. Criar arquivo `docs/RELEASE_CHECKLIST.md` (ou `RELEASE.md`) com lista verificável antes de cada deploy:
   - [ ] `npm run build` sem erros
   - [ ] Variáveis de ambiente de produção configuradas (VITE_SUPABASE_URL, keys)
   - [ ] Testes passando (`npm run test` se existir)
   - [ ] Sem console.error/aviso de a11y em fluxos principais (opcional: lista de páginas para testar)
   - [ ] Testar login, criar oportunidade, journal, busca global (Cmd+K), mobile header e bottom nav
   - [ ] Verificar que layout não quebrou (sidebar + main, sem overflow horizontal)
2. Versão ou changelog: opcional — arquivo CHANGELOG.md ou tag no Git com número de versão (ex: v1.2.0) e resumo das mudanças
3. Script opcional `scripts/pre-deploy.sh` (ou .ps1 no Windows) que rode build e testes e falhe se algo quebrar; chamável manualmente ou no CI
4. README: secção "Antes de fazer deploy" ou link para RELEASE_CHECKLIST.md
5. Lista curta de "smoke tests" manuais: 5-6 passos que alguém pode seguir em staging/produção após o deploy (ex: abrir app, login, criar item, abrir Cmd+K, trocar tema)
6. Não commitar secrets; garantir que .env não esteja no repositório e que .env.example não tenha valores reais

**Arquivos esperados:**
- `docs/RELEASE_CHECKLIST.md` com checklist e smoke tests
- Opcional: `scripts/pre-deploy.sh` ou `pre-deploy.ps1`
- README atualizado com link para o checklist ou secção de release
- Opcional: `CHANGELOG.md` com formato e uma entrada de exemplo
