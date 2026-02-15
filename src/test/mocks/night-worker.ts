/**
 * Shared Night Worker test utilities, types, and factory functions.
 *
 * Import these in any NW test to avoid duplicating types and helpers:
 *   import { createMockPrompt, detectProviderResult, ... } from '@/test/mocks/night-worker'
 */
import { vi } from 'vitest'

// ── Types matching the Python worker ────────────────────────────────────

export type ProviderName = 'gemini' | 'codex' | 'claude' | 'openai'
export type PromptStatus = 'pending' | 'processing' | 'done' | 'failed'
export type ProviderResult = true | false | 'RATE_LIMIT' | 'TOO_LONG'

export interface PipelineStep {
  provider: ProviderName
  role: string
  instruction: string
}

export interface PipelineConfig {
  steps: PipelineStep[]
  original_input: string
  template_name?: string
  target_folder?: string
}

export interface PromptRecord {
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

// ── Constants ───────────────────────────────────────────────────────────

export const RATE_LIMIT_KEYWORDS = ['rate_limit', 'quota', 'token', 'hit your limit']
export const MAX_RESULT_INJECT = 120_000
export const MAX_STORE_LENGTH = 500_000
export const MAX_ERROR_LENGTH = 5_000
export const CODEX_STDIN_THRESHOLD = 8_000
export const STALL_THRESHOLD_MS = 10 * 60 * 1000 // 10 minutes
export const MAX_PATCH_RETRIES = 3

// ── Helpers mirroring Python worker behavior ────────────────────────────

/** Mirrors claude.py / codex.py return-code detection */
export function detectProviderResult(
  returnCode: number,
  stderr: string,
  stdout: string,
): ProviderResult {
  if (returnCode === 0) return true
  const combined = (stderr + ' ' + stdout).toLowerCase()
  if (RATE_LIMIT_KEYWORDS.some((k) => combined.includes(k))) return 'RATE_LIMIT'
  if (combined.includes('too long')) return 'TOO_LONG'
  return false
}

/** Mirrors worker.py status mapping */
export function mapResultToStatus(result: ProviderResult): PromptStatus {
  if (result === true) return 'done'
  return 'failed'
}

/** Mirrors base.py:29-39 prompt formatting */
export function formatPrompt(promptText: string, filesContent: string): string {
  if (filesContent) return `${promptText}\n\n---\n\n${filesContent}`
  return promptText
}

/** Mirrors codex.py:50 stdin detection */
export function shouldUseStdin(prompt: string): boolean {
  return prompt.length > CODEX_STDIN_THRESHOLD
}

/** Mirrors worker.py:279-286 time window check */
export function getWorkerStatus(now: Date, startTime: string, endTime: string): 'active' | 'paused' {
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  if (startMinutes > endMinutes) {
    return nowMinutes >= startMinutes || nowMinutes <= endMinutes ? 'active' : 'paused'
  }
  return nowMinutes >= startMinutes && nowMinutes <= endMinutes ? 'active' : 'paused'
}

/** Mirrors worker.py:309-314 rate limit check */
export function isRateLimited(retryTime: Date | null, now: Date): boolean {
  if (!retryTime) return false
  return now < retryTime
}

/** Mirrors worker.py:417-515 pipeline chaining */
export function getNextPipelineStep(
  currentStep: number,
  totalSteps: number,
  config: PipelineConfig,
  previousResult: string,
): { provider: string; content: string; name: string } | null {
  const nextStepNum = currentStep + 1
  if (nextStepNum > totalSteps) return null

  const nextIdx = nextStepNum - 1
  if (nextIdx >= config.steps.length) return null

  const stepDef = config.steps[nextIdx]
  if (!stepDef || !stepDef.provider) return null

  const truncated = previousResult.slice(0, MAX_RESULT_INJECT)
  let content = (stepDef.instruction || '{previous_result}')
    .replace('{previous_result}', truncated)
    .replace('{input}', config.original_input)
  content = content.slice(0, MAX_STORE_LENGTH)

  const role = stepDef.role || stepDef.provider
  const templateName = config.template_name || 'pipeline'
  const name = `${templateName}-step${nextStepNum}-${role}`.toLowerCase().replace(/ /g, '-').slice(0, 500)

  return { provider: stepDef.provider, content, name }
}

/** Full pipeline chaining that returns a PromptRecord */
export function chainNextStep(
  completed: PromptRecord,
  resultText: string,
): PromptRecord | null {
  if (!completed.pipeline_id || !completed.pipeline_config) return null

  const currentStep = completed.pipeline_step ?? 0
  const totalSteps = completed.pipeline_total_steps ?? 0
  if (currentStep < 1 || totalSteps < 1) return null

  const next = getNextPipelineStep(currentStep, totalSteps, completed.pipeline_config, resultText)
  if (!next) return null

  const nextStepNum = currentStep + 1
  return {
    id: `prompt-step${nextStepNum}-${Date.now()}`,
    provider: next.provider as ProviderName,
    name: next.name,
    content: next.content,
    status: 'pending',
    target_folder: completed.target_folder,
    project_id: completed.project_id,
    pipeline_id: completed.pipeline_id,
    pipeline_step: nextStepNum,
    pipeline_total_steps: totalSteps,
    pipeline_template_name: completed.pipeline_template_name,
    pipeline_config: completed.pipeline_config,
    result_content: null,
    error: null,
    attempts: 0,
  }
}

// ── Provider execution simulators ───────────────────────────────────────

/** Simulates CLI subprocess output for each provider */
export function simulateProviderExecution(
  provider: ProviderName,
  prompt: string,
): { returnCode: number; stdout: string; stderr: string } {
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

/** Simulates a provider failure */
export function simulateProviderFailure(
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

// ── Factory functions ───────────────────────────────────────────────────

/** Creates a mock PromptRecord with sensible defaults */
export function createMockPrompt(overrides: Partial<PromptRecord> = {}): PromptRecord {
  return {
    id: `prompt-${Date.now()}`,
    provider: 'claude',
    name: 'test-prompt',
    content: 'Test prompt content',
    status: 'pending',
    target_folder: 'C:\\code\\test-project',
    project_id: null,
    pipeline_id: null,
    pipeline_step: null,
    pipeline_total_steps: null,
    pipeline_template_name: null,
    pipeline_config: null,
    result_content: null,
    error: null,
    attempts: 0,
    ...overrides,
  }
}

/** Creates a mock PipelineConfig */
export function createMockPipelineConfig(overrides: Partial<PipelineConfig> = {}): PipelineConfig {
  return {
    steps: [
      { provider: 'gemini', role: 'validate', instruction: 'Validate:\n{input}' },
      { provider: 'codex', role: 'code', instruction: 'Implement:\n{previous_result}\n\nOriginal:\n{input}' },
      { provider: 'claude', role: 'review', instruction: 'Review:\n{previous_result}' },
    ],
    original_input: 'Test input',
    template_name: 'test-pipeline',
    ...overrides,
  }
}

// ── NightWorker context mock for hook testing ──────────────────────────

export function createMockNightWorkerContext(overrides: Record<string, unknown> = {}) {
  return {
    config: {
      baseUrl: 'http://localhost:7777',
      token: 'test-token',
      port: 7777,
      workers: {
        claude: { active: true, provider: 'claude_cli', windowStart: '00:00', windowEnd: '23:59', intervalSeconds: 60, timeoutSeconds: 0, maxFiles: 3, maxPromptSize: 8000, folder: 'C:\\test' },
        codex: { active: true, provider: 'codex_cli', windowStart: '00:00', windowEnd: '23:59', intervalSeconds: 60, timeoutSeconds: 0, maxFiles: 3, maxPromptSize: 8000, folder: 'C:\\test' },
      },
      providers: ['claude_cli', 'codex_cli'],
    },
    setConfig: vi.fn(),
    setToken: vi.fn(),
    clearAuth: vi.fn(),
    apiFetch: vi.fn(),
    isConnected: true,
    lastError: null,
    ...overrides,
  }
}
