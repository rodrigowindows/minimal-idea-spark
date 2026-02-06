C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa


# Sistema de Múltiplas Contas e Compartilhamento

Implemente sistema para criar contas separadas e compartilhar dashboards:

1. Crie modelo de Organizations/Workspaces
2. Permita usuário criar múltiplas contas/workspaces
3. Sistema de convites por email
4. Permissões (owner, admin, editor, viewer)
5. Switcher de contas no header
6. Compartilhamento de dashboards específicos
7. Links de compartilhamento públicos/privados
8. Log de atividades por workspace

**Arquivos esperados:**
- `lib/db/schema-organizations.ts`
- `components/WorkspaceSwitcher.tsx`
- `components/InviteMembers.tsx`
- `app/[workspace]/page.tsx`
- `supabase/functions/invite-member/index.ts`
