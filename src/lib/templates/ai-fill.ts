/**
 * AI-powered template variable prefill (mock; can call edge function later).
 */

export async function suggestTemplateValues(variables: string[], context?: { goal?: string; domain?: string }): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  const dateStr = new Date().toISOString().split('T')[0]
  for (const v of variables) {
    if (v === 'date') result[v] = dateStr
    else if (v === 'title') result[v] = context?.goal ? `Task: ${context.goal}` : 'New item'
    else if (v === 'goal') result[v] = context?.goal ?? 'Complete this week'
    else if (v === 'domain') result[v] = context?.domain ?? 'General'
    else if (v === 'done') result[v] = 'Yesterday progress'
    else if (v === 'today') result[v] = 'Today focus'
    else if (v === 'content') result[v] = 'Add your content here'
    else result[v] = ''
  }
  return Promise.resolve(result)
}
