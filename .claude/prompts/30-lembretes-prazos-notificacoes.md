C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Lembretes, Prazos e Notificações por Data

Datas e follow-up em oportunidades e journal:

1. Campo de data/prazo em oportunidades (due date) e lembretes opcionais
2. Notificação no dia (ou X dias antes) via centro de notificações e/ou email
3. Filtros por "vencendo hoje", "atrasado", "esta semana"
4. Badge ou indicador visual de atraso nas listas
5. Lembretes para entradas de journal (ex: lembrete diário para escrever)
6. Integração com calendário (04): mostrar prazos como eventos
7. Agendamento de notificação ao criar/editar oportunidade
8. Preferência de usuário: ativar/desativar lembretes por email ou in-app

**Arquivos esperados:**
- Migração: colunas `due_date`, `reminder_at` em opportunities (ou tabela `reminders`)
- `src/components/OpportunityForm.tsx` com date picker e opção de lembrete
- `src/lib/notifications/reminders.ts` (agendar e disparar)
- Edge function ou cron para enviar lembretes (ex: `send-reminders`)
- Filtros em listagem de oportunidades por prazo
- Seção em Settings para preferências de lembretes
