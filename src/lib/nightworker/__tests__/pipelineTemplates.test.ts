/**
 * Tests for default pipeline template generation.
 */
import { describe, it, expect } from 'vitest'
import { getDefaultPipelineTemplates } from '../pipelineTemplates'

describe('getDefaultPipelineTemplates', () => {
  it('returns 3 default templates', () => {
    const templates = getDefaultPipelineTemplates()
    expect(templates).toHaveLength(3)
  })

  it('each template has required fields', () => {
    const templates = getDefaultPipelineTemplates()
    for (const t of templates) {
      expect(t.id).toBeTruthy()
      expect(t.name).toBeTruthy()
      expect(t.description).toBeTruthy()
      expect(t.steps.length).toBeGreaterThan(0)
      expect(t.created_at).toBeTruthy()
      expect(t.updated_at).toBeTruthy()
    }
  })

  it('Quick Validate has 2 steps (gemini + claude)', () => {
    const templates = getDefaultPipelineTemplates()
    const quick = templates.find((t) => t.id === 'tpl-quick-validate')
    expect(quick).toBeDefined()
    expect(quick!.steps).toHaveLength(2)
    expect(quick!.steps[0].provider).toBe('gemini')
    expect(quick!.steps[1].provider).toBe('claude')
  })

  it('Full Pipeline has 3 steps (gemini + codex + claude)', () => {
    const templates = getDefaultPipelineTemplates()
    const full = templates.find((t) => t.id === 'tpl-full-pipeline')
    expect(full).toBeDefined()
    expect(full!.steps).toHaveLength(3)
    expect(full!.steps.map((s) => s.provider)).toEqual(['gemini', 'codex', 'claude'])
  })

  it('Deep Review has 4 steps', () => {
    const templates = getDefaultPipelineTemplates()
    const deep = templates.find((t) => t.id === 'tpl-deep-review')
    expect(deep).toBeDefined()
    expect(deep!.steps).toHaveLength(4)
  })

  it('all steps have provider, role, and instruction', () => {
    const templates = getDefaultPipelineTemplates()
    for (const t of templates) {
      for (const step of t.steps) {
        expect(step.provider).toBeTruthy()
        expect(step.role).toBeTruthy()
        expect(step.instruction).toBeTruthy()
      }
    }
  })

  it('instructions use {input} or {previous_result} placeholders', () => {
    const templates = getDefaultPipelineTemplates()
    for (const t of templates) {
      // First step should use {input}
      expect(t.steps[0].instruction).toContain('{input}')
      // Subsequent steps should use {previous_result}
      for (const step of t.steps.slice(1)) {
        expect(step.instruction).toContain('{previous_result}')
      }
    }
  })
})
