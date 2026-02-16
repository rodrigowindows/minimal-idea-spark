import type { PipelineTemplate } from '@/types/night-worker'

function nowIso() {
  return new Date().toISOString()
}

function defaultTimestampedTemplate(template: Omit<PipelineTemplate, 'created_at' | 'updated_at'>): PipelineTemplate {
  const now = nowIso()
  return { ...template, created_at: now, updated_at: now }
}

export function getDefaultPipelineTemplates(): PipelineTemplate[] {
  return [
    defaultTimestampedTemplate({
      id: 'tpl-quick-validate',
      name: 'Quick Validate',
      description: 'Gemini valida, Claude confere',
      steps: [
        {
          provider: 'gemini',
          role: 'validate',
          instruction:
            'Analise e valide este pedido. Identifique problemas, edge cases e sugira melhorias:\n\n{input}',
        },
        {
          provider: 'claude',
          role: 'double-check',
          instruction:
            'Revise esta analise de validacao. Confirme ou corrija os pontos levantados:\n\n--- Resultado da Validacao ---\n{previous_result}\n\n--- Pedido Original ---\n{input}',
        },
      ],
    }),
    defaultTimestampedTemplate({
      id: 'tpl-full-pipeline',
      name: 'Full Pipeline',
      description: 'Gemini valida -> Codex implementa -> Claude revisa',
      steps: [
        {
          provider: 'gemini',
          role: 'validate',
          instruction:
            'Analise este pedido. Quebre em etapas claras de implementacao e valide a abordagem:\n\n{input}',
        },
        {
          provider: 'codex',
          role: 'code',
          instruction:
            'Implemente baseado na analise de validacao abaixo:\n\n--- Analise ---\n{previous_result}\n\n--- Pedido Original ---\n{input}',
        },
        {
          provider: 'claude',
          role: 'review',
          instruction:
            'Revise esta implementacao quanto a qualidade, seguranca e corretude:\n\n--- Implementacao ---\n{previous_result}\n\n--- Pedido Original ---\n{input}',
        },
      ],
    }),
    defaultTimestampedTemplate({
      id: 'tpl-deep-review',
      name: 'Deep Review',
      description: 'Gemini valida -> Claude confere -> Codex implementa -> Claude revisa final',
      steps: [
        {
          provider: 'gemini',
          role: 'validate',
          instruction: 'Analise este pedido em profundidade:\n\n{input}',
        },
        {
          provider: 'claude',
          role: 'double-check',
          instruction:
            'Confira esta analise em detalhes:\n\n--- Analise ---\n{previous_result}\n\n--- Pedido Original ---\n{input}',
        },
        {
          provider: 'codex',
          role: 'code',
          instruction:
            'Implemente com base na analise revisada:\n\n--- Analise Revisada ---\n{previous_result}\n\n--- Pedido Original ---\n{input}',
        },
        {
          provider: 'claude',
          role: 'final-review',
          instruction:
            'Revisao final da implementacao. Verifique bugs, seguranca e aderencia ao pedido:\n\n--- Implementacao ---\n{previous_result}\n\n--- Pedido Original ---\n{input}',
        },
      ],
    }),
  ]
}
