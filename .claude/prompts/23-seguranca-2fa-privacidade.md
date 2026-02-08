C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Segurança, 2FA e Privacidade

Reforçar segurança e conformidade (LGPD/privacidade):

1. Autenticação em dois fatores (2FA/TOTP) via Supabase Auth
2. Gerenciamento de sessões ativas (listar e revogar dispositivos)
3. Histórico de logins (data, IP, dispositivo)
4. Política de senha forte e expiração opcional
5. Opção de exportar dados pessoais (LGPD – direito de portabilidade)
6. Opção de exclusão de conta e dados (LGPD – direito ao esquecimento)
7. Preferências de privacidade (analytics, compartilhamento)
8. Criptografia de campos sensíveis no banco quando aplicável

**Arquivos esperados:**
- `src/pages/Settings.tsx` ou `Security.tsx` com seções 2FA, Sessões, Privacidade
- `src/components/Security/Enable2FAModal.tsx`, `SessionsList.tsx`
- `src/lib/auth/2fa.ts`, `src/lib/auth/sessions.ts`
- Migrações ou RLS para auditoria de acesso se necessário
- Documentação de fluxo de exclusão de conta e exportação de dados
