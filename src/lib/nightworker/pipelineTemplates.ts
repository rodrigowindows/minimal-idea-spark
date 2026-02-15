import type { NightWorkerProvider, PipelineStep, PipelineTemplate } from '@/types/night-worker'

export const PIPELINE_TEMPLATES_STORAGE_KEY = 'nightworker_templates'

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

function isProvider(value: unknown): value is NightWorkerProvider {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeStep(step: unknown): PipelineStep | null {
  if (!step || typeof step !== 'object') return null
  const raw = step as Record<string, unknown>
  const provider = raw.provider
  const role = typeof raw.role === 'string' ? raw.role.trim() : ''
  const instruction = typeof raw.instruction === 'string' ? raw.instruction : ''
  if (!isProvider(provider) || !role || !instruction) return null
  return {
    provider,
    role,
    instruction,
  }
}

function normalizeTemplate(input: unknown): PipelineTemplate | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Record<string, unknown>
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : crypto.randomUUID()
  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  const description = typeof raw.description === 'string' ? raw.description.trim() : ''
  const steps = Array.isArray(raw.steps) ? raw.steps.map((s) => normalizeStep(s)).filter((s): s is PipelineStep => Boolean(s)) : []
  if (!name || steps.length === 0) return null

  return {
    id,
    name,
    description,
    steps,
    created_at: typeof raw.created_at === 'string' ? raw.created_at : nowIso(),
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : nowIso(),
  }
}

function normalizeTemplates(input: unknown): PipelineTemplate[] {
  if (!Array.isArray(input)) return []
  return input
    .map((entry) => normalizeTemplate(entry))
    .filter((entry): entry is PipelineTemplate => Boolean(entry))
}

export function loadPipelineTemplates(): PipelineTemplate[] {
  if (typeof window === 'undefined') {
    return getDefaultPipelineTemplates()
  }

  try {
    const raw = localStorage.getItem(PIPELINE_TEMPLATES_STORAGE_KEY)
    if (!raw) {
      const defaults = getDefaultPipelineTemplates()
      savePipelineTemplates(defaults)
      return defaults
    }
    const parsed = JSON.parse(raw)
    const normalized = normalizeTemplates(parsed)
    if (normalized.length > 0) return normalized
  } catch {
    // ignore and reset below
  }

  const defaults = getDefaultPipelineTemplates()
  savePipelineTemplates(defaults)
  return defaults
}

export function savePipelineTemplates(templates: PipelineTemplate[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(PIPELINE_TEMPLATES_STORAGE_KEY, JSON.stringify(templates))
}
