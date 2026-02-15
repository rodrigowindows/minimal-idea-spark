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
import {
  type ProviderName,
  type PromptStatus,
  type PromptRecord,
  type PipelineConfig,
  simulateProviderExecution,
  simulateProviderFailure,
  detectProviderResult,
  formatPrompt,
  chainNextStep,
  createMockPrompt,
  MAX_RESULT_INJECT,
  MAX_STORE_LENGTH,
} from '@/test/mocks/night-worker'

// ═══════════════════════════════════════════════════════════════════
// Composite simulators using shared helpers
// ═══════════════════════════════════════════════════════════════════

/** Simula o worker processando um prompt (espelha worker.py:348-415) */
function processPrompt(prompt: PromptRecord): {
  updatedPrompt: PromptRecord
  nextStep: PromptRecord | null
} {
  const processing = { ...prompt, status: 'processing' as PromptStatus }
  const { returnCode, stdout, stderr } = simulateProviderExecution(
    prompt.provider,
    formatPrompt(prompt.content, ''),
  )
  const result = detectProviderResult(returnCode, stderr, stdout)

  if (result === true) {
    const done: PromptRecord = {
      ...processing,
      status: 'done',
      result_content: stdout,
      attempts: processing.attempts + 1,
    }
    const nextStep = chainNextStep(done, stdout)
    return { updatedPrompt: done, nextStep }
  }

  const failed: PromptRecord = {
    ...processing,
    status: 'failed',
    error: stderr.slice(0, 5000),
    attempts: processing.attempts + 1,
  }
  return { updatedPrompt: failed, nextStep: null }
}

/** Simula processamento com falha injetada */
function processPromptWithFailure(
  prompt: PromptRecord,
  failType: 'error' | 'rate_limit' | 'too_long' | 'timeout',
): { updatedPrompt: PromptRecord; nextStep: PromptRecord | null } {
  const processing = { ...prompt, status: 'processing' as PromptStatus }
  const { returnCode, stdout, stderr } = simulateProviderFailure(failType)
  const result = detectProviderResult(returnCode, stderr, stdout)

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

  const step1: PromptRecord = createMockPrompt({
    id: 'prompt-001',
    provider: 'gemini',
    name: 'full-pipeline-step1-validate',
    content: 'Analyze and validate:\nCreate a login form with email/password validation',
    target_folder: 'C:\\code\\my-project',
    project_id: 'project-abc',
    pipeline_id: 'pipe-123',
    pipeline_step: 1,
    pipeline_total_steps: 3,
    pipeline_template_name: 'full-pipeline',
    pipeline_config: pipelineConfig,
  })

  it('Step 1 (Gemini): processa input original e gera analise', () => {
    const { updatedPrompt, nextStep } = processPrompt(step1)

    expect(updatedPrompt.status).toBe('done')
    expect(updatedPrompt.result_content).toContain('Gemini Analysis')
    expect(updatedPrompt.result_content).toContain('Analyzed')
    expect(updatedPrompt.attempts).toBe(1)

    expect(nextStep).not.toBeNull()
    expect(nextStep!.provider).toBe('codex')
    expect(nextStep!.pipeline_step).toBe(2)
  })

  it('Step 2 (Codex): recebe saida do Gemini como entrada', () => {
    const { updatedPrompt: step1Done, nextStep: step2 } = processPrompt(step1)

    expect(step2).not.toBeNull()
    expect(step2!.content).toContain('Gemini Analysis')
    expect(step2!.content).toContain('Implement based on analysis')
    expect(step2!.content).toContain('Create a login form')

    const { updatedPrompt: step2Done, nextStep: step3 } = processPrompt(step2!)

    expect(step2Done.status).toBe('done')
    expect(step2Done.result_content).toContain('function processData')

    expect(step3).not.toBeNull()
    expect(step3!.provider).toBe('claude')
    expect(step3!.pipeline_step).toBe(3)
  })

  it('Step 3 (Claude): recebe saida do Codex como entrada e finaliza', () => {
    const { nextStep: step2 } = processPrompt(step1)
    const { updatedPrompt: step2Done, nextStep: step3 } = processPrompt(step2!)

    expect(step3).not.toBeNull()
    expect(step3!.content).toContain('function processData')
    expect(step3!.content).toContain('Review implementation')

    const { updatedPrompt: step3Done, nextStep: step4 } = processPrompt(step3!)

    expect(step3Done.status).toBe('done')
    expect(step3Done.result_content).toContain('Code Review')
    expect(step3Done.result_content).toContain('Quality')

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

  const step1 = createMockPrompt({
    id: 'qv-001',
    provider: 'gemini',
    name: 'quick-validate-step1-validate',
    content: 'Validate:\nAdd caching to the API layer',
    target_folder: '/home/user/api',
    project_id: null,
    pipeline_id: 'pipe-qv-1',
    pipeline_step: 1,
    pipeline_total_steps: 2,
    pipeline_template_name: 'quick-validate',
    pipeline_config: config,
  })

  it('completa pipeline de 2 steps: Gemini valida, Claude confere', () => {
    const { updatedPrompt: s1, nextStep: s2 } = processPrompt(step1)
    expect(s1.status).toBe('done')
    expect(s2).not.toBeNull()
    expect(s2!.provider).toBe('claude')

    expect(s2!.content).toContain('Gemini Analysis')
    expect(s2!.content).toContain('Add caching to the API layer')

    const { updatedPrompt: s2done, nextStep: s3 } = processPrompt(s2!)
    expect(s2done.status).toBe('done')
    expect(s2done.result_content).toContain('Code Review')
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
    return createMockPrompt({
      id: 'dr-001',
      provider: 'gemini',
      name: 'deep-review-step1-validate',
      content: 'Deep analysis:\nRefactor auth module to use JWT',
      target_folder: 'C:\\code\\auth-service',
      project_id: 'proj-xyz',
      pipeline_id: 'pipe-dr-1',
      pipeline_step: 1,
      pipeline_total_steps: 4,
      pipeline_template_name: 'deep-review',
      pipeline_config: config,
    })
  }

  it('completa 4 steps com dados fluindo entre providers', () => {
    const results: PromptRecord[] = []

    let { updatedPrompt, nextStep } = processPrompt(makeStep1())
    results.push(updatedPrompt)
    expect(updatedPrompt.status).toBe('done')

    expect(nextStep).not.toBeNull()
    expect(nextStep!.provider).toBe('claude')
    ;({ updatedPrompt, nextStep } = processPrompt(nextStep!))
    results.push(updatedPrompt)
    expect(updatedPrompt.status).toBe('done')

    expect(nextStep).not.toBeNull()
    expect(nextStep!.provider).toBe('codex')
    ;({ updatedPrompt, nextStep } = processPrompt(nextStep!))
    results.push(updatedPrompt)
    expect(updatedPrompt.status).toBe('done')

    expect(nextStep).not.toBeNull()
    expect(nextStep!.provider).toBe('claude')
    ;({ updatedPrompt, nextStep } = processPrompt(nextStep!))
    results.push(updatedPrompt)
    expect(updatedPrompt.status).toBe('done')

    expect(nextStep).toBeNull()
    expect(results).toHaveLength(4)
    expect(results.every((r) => r.status === 'done')).toBe(true)
  })

  it('cada step recebe a saida do step anterior, nao do original', () => {
    const { updatedPrompt: s1, nextStep: s2prompt } = processPrompt(makeStep1())

    expect(s2prompt!.content).toContain('Gemini Analysis')
    const { updatedPrompt: s2, nextStep: s3prompt } = processPrompt(s2prompt!)

    expect(s3prompt!.content).toContain('Code Review')
    expect(s3prompt!.content).not.toContain('Gemini Analysis')
    const { updatedPrompt: s3, nextStep: s4prompt } = processPrompt(s3prompt!)

    expect(s4prompt!.content).toContain('function processData')
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
    return createMockPrompt({
      id: 'fail-001',
      provider: 'gemini',
      name: 'pipeline-step1-validate',
      content: 'Validate:\nBuild feature X',
      target_folder: '/tmp/test',
      project_id: 'proj-fail',
      pipeline_id: 'pipe-fail-1',
      pipeline_step: 1,
      pipeline_total_steps: 3,
      pipeline_template_name: 'pipeline-with-failure',
      pipeline_config: config,
    })
  }

  it('rate limit no step 2 para o pipeline (nao gera step 3)', () => {
    const { updatedPrompt: s1, nextStep: s2prompt } = processPrompt(makeStep1())
    expect(s1.status).toBe('done')
    expect(s2prompt).not.toBeNull()

    const { updatedPrompt: s2, nextStep: s3 } = processPromptWithFailure(s2prompt!, 'rate_limit')
    expect(s2.status).toBe('failed')
    expect(s2.error).toContain('Rate limited')
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
    const simple = createMockPrompt({
      id: 'simple-001',
      provider: 'claude',
      name: 'prompt-simples',
      content: 'Explain what this code does',
      target_folder: 'C:\\code\\test',
    })

    const { updatedPrompt, nextStep } = processPrompt(simple)
    expect(updatedPrompt.status).toBe('done')
    expect(updatedPrompt.result_content).toBeTruthy()
    expect(nextStep).toBeNull()
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

    const step1done = createMockPrompt({
      id: 'big-001',
      provider: 'gemini',
      name: 'big-step1',
      content: 'test',
      status: 'done',
      target_folder: '/tmp',
      pipeline_id: 'pipe-big',
      pipeline_step: 1,
      pipeline_total_steps: 2,
      pipeline_template_name: 'big-pipeline',
      pipeline_config: config,
      result_content: bigResult,
      attempts: 1,
    })

    const next = chainNextStep(step1done, bigResult)
    expect(next).not.toBeNull()
    expect(next!.content.length).toBeLessThanOrEqual(MAX_STORE_LENGTH)
    expect(next!.content.length).toBeGreaterThan(100_000)
    expect(next!.content.length).toBeLessThan(200_010)
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

    expect(outputs.get('gemini')).toContain('Gemini Analysis')
    expect(outputs.get('codex')).toContain('function')
    expect(outputs.get('claude')).toContain('Code Review')
    expect(outputs.get('openai')).toContain('OpenAI response')

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

    const prompt = createMockPrompt({
      id: 'track-001',
      provider: 'gemini',
      name: 'track-step1',
      content: 'test',
      target_folder: '/tmp',
      project_id: 'proj-track',
      pipeline_id: 'pipe-track',
      pipeline_step: 1,
      pipeline_total_steps: 2,
      pipeline_template_name: 'tracker',
      pipeline_config: config,
    })

    const statusLog: string[] = []
    statusLog.push(prompt.status) // pending

    const processing = { ...prompt, status: 'processing' as PromptStatus }
    statusLog.push(processing.status) // processing

    const { updatedPrompt } = processPrompt(prompt)
    statusLog.push(updatedPrompt.status) // done

    expect(statusLog).toEqual(['pending', 'processing', 'done'])
  })
})
