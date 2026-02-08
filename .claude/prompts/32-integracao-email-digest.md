C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Integração com Email e Digest

Usar email para capturar ideias e receber resumos:

1. Endereço de email único por usuário/workspace para "enviar ideia" (ex: capture@... ou via Resend/SendGrid inbound)
2. Ao receber email, criar oportunidade ou entrada de journal (assunto = título, corpo = descrição)
3. Digest semanal ou diário por email: resumo de oportunidades, wins do journal, métricas
4. Preferências: ativar/desativar digest, frequência (diário/semanal), conteúdo
5. Link "Adicionar ao Idea Spark" em emails (bookmarklet ou extensão) que abre o app com pré-preenchido
6. Confirmação de recebimento ao enviar ideia por email
7. Parsing básico: anexos como link, tags no assunto com #tag
8. Rate limit e segurança (validar que o email é do usuário)

**Arquivos esperados:**
- Edge function para webhook de email inbound (Resend, SendGrid, etc.)
- `src/lib/email/inbound.ts` (parse e criar opportunity/journal)
- `src/lib/email/digest.ts` (montar e enviar digest)
- Cron ou scheduled function para enviar digest
- Settings: email de captura, preferências de digest
- Tabela ou config para mapear email → user/workspace
