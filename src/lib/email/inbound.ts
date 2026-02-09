/**
 * Email inbound: parse incoming email (e.g. from Resend/SendGrid webhook) and create opportunity or journal.
 * Stub: production would call addOpportunity/addDailyLog via API or edge function.
 */

export interface InboundEmailPayload {
  from: string
  to: string
  subject: string
  text?: string
  html?: string
}

export interface ParsedInboundResult {
  type: 'opportunity' | 'journal'
  title: string
  description: string
  tags: string[]
}

const TAG_REGEX = /#(\w+)/g

export function parseInboundEmail(payload: InboundEmailPayload): ParsedInboundResult | null {
  const body = payload.text ?? payload.html?.replace(/<[^>]+>/g, '') ?? ''
  const tags = [...body.matchAll(TAG_REGEX)].map((m) => m[1])
  const subject = (payload.subject ?? '').trim()
  if (!subject) return null

  const isJournal = /journal|diário|diario|reflexão|reflexao/i.test(subject) || /journal|diário/i.test(body.slice(0, 200))
  return {
    type: isJournal ? 'journal' : 'opportunity',
    title: subject,
    description: body.slice(0, 2000).trim() || '',
    tags,
  }
}
