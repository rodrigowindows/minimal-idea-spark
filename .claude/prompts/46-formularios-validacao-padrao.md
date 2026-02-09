C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Formulários e Validação (Padrão Único)

Padronizar formulários para acessibilidade, validação e UX:

1. Escolher uma abordagem: React Hook Form + Zod (ou apenas estado controlado + validação manual). Se já existir uso de RHF ou Zod no projeto, padronizar neles
2. Inputs acessíveis: todo input com label associado (id + htmlFor ou Label do Radix); mensagens de erro com aria-describedby ou aria-errormessage; obrigatório com aria-required e indicador visual
3. Padrão de erro: exibir mensagem abaixo do campo em texto de destaque (text-destructive); não apenas border vermelha
4. Botão de submit: desabilitar durante submit (loading) e mostrar estado de loading (spinner ou "Salvando..."); evitar double submit
5. Criar componente opcional `FormField` que encapsula Label + Input + Error message e aceita nome, tipo, validação (Zod schema ou regras)
6. Aplicar o padrão em pelo menos 2 formulários existentes (ex: Settings, criar oportunidade, ou modal de convite) como referência para os demais

**Arquivos esperados:**
- `src/components/ui/FormField.tsx` (ou integração com componente existente) com Label, Input, Error
- Uso de validação (Zod ou função) em um formulário crítico com mensagens em pt-BR
- Documentação breve no código (JSDoc) ou em docs sobre como criar novos formulários
