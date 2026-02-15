/**
 * Tests for pipeline template loading, saving, normalization,
 * and default template generation.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getDefaultPipelineTemplates,
  loadPipelineTemplates,
  savePipelineTemplates,
  PIPELINE_TEMPLATES_STORAGE_KEY,
} from '../pipelineTemplates'

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

describe('loadPipelineTemplates', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns defaults when localStorage is empty', () => {
    const templates = loadPipelineTemplates()
    expect(templates).toHaveLength(3)
  })

  it('saves defaults to localStorage when empty', () => {
    loadPipelineTemplates()
    const stored = localStorage.getItem(PIPELINE_TEMPLATES_STORAGE_KEY)
    expect(stored).toBeTruthy()
    const parsed = JSON.parse(stored!)
    expect(parsed).toHaveLength(3)
  })

  it('loads custom templates from localStorage', () => {
    const custom = [
      {
        id: 'custom-1',
        name: 'Custom Template',
        description: 'Test',
        steps: [{ provider: 'claude', role: 'test', instruction: 'test {input}' }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]
    localStorage.setItem(PIPELINE_TEMPLATES_STORAGE_KEY, JSON.stringify(custom))

    const templates = loadPipelineTemplates()
    expect(templates).toHaveLength(1)
    expect(templates[0].name).toBe('Custom Template')
  })

  it('resets to defaults when localStorage has invalid JSON', () => {
    localStorage.setItem(PIPELINE_TEMPLATES_STORAGE_KEY, '{broken json')
    const templates = loadPipelineTemplates()
    expect(templates).toHaveLength(3) // defaults
  })

  it('resets to defaults when localStorage has invalid templates', () => {
    localStorage.setItem(PIPELINE_TEMPLATES_STORAGE_KEY, JSON.stringify([{ invalid: true }]))
    const templates = loadPipelineTemplates()
    expect(templates).toHaveLength(3) // defaults since normalization filters out invalid
  })

  it('filters out templates with missing name', () => {
    const badTemplates = [
      {
        id: 'bad',
        name: '',
        description: 'No name',
        steps: [{ provider: 'claude', role: 'test', instruction: 'test' }],
      },
    ]
    localStorage.setItem(PIPELINE_TEMPLATES_STORAGE_KEY, JSON.stringify(badTemplates))
    const templates = loadPipelineTemplates()
    // Should return defaults since all stored templates are invalid
    expect(templates).toHaveLength(3)
  })

  it('filters out steps with missing provider', () => {
    const templates = [
      {
        id: 'test',
        name: 'Test',
        description: 'Test',
        steps: [
          { provider: 'claude', role: 'valid', instruction: 'test' },
          { provider: '', role: 'invalid', instruction: 'test' },
        ],
      },
    ]
    localStorage.setItem(PIPELINE_TEMPLATES_STORAGE_KEY, JSON.stringify(templates))
    const loaded = loadPipelineTemplates()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].steps).toHaveLength(1) // only the valid step
  })
})

describe('savePipelineTemplates', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saves templates to localStorage', () => {
    const templates = getDefaultPipelineTemplates()
    savePipelineTemplates(templates)

    const stored = localStorage.getItem(PIPELINE_TEMPLATES_STORAGE_KEY)
    expect(stored).toBeTruthy()
    expect(JSON.parse(stored!)).toHaveLength(3)
  })

  it('overwrites existing templates', () => {
    savePipelineTemplates(getDefaultPipelineTemplates())
    savePipelineTemplates([])

    const stored = localStorage.getItem(PIPELINE_TEMPLATES_STORAGE_KEY)
    expect(JSON.parse(stored!)).toHaveLength(0)
  })
})
