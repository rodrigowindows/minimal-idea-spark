/**
 * Template engine: replace variables in template strings.
 */

export interface TemplateVariable {
  key: string
  label: string
  default?: string
}

export const COMMON_VARIABLES: TemplateVariable[] = [
  { key: '{{title}}', label: 'Title', default: '' },
  { key: '{{date}}', label: 'Date', default: '' },
  { key: '{{goal}}', label: 'Goal', default: '' },
  { key: '{{domain}}', label: 'Domain', default: '' },
]

export function listVariables(text: string): string[] {
  const re = /\{\{(\w+)\}\}/g
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (!out.includes(m[1])) out.push(m[1])
  }
  return out
}

export function applyVariables(text: string, values: Record<string, string>): string {
  let out = text
  for (const [k, v] of Object.entries(values)) {
    out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v)
  }
  out = out.replace(/\{\{\w+\}\}/g, '')
  return out
}

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
