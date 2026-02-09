C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Unificar i18n e Traduções

Um único sistema de tradução no app para evitar "useTranslation is not defined" e inconsistência:

1. Decidir uma fonte de verdade: **LanguageContext** (já usado em Dashboard, Sidebar, ReportsPage) ou **react-i18next** (usado em muitas páginas). Recomendação: manter LanguageContext como único; migrar todas as páginas que usam `useTranslation` de 'react-i18next' para `@/contexts/LanguageContext'
2. Expandir o objeto `translations` em `LanguageContext.tsx` com todas as chaves usadas no app: layout.*, nav.*, dashboard.*, common.*, a11y.*, etc. (pt-BR, en, es)
3. Remover ou desativar o uso de react-i18next: remover import de `./i18n` do main.tsx se não for mais necessário; ou manter i18n apenas para libs que exijam (e mapear language do context para i18n.changeLanguage)
4. Garantir que Settings (ou onde o usuário troca idioma) chame setLanguage do LanguageContext e, se i18n permanecer, sincronize i18n.language
5. Buscar em todo o projeto por `useTranslation` de 'react-i18next' e substituir por useTranslation/useLanguage de LanguageContext; adicionar chaves faltantes em translations
6. Testes e componentes que mockam useTranslation: atualizar para mockar LanguageContext ou o hook de @/contexts/LanguageContext

**Arquivos esperados:**
- `src/contexts/LanguageContext.tsx`: objeto translations completo com chaves usadas nas páginas
- Todas as páginas/componentes que importavam react-i18next passando a usar @/contexts/LanguageContext
- `src/main.tsx`: remover ou condicionar import de i18n
- Opcional: arquivos JSON de tradução externos se preferir manter chaves fora do código (ler no context)
