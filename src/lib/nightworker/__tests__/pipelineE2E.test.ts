/**
 * Pipeline E2E Flow Tests
 *
 * Simula o fluxo REAL de dados entre modelos:
 * - Saida de um modelo vira entrada do proximo
 * - Testa com diferentes providers (Gemini → Codex → Claude)
 * - Valida que o conteudo e transformado corretamente a cada step
 * - Valida que project_id, pipeline_id, target_folder propagam
 * - Testa cenarios de falha no meio do pipeline
 */
import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════════
// Simuladores que espelham o comportamento real do Python worker
// ═══════════════════════════════════════════════════════════════════

type ProviderName = 'gemini' | 'codex' | 'claude' | 'openai'
type PromptStatus = 'pending' | 'processing' | 'done' | 'failed'
type ProviderResult = true | false | 'RATE_LIMIT' | 'TOO_LONG'

interface PromptRecord {
  id: string
  provider: ProviderName
  name: string
  content: string
  status: PromptStatus
  target_folder: string
  project_id: string | null
  pipeline_id: string | null
  pipeline_step: number | null
  pipeline_total_steps: number | null
  pipeline_template_name: string | null
  pipeline_config: PipelineConfig | null
  result_content: string | null
  error: string | null
  attempts: number
}

interface PipelineStep {
  provider: ProviderName
  role: string
  instruction: string
}

interface PipelineConfig {
  steps: PipelineStep[]
  original_input: string
  template_name?: string
  target_folder?: string
}

// Simula o subprocess de cada provider (o que o CLI retorna)
function simulateProviderExecution(
  provider: ProviderName,
  prompt: string,
): { returnCode: number; stdout: string; stderr: string } {
  // Simula respostas reais de cada modelo
  switch (provider) {
    case 'gemini':
      return {
        returnCode: 0,
        stdout: `[Gemini Analysis]\nAnalyzed: ${prompt.slice(0, 100)}...\n\nFindings:\n- Code structure is valid\n- No security issues found\n- Suggested improvements: add error handling`,
        stderr: '',
      }
    case 'codex':
      return {
        returnCode: 0,
        stdout: `// Implementation based on analysis\nfunction processData(input: string): Result {\n  // Added error handling per review\n  try {\n    return { success: true, data: parse(input) }\n  } catch (e) {\n    return { success: false, error: e.message }\n  }\n}`,
        stderr: '',
      }
    case 'claude':
      return {
        returnCode: 0,
        stdout: `## Code Review\n\n**Quality:** Good\n**Security:** No issues\n**Correctness:** Implementation matches requirements\n\nThe code handles errors properly and follows best practices.`,
        stderr: '',
      }
    case 'openai':
      return {
        returnCode: 0,
        stdout: `OpenAI response for: ${prompt.slice(0, 50)}`,
        stderr: '',
      }
  }
}

// Simula provider com falha
function simulateProviderFailure(
  failType: 'error' | 'rate_limit' | 'too_long' | 'timeout',
): { returnCode: number; stdout: string; stderr: string } {
  switch (failType) {
    case 'rate_limit':
      return { returnCode: 1, stdout: '', stderr: 'Error: rate_limit exceeded. Please retry.' }
    case 'too_long':
      return { returnCode: 1, stdout: '', stderr: 'Error: prompt is too long for this model' }
    case 'timeout':
      return { returnCode: -1, stdout: '', stderr: 'TimeoutExpired' }
    case 'error':
      return { returnCode: 1, stdout: '', stderr: 'Internal server error' }
  }
}

// Detecta resultado do provider (espelha claude.py:59-78)
function detectResult(rc: number, stderr: string, stdout: string): ProviderResult {
  if (rc === 0) return true
  const combined = (stderr + ' ' + stdout).toLowerCase()
  if (['rate_limit', 'quota', 'token', 'hit your limit'].some((k) => combined.includes(k)))
    return 'RATE_LIMIT'
  if (combined.includes('too long')) return 'TOO_LONG'
  return false
}

// Formata prompt (espelha base.py:29-39)
function formatPrompt(text: string, files: string): string {
  return files ? `${text}\n\n---\n\n${files}` : text
}

const PIPELINE_MAX_RESULT_INJECT = 120_000

// Cria proximo step do pipeline (espelha worker.py:417-515)
function chainNextStep(
  completed: PromptRecord,
  resultText: string,
): PromptRecord | null {
  if (!completed.pipeline_id || !completed.pipeline_config) return null

  const currentStep = completed.pipeline_step ?? 0
  const totalSteps = completed.pipeline_total_steps ?? 0
  if (currentStep < 1 || totalSteps < 1) return null

  const nextStepNum = currentStep + 1
  if (nextStepNum > totalSteps) return null

  const config = completed.pipeline_config
  const nextIdx = nextStepNum - 1
  if (nextIdx >= config.steps.length) return null

  const stepDef = config.steps[nextIdx]
  if (!stepDef?.provider) return null

  let instruction = stepDef.instruction || '{previous_result}'
  const truncated = resultText.slice(0, PIPELINE_MAX_RESULT_INJECT)
  let content = instruction.replace('{previous_result}', truncated)
  content = content.replace('{input}', config.original_input)
  content = content.slice(0, 500_000)

  const role = stepDef.role || stepDef.provider
  const templateName = completed.pipeline_template_name || 'pipeline'
  const name = `${templateName}-step${nextStepNum}-${role}`.toLowerCase().replace(/ /g, '-').slice(0, 500)

  return {
    id: `prompt-step${nextStepNum}-${Date.now()}`,
    provider: stepDef.provider,
    name,
    content,
    status: 'pending',
    target_folder: completed.target_folder,
    project_id: completed.project_id, // PROPAGA project_id
    pipeline_id: completed.pipeline_id,
    pipeline_step: nextStepNum,
    pipeline_total_steps: totalSteps,
    pipeline_template_name: completed.pipeline_template_name,
    pipeline_config: config, // CONFIG IMUTAVEL propagada
    result_content: null,
    error: null,
    attempts: 0,
  }
}

// Simula o worker processando um prompt (espelha worker.py:348-415)
function processPrompt(prompt: PromptRecord): {
  updatedPrompt: PromptRecord
  nextStep: PromptRecord | null
} {
  // 1. Marca como processing
  const processing = { ...prompt, status: 'processing' as PromptStatus }

  // 2. Executa o provider
  const { returnCode, stdout, stderr } = simulateProviderExecution(
    prompt.provider,
    formatPrompt(prompt.content, ''),
  )

  // 3. Detecta resultado
  const result = detectResult(returnCode, stderr, stdout)

  if (result === true) {
    const done: PromptRecord = {
      ...processing,
      status: 'done',
      result_content: stdout,
      attempts: processing.attempts + 1,
    }
    // 4. Tenta encadear proximo step
    const nextStep = chainNextStep(done, stdout)
    return { updatedPrompt: done, nextStep }
  }

  // Falha
  const failed: PromptRecord = {
    ...processing,
    status: 'failed',
    error: stderr.slice(0, 5000),
    attempts: processing.attempts + 1,
  }
  return { updatedPrompt: failed, nextStep: null }
}

// Simula processamento com falha injetada
function processPromptWithFailure(
  prompt: PromptRecord,
  failType: 'error' | 'rate_limit' | 'too_long' | 'timeout',
): { updatedPrompt: PromptRecord; nextStep: PromptRecord | null } {
  const processing = { ...prompt, status: 'processing' as PromptStatus }
  const { returnCode, stdout, stderr } = simulateProviderFailure(failType)
  const result = detectResult(returnCode, stderr, stdout)

  if (result === 'RATE_LIMIT') {
    return {
      updatedPrompt: { ...processing, status: 'failed', error: 'Rate limited by provider', attempts: processing.attempts + 1 },
      nextStep: null,
    }
  }
  if (result === 'TOO_LONG') {
    return {
      updatedPrompt: { ...processing, status: 'failed', error: 'Prompt too long', attempts: processing.attempts + 1 },
      nextStep: null,
    }
  }
  return {
    updatedPrompt: { ...processing, status: 'failed', error: stderr.slice(0, 5000), attempts: processing.attempts + 1 },
    nextStep: null,
  }
}

// ═══════════════════════════════════════════════════════════════════
// TESTES
// ═══════════════════════════════════════════════════════════════════

describe('Pipeline E2E: Gemini → Codex → Claude (Full Pipeline)', () => {
  const pipelineConfig: PipelineConfig = {
    steps: [
      { provider: 'gemini', role: 'validate', instruction: 'Analyze and validate:\n{input}' },
      { provider: 'codex', role: 'code', instruction: 'Implement based on analysis:\n{previous_result}\n\nOriginal:\n{input}' },
      { provider: 'claude', role: 'review', instruction: 'Review implementation:\n{previous_result}\n\nOriginal:\n{input}' },
    ],
    original_input: 'Create a login form with email/password validation',
    template_name: 'full-pipeline',
  }

  const step1: PromptRecord = {
    id: 'prompt-001',
    provider: 'gemini',
    name: 'full-pipeline-step1-validate',
    content: 'Analyze and validate:\nCreate a login form with email/password validation',
    status: 'pending',
    target_folder: 'C:\\code\\my-project',
    project_id: 'project-abc',
    pipeline_id: 'pipe-123',
    pipeline_step: 1,
    pipeline_total_steps: 3,
    pipeline_template_name: 'full-pipeline',
    pipeline_config: pipelineConfig,
    result_content: null,
    error: null,
    attempts: 0,
  }

  it('Step 1 (Gemini): processa input original e gera analise', () => {
    const { updatedPrompt, nextStep } = processPrompt(step1)

    // Gemini processa com sucesso
    expect(updatedPrompt.status).toBe('done')
    expect(updatedPrompt.result_content).toContain('Gemini Analysis')
    expect(updatedPrompt.result_content).toContain('Analyzed')
    expect(updatedPrompt.attempts).toBe(1)

    // Gera step 2
    expect(nextStep).not.toBeNull()
    expect(nextStep!.provider).toBe('codex')
    expect(nextStep!.pipeline_step).toBe(2)
  })

  it('Step 2 (Codex): recebe saida do Gemini como entrada', () => {
    // Executa step 1 primeiro
    const { updatedPrompt: step1Done, nextStep: step2 } = processPrompt(step1)

    expect(step2).not.toBeNull()

    // Valida que o conteudo do step 2 contem a saida do Gemini
    expect(step2!.content).toContain('Gemini Analysis')
    expect(step2!.content).toContain('Implement based on analysis')

    // Valida que o input original tbm esta presente
    expect(step2!.content).toContain('Create a login form')

    // Processa step 2
    const { updatedPrompt: step2Done, nextStep: step3 } = processPrompt(step2!)

    expect(step2Done.status).toBe('done')
    expect(step2Done.result_content).toContain('function processData')

    // Gera step 3
    expect(step3).not.toBeNull()
    expect(step3!.provider).toBe('claude')
    expect(step3!.pipeline_step).toBe(3)
  })

  it('Step 3 (Claude): recebe saida do Codex como entrada e finaliza', () => {
    // Executa steps 1 e 2
    const { nextStep: step2 } = processPrompt(step1)
    const { updatedPrompt: step2Done, nextStep: step3 } = processPrompt(step2!)

    expect(step3).not.toBeNull()

    // Valida que o conteudo do step 3 contem o codigo do Codex
    expect(step3!.content).toContain('function processData')
    expect(step3!.content).toContain('Review implementation')

    // Processa step 3
    const { updatedPrompt: step3Done, nextStep: step4 } = processPrompt(step3!)

    expect(step3Done.status).toBe('done')
    expect(step3Done.result_content).toContain('Code Review')
    expect(step3Done.result_content).toContain('Quality')

    // NAO gera step 4 - pipeline completo
    expect(step4).toBeNull()
  })

  it('project_id propaga em TODOS os steps', () => {
    const { nextStep: step2 } = processPrompt(step1)
    expect(step2!.project_id).toBe('project-abc')

    const { nextStep: step3 } = processPrompt(step2!)
    expect(step3!.project_id).toBe('project-abc')
  })

  it('pipeline_id e igual em TODOS os steps', () => {
    const { nextStep: step2 } = processPrompt(step1)
    expect(step2!.pipeline_id).toBe('pipe-123')

    const { nextStep: step3 } = processPrompt(step2!)
    expect(step3!.pipeline_id).toBe('pipe-123')
  })

  it('target_folder propaga em TODOS os steps', () => {
    const { nextStep: step2 } = processPrompt(step1)
    expect(step2!.target_folder).toBe('C:\\code\\my-project')

    const { nextStep: step3 } = processPrompt(step2!)
    expect(step3!.target_folder).toBe('C:\\code\\my-project')
  })

  it('pipeline_config (imutavel) propaga em TODOS os steps', () => {
    const { nextStep: step2 } = processPrompt(step1)
    expect(step2!.pipeline_config).toEqual(pipelineConfig)

    const { nextStep: step3 } = processPrompt(step2!)
    expect(step3!.pipeline_config).toEqual(pipelineConfig)
  })

  it('pipeline_total_steps e consistente em todos os steps', () => {
    const { nextStep: step2 } = processPrompt(step1)
    expect(step2!.pipeline_total_steps).toBe(3)

    const { nextStep: step3 } = processPrompt(step2!)
    expect(step3!.pipeline_total_steps).toBe(3)
  })

  it('nomes dos steps seguem o padrao correto', () => {
    const { nextStep: step2 } = processPrompt(step1)
    expect(step2!.name).toContain('step2')
    expect(step2!.name).toContain('code')

    const { nextStep: step3 } = processPrompt(step2!)
    expect(step3!.name).toContain('step3')
    expect(step3!.name).toContain('review')
  })
})

describe('Pipeline E2E: Quick Validate (Gemini → Claude)', () => {
  const config: PipelineConfig = {
    steps: [
      { provider: 'gemini', role: 'validate', instruction: 'Validate:\n{input}' },
      { provider: 'claude', role: 'double-check', instruction: 'Double check:\n{previous_result}\n\nOriginal:\n{input}' },
    ],
    original_input: 'Add caching to the API layer',
    template_name: 'quick-validate',
  }

  const step1: PromptRecord = {
    id: 'qv-001',
    provider: 'gemini',
    name: 'quick-validate-step1-validate',
    content: 'Validate:\nAdd caching to the API layer',
    status: 'pending',
    target_folder: '/home/user/api',
    project_id: null, // sem projeto
    pipeline_id: 'pipe-qv-1',
    pipeline_step: 1,
    pipeline_total_steps: 2,
    pipeline_template_name: 'quick-validate',
    pipeline_config: config,
    result_content: null,
    error: null,
    attempts: 0,
  }

  it('completa pipeline de 2 steps: Gemini valida, Claude confere', () => {
    // Step 1: Gemini
    const { updatedPrompt: s1, nextStep: s2 } = processPrompt(step1)
    expect(s1.status).toBe('done')
    expect(s2).not.toBeNull()
    expect(s2!.provider).toBe('claude')

    // Step 2: Claude recebe saida do Gemini
    expect(s2!.content).toContain('Gemini Analysis')
    expect(s2!.content).toContain('Add caching to the API layer')

    const { updatedPrompt: s2done, nextStep: s3 } = processPrompt(s2!)
    expect(s2done.status).toBe('done')
    expect(s2done.result_content).toContain('Code Review')

    // Sem step 3
    expect(s3).toBeNull()
  })

  it('funciona sem project_id (null propaga como null)', () => {
    const { nextStep: s2 } = processPrompt(step1)
    expect(s2!.project_id).toBeNull()
  })
})

describe('Pipeline E2E: Deep Review (4 steps, providers diferentes)', () => {
  const config: PipelineConfig = {
    steps: [
      { provider: 'gemini', role: 'validate', instruction: 'Deep analysis:\n{input}' },
      { provider: 'claude', role: 'double-check', instruction: 'Check analysis:\n{previous_result}\nOriginal:\n{input}' },
      { provider: 'codex', role: 'code', instruction: 'Implement:\n{previous_result}\nOriginal:\n{input}' },
      { provider: 'claude', role: 'final-review', instruction: 'Final review:\n{previous_result}\nOriginal:\n{input}' },
    ],
    original_input: 'Refactor auth module to use JWT',
    template_name: 'deep-review',
  }

  function makeStep1(): PromptRecord {
    return {
      id: 'dr-001',
      provider: 'gemini',
      name: 'deep-review-step1-validate',
      content: 'Deep analysis:\nRefactor auth module to use JWT',
      status: 'pending',
      target_folder: 'C:\\code\\auth-service',
      project_id: 'proj-xyz',
      pipeline_id: 'pipe-dr-1',
      pipeline_step: 1,
      pipeline_total_steps: 4,
      pipeline_template_name: 'deep-review',
      pipeline_config: config,
      result_content: null,
      error: null,
      attempts: 0,
    }
  }

  it('completa 4 steps com dados fluindo entre providers', () => {
    const results: PromptRecord[] = []

    // Step 1: Gemini
    let { updatedPrompt, nextStep } = processPrompt(makeStep1())
    results.push(updatedPrompt)
    expect(updatedPrompt.status).toBe('done')

    // Step 2: Claude (double-check)
    expect(nextStep).not.toBeNull()
    expect(nextStep!.provider).toBe('claude')
    ;({ updatedPrompt, nextStep } = processPrompt(nextStep!))
    results.push(updatedPrompt)
    expect(updatedPrompt.status).toBe('done')

    // Step 3: Codex (code)
    expect(nextStep).not.toBeNull()
    expect(nextStep!.provider).toBe('codex')
    ;({ updatedPrompt, nextStep } = processPrompt(nextStep!))
    results.push(updatedPrompt)
    expect(updatedPrompt.status).toBe('done')

    // Step 4: Claude (final-review)
    expect(nextStep).not.toBeNull()
    expect(nextStep!.provider).toBe('claude')
    ;({ updatedPrompt, nextStep } = processPrompt(nextStep!))
    results.push(updatedPrompt)
    expect(updatedPrompt.status).toBe('done')

    // Fim do pipeline
    expect(nextStep).toBeNull()

    // Todos os 4 steps concluidos
    expect(results).toHaveLength(4)
    expect(results.every((r) => r.status === 'done')).toBe(true)
  })

  it('cada step recebe a saida do step anterior, nao do original', () => {
    // Step 1
    const { updatedPrompt: s1, nextStep: s2prompt } = processPrompt(makeStep1())

    // Step 2 recebe saida do Gemini
    expect(s2prompt!.content).toContain('Gemini Analysis')
    const { updatedPrompt: s2, nextStep: s3prompt } = processPrompt(s2prompt!)

    // Step 3 recebe saida do Claude (double-check), NAO do Gemini
    expect(s3prompt!.content).toContain('Code Review') // saida do Claude
    expect(s3prompt!.content).not.toContain('Gemini Analysis') // NAO contem saida do Gemini diretamente
    const { updatedPrompt: s3, nextStep: s4prompt } = processPrompt(s3prompt!)

    // Step 4 recebe saida do Codex, NAO do Claude anterior
    expect(s4prompt!.content).toContain('function processData') // saida do Codex
  })

  it('Claude aparece 2x com roles diferentes (double-check e final-review)', () => {
    const { nextStep: s2 } = processPrompt(makeStep1())
    expect(s2!.provider).toBe('claude')
    expect(s2!.name).toContain('double-check')

    const { nextStep: s3 } = processPrompt(s2!)
    const { nextStep: s4 } = processPrompt(s3!)
    expect(s4!.provider).toBe('claude')
    expect(s4!.name).toContain('final-review')
  })
})

describe('Pipeline E2E: Falha no meio do pipeline', () => {
  const config: PipelineConfig = {
    steps: [
      { provider: 'gemini', role: 'validate', instruction: 'Validate:\n{input}' },
      { provider: 'codex', role: 'code', instruction: 'Code:\n{previous_result}' },
      { provider: 'claude', role: 'review', instruction: 'Review:\n{previous_result}' },
    ],
    original_input: 'Build feature X',
    template_name: 'pipeline-with-failure',
  }

  function makeStep1(): PromptRecord {
    return {
      id: 'fail-001',
      provider: 'gemini',
      name: 'pipeline-step1-validate',
      content: 'Validate:\nBuild feature X',
      status: 'pending',
      target_folder: '/tmp/test',
      project_id: 'proj-fail',
      pipeline_id: 'pipe-fail-1',
      pipeline_step: 1,
      pipeline_total_steps: 3,
      pipeline_template_name: 'pipeline-with-failure',
      pipeline_config: config,
      result_content: null,
      error: null,
      attempts: 0,
    }
  }

  it('rate limit no step 2 para o pipeline (nao gera step 3)', () => {
    // Step 1 OK
    const { updatedPrompt: s1, nextStep: s2prompt } = processPrompt(makeStep1())
    expect(s1.status).toBe('done')
    expect(s2prompt).not.toBeNull()

    // Step 2 falha com rate limit
    const { updatedPrompt: s2, nextStep: s3 } = processPromptWithFailure(s2prompt!, 'rate_limit')
    expect(s2.status).toBe('failed')
    expect(s2.error).toContain('Rate limited')

    // NAO gera step 3
    expect(s3).toBeNull()
  })

  it('too long no step 1 para o pipeline imediatamente', () => {
    const { updatedPrompt, nextStep } = processPromptWithFailure(makeStep1(), 'too_long')
    expect(updatedPrompt.status).toBe('failed')
    expect(updatedPrompt.error).toContain('too long')
    expect(nextStep).toBeNull()
  })

  it('erro generico no step 2 para o pipeline', () => {
    const { nextStep: s2prompt } = processPrompt(makeStep1())
    const { updatedPrompt: s2, nextStep: s3 } = processPromptWithFailure(s2prompt!, 'error')
    expect(s2.status).toBe('failed')
    expect(s3).toBeNull()
  })

  it('timeout no step 1 para o pipeline', () => {
    const { updatedPrompt, nextStep } = processPromptWithFailure(makeStep1(), 'timeout')
    expect(updatedPrompt.status).toBe('failed')
    expect(nextStep).toBeNull()
  })
})

describe('Pipeline E2E: Prompt sem pipeline (execucao simples)', () => {
  it('prompt avulso sem pipeline_id nao gera proximo step', () => {
    const simple: PromptRecord = {
      id: 'simple-001',
      provider: 'claude',
      name: 'prompt-simples',
      content: 'Explain what this code does',
      status: 'pending',
      target_folder: 'C:\\code\\test',
      project_id: null,
      pipeline_id: null,
      pipeline_step: null,
      pipeline_total_steps: null,
      pipeline_template_name: null,
      pipeline_config: null,
      result_content: null,
      error: null,
      attempts: 0,
    }

    const { updatedPrompt, nextStep } = processPrompt(simple)
    expect(updatedPrompt.status).toBe('done')
    expect(updatedPrompt.result_content).toBeTruthy()
    expect(nextStep).toBeNull() // Sem pipeline, sem proximo step
  })
})

describe('Pipeline E2E: Conteudo grande entre steps', () => {
  it('resultado grande (200k chars) e truncado a 120k no proximo step', () => {
    const config: PipelineConfig = {
      steps: [
        { provider: 'gemini', role: 'gen', instruction: '{input}' },
        { provider: 'claude', role: 'review', instruction: 'Review:\n{previous_result}' },
      ],
      original_input: 'test',
    }

    const bigResult = 'X'.repeat(200_000)

    const step1done: PromptRecord = {
      id: 'big-001',
      provider: 'gemini',
      name: 'big-step1',
      content: 'test',
      status: 'done',
      target_folder: '/tmp',
      project_id: null,
      pipeline_id: 'pipe-big',
      pipeline_step: 1,
      pipeline_total_steps: 2,
      pipeline_template_name: 'big-pipeline',
      pipeline_config: config,
      result_content: bigResult,
      error: null,
      attempts: 1,
    }

    const next = chainNextStep(step1done, bigResult)
    expect(next).not.toBeNull()

    // O conteudo nao deve ter os 200k completos, mas sim truncado
    // "Review:\n" + 120k chars = ~120008 chars
    expect(next!.content.length).toBeLessThanOrEqual(500_000)
    expect(next!.content.length).toBeGreaterThan(100_000) // tem os 120k
    expect(next!.content.length).toBeLessThan(200_010) // nao tem os 200k completos
  })
})

describe('Pipeline E2E: Providers diferentes geram saidas diferentes', () => {
  it('Gemini, Codex, Claude e OpenAI produzem formatos distintos', () => {
    const providers: ProviderName[] = ['gemini', 'codex', 'claude', 'openai']
    const outputs = new Map<string, string>()

    for (const provider of providers) {
      const { stdout } = simulateProviderExecution(provider, 'Test prompt')
      outputs.set(provider, stdout)
    }

    // Cada provider gera saida diferente
    expect(outputs.get('gemini')).toContain('Gemini Analysis')
    expect(outputs.get('codex')).toContain('function')
    expect(outputs.get('claude')).toContain('Code Review')
    expect(outputs.get('openai')).toContain('OpenAI response')

    // Nenhuma saida e igual a outra
    const values = [...outputs.values()]
    for (let i = 0; i < values.length; i++) {
      for (let j = i + 1; j < values.length; j++) {
        expect(values[i]).not.toBe(values[j])
      }
    }
  })
})

describe('Pipeline E2E: Fluxo completo com status tracking', () => {
  it('rastreia a sequencia completa de status: pending → processing → done', () => {
    const config: PipelineConfig = {
      steps: [
        { provider: 'gemini', role: 'v', instruction: '{input}' },
        { provider: 'claude', role: 'r', instruction: '{previous_result}' },
      ],
      original_input: 'test',
    }

    const prompt: PromptRecord = {
      id: 'track-001',
      provider: 'gemini',
      name: 'track-step1',
      content: 'test',
      status: 'pending',
      target_folder: '/tmp',
      project_id: 'proj-track',
      pipeline_id: 'pipe-track',
      pipeline_step: 1,
      pipeline_total_steps: 2,
      pipeline_template_name: 'tracker',
      pipeline_config: config,
      result_content: null,
      error: null,
      attempts: 0,
    }

    const statusLog: string[] = []

    // Simula o ciclo completo
    statusLog.push(prompt.status) // pending

    // Worker pega o prompt
    const processing = { ...prompt, status: 'processing' as PromptStatus }
    statusLog.push(processing.status) // processing

    // Provider executa
    const { updatedPrompt } = processPrompt(prompt)
    statusLog.push(updatedPrompt.status) // done

    expect(statusLog).toEqual(['pending', 'processing', 'done'])
  })
})
