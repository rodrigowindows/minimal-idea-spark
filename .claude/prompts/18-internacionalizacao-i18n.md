C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Internacionalização (i18n) Completa

Suporte a múltiplos idiomas em toda a aplicação:

1. Integrar biblioteca de i18n (react-i18next + i18next)
2. Arquivos de tradução para pt-BR e en (e opcionalmente es)
3. Troca de idioma no Settings e persistir preferência
4. Traduzir todas as strings da UI (labels, botões, mensagens, placeholders)
5. Formatação de datas e números por locale
6. Traduzir mensagens de erro e validação
7. Suporte RTL opcional (preparar estrutura)
8. Traduzir conteúdo do Deep Work e do Consultant (mensagens fixas)

**Arquivos esperados:**
- `src/i18n/index.ts` ou `src/lib/i18n.ts`
- `src/locales/pt-BR.json`, `src/locales/en.json`
- Atualizar `LanguageContext.tsx` para usar i18next
- Componente ou seção em Settings para escolher idioma
- Uso de `useTranslation()` nos componentes principais
