C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Deploy, Build e CI/CD

Garantir build estável e pipeline de deploy:

1. Script de build (`npm run build`) sem erros; configurar `vite.config` com base correta (ex: `base: '/'` ou subpath se necessário) e chunk split sensato
2. Variáveis de ambiente no build: usar apenas `VITE_*` no client; documentar em README o que é obrigatório para produção (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_DEEPGRAM_API_KEY opcional)
3. GitHub Actions (ou similar): workflow que rode `npm ci`, `npm run build` e testes em PR/push para main
4. Deploy: instruções ou script para deploy em Vercel/Netlify/Supabase (static); ou documento `docs/DEPLOY.md` com passos
5. Evitar quebrar layout em produção: garantir que Tailwind/CSS estejam incluídos no build e que não haja referências a `localhost` hardcoded
6. Build de produção com source maps opcionais (desativados por padrão para tamanho) e sem console.log desnecessários em libs críticas

**Arquivos esperados:**
- `vite.config.ts` revisado (base, build.outDir, rollupOptions se necessário)
- `.github/workflows/build.yml` ou `ci.yml` (install, lint, test, build)
- `docs/DEPLOY.md` ou secção no README com passos de deploy
- README com variáveis de ambiente de produção
