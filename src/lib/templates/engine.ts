/**
 * Template engine: parse, replace variables, validate, and manage template strings.
 */

import type { TemplateVariable } from '@/lib/db/schema-templates'

export const VARIABLE_REGEX = /\{\{(\w+)\}\}/g

export const COMMON_VARIABLES: TemplateVariable[] = [
  { key: 'title', label: 'Title', default: '' },
  { key: 'date', label: 'Date', default: '', type: 'date' },
  { key: 'goal', label: 'Goal', default: '' },
  { key: 'domain', label: 'Domain', default: '' },
  { key: 'content', label: 'Content', default: '' },
]

/** Extract unique variable names from a template body */
export function listVariables(text: string): string[] {
  const re = /\{\{(\w+)\}\}/g
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (!out.includes(m[1])) out.push(m[1])
  }
  return out
}

/** Replace all {{var}} placeholders with provided values. Unresolved vars are cleared. */
export function applyVariables(text: string, values: Record<string, string>): string {
  let out = text
  for (const [k, v] of Object.entries(values)) {
    out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v)
  }
  out = out.replace(/\{\{\w+\}\}/g, '')
  return out
}

/** Get default values for a set of variable names */
export function getDefaultValues(vars: string[]): Record<string, string> {
  const d = new Date()
  const record: Record<string, string> = {
    date: d.toISOString().split('T')[0],
    title: '',
    goal: '',
    domain: '',
  }
  vars.forEach(v => { if (record[v] === undefined) record[v] = '' })
  return record
}

/** Validate a template body (check for balanced braces, non-empty vars) */
export function validateTemplate(body: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!body.trim()) {
    errors.push('Template body cannot be empty')
    return { valid: false, errors }
  }

  // Check for malformed variables like {var}} or {{var}
  const malformed = body.match(/\{(?!\{)\w+\}\}|\{\{\w+(?!\}).\b/g)
  if (malformed) {
    errors.push(`Malformed variable syntax found: ${malformed.join(', ')}`)
  }

  // Check for empty variable names {{}}
  if (body.includes('{{}}')) {
    errors.push('Empty variable name found: {{}}')
  }

  return { valid: errors.length === 0, errors }
}

/** Convert variable names into TemplateVariable objects with intelligent labels */
export function inferVariableMetadata(vars: string[]): TemplateVariable[] {
  return vars.map(key => {
    const label = key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())

    let type: TemplateVariable['type'] = 'text'
    if (key.includes('date') || key === 'deadline') type = 'date'
    else if (key.includes('number') || key === 'priority' || key === 'energy' || key.includes('score')) type = 'number'

    const common = COMMON_VARIABLES.find(cv => cv.key === key)
    return {
      key,
      label: common?.label ?? label,
      default: common?.default ?? '',
      type,
    }
  })
}

/** Generate a preview of the template with sample values */
export function generatePreview(body: string, values: Record<string, string>): string {
  const vars = listVariables(body)
  const defaults = getDefaultValues(vars)
  const merged = { ...defaults, ...values }
  return applyVariables(body, merged)
}

/** Count variables in template */
export function countVariables(body: string): number {
  return listVariables(body).length
}

/** Extract a short summary from template body (first non-empty line) */
export function getTemplateSummary(body: string, maxLength = 100): string {
  if (!body || typeof body !== 'string') return ''
  const firstLine = body.split('\n').find(l => l.trim().length > 0) ?? ''
  const cleaned = firstLine.replace(/[#*_]/g, '').replace(/\{\{\w+\}\}/g, '...').trim()
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) + '...' : cleaned
}
