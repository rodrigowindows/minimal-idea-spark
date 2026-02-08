C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Temas, Personalização e Dark Mode

Permitir que o usuário personalize aparência e tema:

1. Tema claro, escuro e sistema (seguir preferência do OS)
2. Persistir preferência de tema (localStorage ou perfil)
3. Toggle de tema acessível no header ou settings
4. Cores de destaque customizáveis (primary, accent) opcional
5. Densidade de UI (compacto / confortável / espaçado)
6. Fonte e tamanho de fonte opcionais para acessibilidade
7. Aplicar tema em todos os componentes (shadcn + Tailwind)
8. Transição suave ao trocar tema

**Arquivos esperados:**
- `src/contexts/ThemeContext.tsx` ou uso de `next-themes` / provider custom
- `src/components/ThemeToggle.tsx`, `ThemeSettings.tsx` em Settings
- Variáveis CSS ou Tailwind para cores (--primary, etc.)
- `tailwind.config.ts` com darkMode: 'class' e variáveis
- Preferências salvas em user profile ou localStorage
