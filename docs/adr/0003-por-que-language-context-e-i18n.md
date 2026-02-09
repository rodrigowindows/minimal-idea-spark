# ADR 0003: Por que LanguageContext e i18n

## Status

Aceito

## Contexto

O app precisa de múltiplos idiomas (pt-BR, en, es). Parte do código usava react-i18next e parte um context próprio (LanguageContext).

## Decisão

Manter LanguageContext como fonte de verdade para a UI principal (Dashboard, Sidebar, etc.), com objeto `translations` por idioma. O react-i18next permanece em algumas páginas; o objetivo de longo prazo é unificar em um único sistema (ver prompt 44).

## Consequências

- Positivas: controle simples, sem dependência de arquivos externos para as chaves principais; troca de idioma imediata.
- Negativas: duplicação de chaves enquanto existirem dois sistemas; risco de "useTranslation is not defined" se um componente usar o hook errado.
- Neutras: chaves no formato `namespace.key` (ex: dashboard.title) para facilitar migração futura.
