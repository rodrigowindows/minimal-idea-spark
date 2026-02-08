C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Segurança, Sessão e Gestão de Convites

Reforçar segurança e controle de acesso:

1. Timeout de sessão configurável (ex: 30 min inatividade) com aviso antes de deslogar
2. Refresh de token Supabase antes de expirar
3. Convites com data de expiração (ex: 7 dias) e opção de revogar
4. UI por permissão: esconder ou desabilitar ações para roles viewer/editor (owner/admin vê tudo)
5. Log de atividades sensíveis por workspace (quem convidou, quem aceitou, alteração de role)
6. Opção "Sair de todos os dispositivos" nas configurações
7. Validação de token de convite na rota /invite/:token (expirado, já usado)
8. Mensagens claras quando acesso é negado (403)

**Arquivos esperados:**
- `src/lib/auth/session-utils.ts` (timeout, refresh)
- `src/hooks/useSessionTimeout.ts` ou lógica no AuthContext
- Atualizar `supabase/functions/invite-member/index.ts` com expiração e revogação
- `src/lib/db/schema-organizations.ts` ou tipos com expires_at, revoked para convites
- Componente ou seção em Workspace/Settings para "Convites ativos" e revogar
- `src/components/Unauthorized.tsx` ou página 403
- Atualizar rotas/páginas para checar role e mostrar Unauthorized quando aplicável
