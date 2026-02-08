/**
 * AI-powered template variable prefill (mock; can call edge function later).
 */

interface AiFillContext {
  goal?: string
  domain?: string
  templateName?: string
  category?: string
}

const SMART_DEFAULTS: Record<string, (ctx: AiFillContext) => string> = {
  date: () => new Date().toISOString().split('T')[0],
  title: (ctx) => ctx.goal ? `Task: ${ctx.goal}` : 'New item',
  goal: (ctx) => ctx.goal ?? 'Complete this week',
  domain: (ctx) => ctx.domain ?? 'General',
  done: () => 'Completed key deliverables and reviewed open items',
  today: () => 'Focus on priority tasks and clear blockers',
  blockers: () => 'None currently',
  content: () => 'Add your content here',
  lead: () => 'Team Lead',
  stakeholders: () => 'Product, Engineering, Design',
  criteria: () => 'Delivered on time with all acceptance criteria met',
  risks: () => 'Timeline risk - mitigate with daily standups',
  start_date: () => new Date().toISOString().split('T')[0],
  end_date: () => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0]
  },
  wins: () => 'Shipped key features ahead of schedule',
  challenges: () => 'Need to improve estimation accuracy',
  lessons: () => 'Break down tasks into smaller pieces',
  priority: () => 'High',
  notes: () => 'Key considerations and context',
  attendees: () => 'Team members',
  agenda: () => '1. Status update\n2. Discussion items\n3. Action items',
  decisions: () => 'Agreed on approach and timeline',
  specific: () => 'Clearly define the target outcome',
  measurable: () => 'Track with weekly metrics',
  achievable: () => 'Based on current resources and capacity',
  relevant: () => 'Aligns with strategic priorities',
  deadline: () => {
    const d = new Date()
    d.setDate(d.getDate() + 90)
    return d.toISOString().split('T')[0]
  },
  mood: () => 'good',
  energy: () => '7',
  status: () => 'In Progress',
  context: () => 'Provide background and context for this decision',
  rationale: () => 'Based on analysis of available options',
  outcome: () => 'Expected positive impact on key metrics',
  team: () => 'Engineering Team',
  team_mood: () => '8',
  went_well: () => 'Good collaboration and communication',
  improvements: () => 'Better sprint planning and estimation',
  audience: () => 'Target audience segment',
  tone: () => 'Professional and engaging',
  outline: () => '1. Introduction\n2. Main points\n3. Conclusion',
  references: () => 'Source materials and links',
  keywords: () => 'keyword1, keyword2, keyword3',
}

export async function suggestTemplateValues(
  variables: string[],
  context?: AiFillContext
): Promise<Record<string, string>> {
  const ctx = context ?? {}
  const result: Record<string, string> = {}

  for (const v of variables) {
    const generator = SMART_DEFAULTS[v]
    if (generator) {
      result[v] = generator(ctx)
    } else {
      // Generate a sensible default from the variable name
      const label = v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      result[v] = `[${label}]`
    }
  }

  // Simulate async behavior (replace with real AI call later)
  return Promise.resolve(result)
}
