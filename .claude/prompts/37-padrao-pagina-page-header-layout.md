C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Padrão de Página: PageHeader e Layout Consistente

Componente reutilizável para cabeçalho e layout de conteúdo:

1. Criar `PageHeader`: recebe título, descrição opcional, breadcrumb opcional, ações (botões/dropdown) à direita, e slot para tabs quando necessário
2. Layout de conteúdo: padding consistente (ex: p-6 md:p-8), max-width opcional para leitura (ex: analytics e journal), e área de filtros abaixo do header quando aplicável
3. Aplicar PageHeader em todas as páginas principais (Dashboard pode manter header customizado; Opportunities, Journal, Analytics, Habits, Goals, Calendar, Settings, etc. usam o padrão)
4. Variantes: "hero" (título grande como Dashboard), "compact" (uma linha título + ações), "withTabs" (título + tabs)
5. Responsivo: em mobile, ações podem ir para menu ou ficar abaixo do título
6. Slot para busca ou filtro global da página (ex: Opportunities com search no header)
7. Documentar uso no código (JSDoc) ou em README interno
8. Garantir que SkipLink e foco voltem ao título da página quando apropriado (acessibilidade)

**Arquivos esperados:**
- `src/components/layout/PageHeader.tsx` (title, description, breadcrumb?, actions?, children/tabs?)
- `src/components/layout/PageContent.tsx` ou convenção de classe/wrapper para conteúdo (padding, max-w)
- Atualizar cada página para usar PageHeader onde fizer sentido (Opportunities, Journal, Analytics, Habits, Goals, Settings, Consultant, etc.)
- Manter Dashboard com layout próprio mas possível uso de PageHeader para consistência de acessibilidade
