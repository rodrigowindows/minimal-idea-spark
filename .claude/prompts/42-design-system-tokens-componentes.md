C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Design System: Tokens e Componentes Base

Padronizar tokens visuais e uso consistente de componentes:

1. Revisar `src/index.css`: variáveis CSS (--background, --primary, --radius, --sidebar-*) já existem; garantir que todos os componentes usem essas variáveis e não cores hardcoded (exceto quando necessário)
2. Criar ou consolidar tokens de espaçamento: usar escala consistente (4, 8, 12, 16, 24, 32) via Tailwind; evitar valores arbitrários em componentes compartilhados
3. Tipografia: uma ou duas fontes (ex: system-ui + uma para títulos); aplicar em `index.css` e em PageHeader/títulos; tamanhos consistentes (text-sm, text-base, text-lg para títulos)
4. Componentes em `src/components/ui/`: garantir que Button, Input, Card, Dialog usem as variáveis do tema (dark/light já suportado); documentar variantes principais em comentário no topo do arquivo
5. Ícones: uso consistente de lucide-react; mesmo tamanho em listas (ex: h-4 w-4 ou h-5 w-5); aria-hidden onde for decorativo
6. Bordas e radius: usar `border-border`, `rounded-lg` (ou --radius); evitar mistura de rounded-md e rounded-xl sem critério

**Arquivos esperados:**
- `src/index.css`: comentários nas variáveis; opcional escala de spacing documentada
- Revisão de 2-3 componentes em `src/components/ui/` para garantir uso de tokens
- Nenhum hex/rgb hardcoded em componentes base; usar hsl(var(--x))
