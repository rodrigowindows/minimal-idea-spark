import type { PipelineTemplate } from '@/types/night-worker'

// Fixed epoch so the array is referentially stable across calls and
// doesn't cause unnecessary React re-renders from timestamp drift.
const EPOCH = '2024-01-01T00:00:00.000Z'

function defaultTemplate(template: Omit<PipelineTemplate, 'created_at' | 'updated_at'>): PipelineTemplate {
  return { ...template, created_at: EPOCH, updated_at: EPOCH }
}

/**
 * Local-only default templates used as seed data.
 * IDs here are placeholders — the backend assigns real UUIDs on insert.
 */
export function getDefaultPipelineTemplates(): PipelineTemplate[] {
  return [
    defaultTemplate({
      id: 'tpl-quick-validate',
      name: 'Quick Validate',
      description: 'Gemini faz validacao rapida e Claude confere antes da execucao.',
      context_mode: 'previous_only',
      is_default: true,
      steps: [
        {
          provider: 'gemini',
          role: 'quick_validate',
          instruction:
            'Analise rapidamente o pedido abaixo e entregue um checklist curto de validacao com riscos e proximos passos.\n\nPedido:\n{input}',
        },
        {
          provider: 'claude',
          role: 'double_check',
          instruction:
            'Revise a analise anterior, aponte lacunas e finalize um plano de acao objetivo.\n\nAnalise anterior:\n{previous_result}\n\nPedido original:\n{input}',
        },
      ],
    }),
    defaultTemplate({
      id: 'tpl-full-pipeline',
      name: 'Full Pipeline',
      description: 'Gemini planeja, Codex implementa e Claude revisa o resultado final.',
      context_mode: 'all_steps',
      is_default: true,
      steps: [
        {
          provider: 'gemini',
          role: 'plan',
          instruction:
            'Crie um plano tecnico de implementacao com arquitetura, riscos e passos objetivos.\n\nPedido:\n{input}',
        },
        {
          provider: 'codex',
          role: 'implement',
          instruction:
            'Implemente a solucao com base no plano anterior e no pedido original.\n\nPlano anterior:\n{previous_result}\n\nPedido original:\n{input}',
        },
        {
          provider: 'claude',
          role: 'review',
          instruction:
            'Revise a implementacao anterior, corrija falhas e entregue checklist final de qualidade.\n\nImplementacao anterior:\n{previous_result}\n\nPedido original:\n{input}',
        },
      ],
    }),
    defaultTemplate({
      id: 'tpl-deep-review',
      name: 'Deep Review',
      description: 'Fluxo iterativo para validar, desafiar, refinar e revisar em profundidade.',
      context_mode: 'all_steps',
      is_default: true,
      steps: [
        {
          provider: 'gemini',
          role: 'deep_validate',
          instruction:
            'Faca uma validacao profunda e identifique riscos tecnicos, ambiguidades e criterios de aceite.\n\nPedido:\n{input}',
        },
        {
          provider: 'claude',
          role: 'challenge',
          instruction:
            'Desafie a analise anterior, proponha ajustes e prioridades para reduzir risco.\n\nAnalise anterior:\n{previous_result}\n\nPedido original:\n{input}',
        },
        {
          provider: 'codex',
          role: 'refine',
          instruction:
            'Refine a estrategia e detalhe implementacao executavel com base no feedback anterior.\n\nFeedback anterior:\n{previous_result}\n\nPedido original:\n{input}',
        },
        {
          provider: 'claude',
          role: 'final_review',
          instruction:
            'Faca revisao final do refinamento, verifique consistencia e entregue plano consolidado.\n\nRefinamento anterior:\n{previous_result}\n\nPedido original:\n{input}',
        },
      ],
    }),
  ]
}
