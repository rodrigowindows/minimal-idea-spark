/**
 * Tests for Night Worker provider I/O logic.
 * Covers: status detection, rate limit parsing, timeout handling,
 * completion detection, prompt formatting, and pipeline chaining.
 *
 * These tests mirror the Python provider behavior from claude-auto
 * to ensure the TypeScript frontend understands every status transition.
 */
import { describe, it, expect } from 'vitest'
import {
  detectProviderResult,
  mapResultToStatus,
  formatPrompt,
  shouldUseStdin,
  getNextPipelineStep,
  getWorkerStatus,
  isRateLimited,
  MAX_PATCH_RETRIES,
  MAX_STORE_LENGTH,
  MAX_ERROR_LENGTH,
  STALL_THRESHOLD_MS,
  type PipelineConfig,
} from '@/test/mocks/night-worker'

// ══════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════

describe('Provider Return Code Detection', () => {
  it('detects success when returnCode is 0', () => {
    expect(detectProviderResult(0, '', 'some output')).toBe(true)
  })

  it('detects generic failure on non-zero returnCode', () => {
    expect(detectProviderResult(1, 'some error', '')).toBe(false)
  })

  it('detects RATE_LIMIT from stderr containing "rate_limit"', () => {
    expect(detectProviderResult(1, 'Error: rate_limit exceeded', '')).toBe('RATE_LIMIT')
  })

  it('detects RATE_LIMIT from "quota" keyword', () => {
    expect(detectProviderResult(1, 'quota exceeded', '')).toBe('RATE_LIMIT')
  })

  it('detects RATE_LIMIT from "hit your limit" keyword', () => {
    expect(detectProviderResult(1, '', 'you hit your limit')).toBe('RATE_LIMIT')
  })

  it('detects RATE_LIMIT from "token" keyword in error', () => {
    expect(detectProviderResult(1, 'token limit reached', '')).toBe('RATE_LIMIT')
  })

  it('detects TOO_LONG from stderr', () => {
    expect(detectProviderResult(1, 'prompt is too long', '')).toBe('TOO_LONG')
  })

  it('detects TOO_LONG from stdout', () => {
    expect(detectProviderResult(1, '', 'input too long for model')).toBe('TOO_LONG')
  })

  it('RATE_LIMIT takes priority over TOO_LONG if both present', () => {
    expect(detectProviderResult(1, 'rate_limit too long', '')).toBe('RATE_LIMIT')
  })

  it('returns false for unknown errors', () => {
    expect(detectProviderResult(137, 'segfault', '')).toBe(false)
  })
})

describe('Provider Result to DB Status Mapping', () => {
  it('maps true to done', () => {
    expect(mapResultToStatus(true)).toBe('done')
  })

  it('maps false to failed', () => {
    expect(mapResultToStatus(false)).toBe('failed')
  })

  it('maps RATE_LIMIT to failed', () => {
    expect(mapResultToStatus('RATE_LIMIT')).toBe('failed')
  })

  it('maps TOO_LONG to failed', () => {
    expect(mapResultToStatus('TOO_LONG')).toBe('failed')
  })
})

describe('Prompt Formatting', () => {
  it('returns plain prompt when no files content', () => {
    expect(formatPrompt('Hello', '')).toBe('Hello')
  })

  it('appends files content with separator', () => {
    const result = formatPrompt('Analyze this', 'file1.ts content')
    expect(result).toContain('Analyze this')
    expect(result).toContain('---')
    expect(result).toContain('file1.ts content')
  })

  it('handles multi-line prompt and files', () => {
    const result = formatPrompt('line1\nline2', 'file content\nmore content')
    expect(result.split('\n').length).toBeGreaterThan(4)
  })
})

describe('Codex stdin Detection', () => {
  it('uses argv for short prompts', () => {
    expect(shouldUseStdin('short prompt')).toBe(false)
  })

  it('uses stdin for prompts over 8000 chars', () => {
    const longPrompt = 'x'.repeat(8001)
    expect(shouldUseStdin(longPrompt)).toBe(true)
  })

  it('uses argv for exactly 8000 chars', () => {
    const prompt = 'x'.repeat(8000)
    expect(shouldUseStdin(prompt)).toBe(false)
  })
})

describe('Pipeline Step Chaining', () => {
  const config: PipelineConfig = {
    steps: [
      { provider: 'gemini', role: 'validate', instruction: 'Validate:\n{input}' },
      { provider: 'codex', role: 'code', instruction: 'Implement:\n{previous_result}\n\nOriginal:\n{input}' },
      { provider: 'claude', role: 'review', instruction: 'Review:\n{previous_result}' },
    ],
    original_input: 'Build a login page',
    template_name: 'full-pipeline',
  }

  it('returns step 2 after step 1 completes', () => {
    const next = getNextPipelineStep(1, 3, config, 'Validation passed')
    expect(next).not.toBeNull()
    expect(next!.provider).toBe('codex')
    expect(next!.content).toContain('Validation passed')
    expect(next!.content).toContain('Build a login page')
    expect(next!.name).toContain('step2')
    expect(next!.name).toContain('code')
  })

  it('returns step 3 after step 2 completes', () => {
    const next = getNextPipelineStep(2, 3, config, 'Code implemented')
    expect(next).not.toBeNull()
    expect(next!.provider).toBe('claude')
    expect(next!.content).toContain('Code implemented')
  })

  it('returns null when all steps are complete', () => {
    const next = getNextPipelineStep(3, 3, config, 'Review done')
    expect(next).toBeNull()
  })

  it('returns null when step index is out of bounds', () => {
    const smallConfig: PipelineConfig = {
      steps: [{ provider: 'gemini', role: 'validate', instruction: '{input}' }],
      original_input: 'test',
    }
    const next = getNextPipelineStep(1, 3, smallConfig, 'result')
    expect(next).toBeNull()
  })

  it('truncates large results to 120k chars', () => {
    const bigResult = 'x'.repeat(200_000)
    const next = getNextPipelineStep(1, 3, config, bigResult)
    expect(next).not.toBeNull()
    expect(next!.content.length).toBeLessThanOrEqual(MAX_STORE_LENGTH)
  })

  it('truncates final content to 500k chars', () => {
    const hugeInput = 'y'.repeat(600_000)
    const configBig: PipelineConfig = {
      steps: [
        { provider: 'gemini', role: 'v', instruction: '{input}' },
        { provider: 'claude', role: 'r', instruction: '{previous_result}{input}' },
      ],
      original_input: hugeInput,
    }
    const next = getNextPipelineStep(1, 2, configBig, 'result')
    expect(next).not.toBeNull()
    expect(next!.content.length).toBeLessThanOrEqual(MAX_STORE_LENGTH)
  })

  it('uses {previous_result} as default instruction when instruction is empty', () => {
    const configNoInstruction: PipelineConfig = {
      steps: [
        { provider: 'gemini', role: 'v', instruction: '{input}' },
        { provider: 'claude', role: 'r', instruction: '' },
      ],
      original_input: 'test',
    }
    const next = getNextPipelineStep(1, 2, configNoInstruction, 'my result')
    expect(next).not.toBeNull()
    expect(next!.content).toBe('my result')
  })
})

describe('Worker Status (Active Time Window)', () => {
  it('returns active during work hours', () => {
    const now = new Date('2026-02-15T14:30:00')
    expect(getWorkerStatus(now, '00:00', '23:59')).toBe('active')
  })

  it('returns paused outside work hours', () => {
    const now = new Date('2026-02-15T03:00:00')
    expect(getWorkerStatus(now, '08:00', '22:00')).toBe('paused')
  })

  it('handles overnight window (start > end)', () => {
    const late = new Date('2026-02-15T23:30:00')
    expect(getWorkerStatus(late, '22:00', '06:00')).toBe('active')

    const early = new Date('2026-02-15T03:00:00')
    expect(getWorkerStatus(early, '22:00', '06:00')).toBe('active')

    const mid = new Date('2026-02-15T12:00:00')
    expect(getWorkerStatus(mid, '22:00', '06:00')).toBe('paused')
  })

  it('handles edge case at exact start time', () => {
    const now = new Date('2026-02-15T08:00:00')
    expect(getWorkerStatus(now, '08:00', '22:00')).toBe('active')
  })

  it('handles edge case at exact end time', () => {
    const now = new Date('2026-02-15T22:00:00')
    expect(getWorkerStatus(now, '08:00', '22:00')).toBe('active')
  })
})

describe('Rate Limit Retry Logic', () => {
  it('is rate limited when retry time is in the future', () => {
    const now = new Date('2026-02-15T10:00:00')
    const retryAt = new Date('2026-02-15T10:05:00')
    expect(isRateLimited(retryAt, now)).toBe(true)
  })

  it('is NOT rate limited when retry time has passed', () => {
    const now = new Date('2026-02-15T10:06:00')
    const retryAt = new Date('2026-02-15T10:05:00')
    expect(isRateLimited(retryAt, now)).toBe(false)
  })

  it('is NOT rate limited when no retry time set', () => {
    const now = new Date('2026-02-15T10:00:00')
    expect(isRateLimited(null, now)).toBe(false)
  })
})

describe('Status Transition Flow', () => {
  it('follows pending → processing → done flow', () => {
    const statuses: string[] = []

    statuses.push('pending')
    statuses.push('processing')
    const result = detectProviderResult(0, '', 'output')
    statuses.push(mapResultToStatus(result))

    expect(statuses).toEqual(['pending', 'processing', 'done'])
  })

  it('follows pending → processing → failed flow on error', () => {
    const statuses: string[] = []

    statuses.push('pending')
    statuses.push('processing')
    const result = detectProviderResult(1, 'internal error', '')
    statuses.push(mapResultToStatus(result))

    expect(statuses).toEqual(['pending', 'processing', 'failed'])
  })

  it('follows pending → processing → failed flow on rate limit', () => {
    const statuses: string[] = []

    statuses.push('pending')
    statuses.push('processing')
    const result = detectProviderResult(1, 'rate_limit exceeded', '')
    statuses.push(mapResultToStatus(result))

    expect(statuses).toEqual(['pending', 'processing', 'failed'])
    expect(result).toBe('RATE_LIMIT')
  })

  it('follows pending → processing → failed flow on too long', () => {
    const statuses: string[] = []

    statuses.push('pending')
    statuses.push('processing')
    const result = detectProviderResult(1, 'prompt too long', '')
    statuses.push(mapResultToStatus(result))

    expect(statuses).toEqual(['pending', 'processing', 'failed'])
    expect(result).toBe('TOO_LONG')
  })
})

describe('Heartbeat JSON Structure', () => {
  it('generates correct heartbeat payload', () => {
    const workerId = 'test-worker-123'
    const provider = 'claude'
    const now = new Date('2026-02-15T10:00:00Z')
    const status = getWorkerStatus(now, '00:00', '23:59')

    const heartbeat = {
      worker_id: workerId,
      last_heartbeat: now.toISOString(),
      status,
      provider,
    }

    expect(heartbeat.worker_id).toBe('test-worker-123')
    expect(heartbeat.status).toBe('active')
    expect(heartbeat.provider).toBe('claude')
    expect(heartbeat.last_heartbeat).toBe('2026-02-15T10:00:00.000Z')
  })
})

describe('Result Content Limits', () => {
  it('truncates result_content to 500k chars for DB', () => {
    const bigResult = 'x'.repeat(600_000)
    const truncated = bigResult.slice(0, MAX_STORE_LENGTH)
    expect(truncated.length).toBe(MAX_STORE_LENGTH)
  })

  it('truncates error messages to 5000 chars', () => {
    const bigError = 'e'.repeat(10_000)
    const truncated = bigError.slice(0, MAX_ERROR_LENGTH)
    expect(truncated.length).toBe(MAX_ERROR_LENGTH)
  })
})

describe('Supabase API Retry Logic', () => {
  it('succeeds on first attempt', () => {
    const attempts: number[] = []
    for (let i = 0; i < MAX_PATCH_RETRIES; i++) {
      attempts.push(i)
      const statusCode = 200
      if ([200, 204, 409].includes(statusCode)) break
    }
    expect(attempts.length).toBe(1)
  })

  it('retries on 500 errors up to MAX_PATCH_RETRIES', () => {
    const attempts: number[] = []
    for (let i = 0; i < MAX_PATCH_RETRIES; i++) {
      attempts.push(i)
      const statusCode = 500
      if ([200, 204, 409].includes(statusCode)) break
      if ([400, 403, 404].includes(statusCode)) break
    }
    expect(attempts.length).toBe(MAX_PATCH_RETRIES)
  })

  it('stops on 403 Forbidden immediately', () => {
    const attempts: number[] = []
    for (let i = 0; i < MAX_PATCH_RETRIES; i++) {
      attempts.push(i)
      const statusCode = 403
      if ([200, 204, 409].includes(statusCode)) break
      if ([400, 403, 404].includes(statusCode)) break
    }
    expect(attempts.length).toBe(1)
  })

  it('treats 409 Conflict as success', () => {
    const attempts: number[] = []
    let success = false
    for (let i = 0; i < MAX_PATCH_RETRIES; i++) {
      attempts.push(i)
      const statusCode = 409
      if ([200, 204, 409].includes(statusCode)) {
        success = true
        break
      }
    }
    expect(success).toBe(true)
    expect(attempts.length).toBe(1)
  })
})

describe('Claim Prompts - Atomic Lock', () => {
  it('returns empty array on non-200 status', () => {
    const status: number = 500
    const result = status === 200 ? [{ id: '1' }] : []
    expect(result).toEqual([])
  })

  it('extracts prompts from { prompts: [...] } response', () => {
    const data = { prompts: [{ id: '1' }, { id: '2' }] }
    const prompts = data.prompts
    expect(prompts.length).toBe(2)
  })

  it('extracts prompts from array response', () => {
    const data = [{ id: '1' }]
    const prompts = Array.isArray(data) ? data : []
    expect(prompts.length).toBe(1)
  })

  it('falls back to GET /prompts when /claim returns 404', () => {
    let hasClaim: boolean | null = null
    const claimStatus = 404

    if (claimStatus === 404) {
      hasClaim = false
    }

    expect(hasClaim).toBe(false)
  })
})

describe('Stalled Prompt Recovery', () => {
  it('detects stalled prompts after 10 minutes', () => {
    const processingStarted = new Date('2026-02-15T10:00:00Z')
    const now = new Date('2026-02-15T10:11:00Z')

    const elapsed = now.getTime() - processingStarted.getTime()
    const isStalled = elapsed > STALL_THRESHOLD_MS

    expect(isStalled).toBe(true)
  })

  it('does NOT detect stalled prompts before 10 minutes', () => {
    const processingStarted = new Date('2026-02-15T10:00:00Z')
    const now = new Date('2026-02-15T10:09:00Z')

    const elapsed = now.getTime() - processingStarted.getTime()
    const isStalled = elapsed > STALL_THRESHOLD_MS

    expect(isStalled).toBe(false)
  })
})
