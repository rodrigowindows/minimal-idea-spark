/**
 * Email inbound: parse incoming email (e.g. from Resend/SendGrid webhook) and create opportunity or journal.
 * Handles: parsing subject/body, extracting #tags, detecting type (opportunity vs journal),
 * extracting attachments as links, rate limiting, and email validation.
 */

export interface InboundEmailPayload {
  from: string
  to: string
  subject: string
  text?: string
  html?: string
  attachments?: InboundAttachment[]
  headers?: Record<string, string>
}

export interface InboundAttachment {
  filename: string
  content_type: string
  size: number
  url?: string
}

export interface ParsedInboundResult {
  type: 'opportunity' | 'journal'
  title: string
  description: string
  tags: string[]
  attachmentLinks: string[]
  priority?: number
}

const TAG_REGEX = /#(\w[\w-]*)/g
const PRIORITY_REGEX = /!priority[:\s]*(\d)/i

const JOURNAL_KEYWORDS = /journal|diário|diario|reflexão|reflexao|daily\s*log|gratitude|gratidão/i
const OPPORTUNITY_KEYWORDS = /idea|ideia|opportunity|oportunidade|task|tarefa|action|ação|projeto|project/i

export function parseInboundEmail(payload: InboundEmailPayload): ParsedInboundResult | null {
  const body = payload.text ?? payload.html?.replace(/<[^>]+>/g, '') ?? ''
  const subject = (payload.subject ?? '').trim()
  if (!subject) return null

  // Extract tags from both subject and body
  const subjectTags = [...subject.matchAll(TAG_REGEX)].map((m) => m[1])
  const bodyTags = [...body.matchAll(TAG_REGEX)].map((m) => m[1])
  const tags = [...new Set([...subjectTags, ...bodyTags])]

  // Clean subject (remove tags from display title)
  const cleanTitle = subject.replace(TAG_REGEX, '').trim() || subject

  // Detect type from subject and first 300 chars of body
  const textToCheck = `${subject} ${body.slice(0, 300)}`
  const isJournal = JOURNAL_KEYWORDS.test(textToCheck) && !OPPORTUNITY_KEYWORDS.test(subject)

  // Extract priority if specified (!priority:N)
  const priorityMatch = textToCheck.match(PRIORITY_REGEX)
  const priority = priorityMatch ? Math.min(10, Math.max(1, parseInt(priorityMatch[1], 10))) : undefined

  // Collect attachment links
  const attachmentLinks: string[] = (payload.attachments ?? [])
    .filter((a) => a.url)
    .map((a) => `[${a.filename}](${a.url})`)

  // Build description with attachments appended
  let description = body.slice(0, 2000).trim()
  if (attachmentLinks.length > 0) {
    description += '\n\nAttachments:\n' + attachmentLinks.join('\n')
  }

  return {
    type: isJournal ? 'journal' : 'opportunity',
    title: cleanTitle,
    description,
    tags,
    attachmentLinks,
    priority,
  }
}

/**
 * Validate that the sender email matches the user's registered email.
 */
export function validateSenderEmail(senderEmail: string, userEmail: string): boolean {
  const normalize = (e: string) => e.trim().toLowerCase()
  return normalize(senderEmail) === normalize(userEmail)
}

/**
 * Check rate limit: returns true if within limit.
 * Uses localStorage for client-side tracking; server-side uses DB.
 */
const RATE_LIMIT_KEY = 'lifeos_email_inbound_log'
const DEFAULT_RATE_LIMIT_PER_HOUR = 20

export function checkRateLimit(userEmail: string, limitPerHour = DEFAULT_RATE_LIMIT_PER_HOUR): boolean {
  try {
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000
    const log: { email: string; ts: number }[] = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || '[]')
    const recent = log.filter((entry) => entry.email === userEmail && entry.ts > oneHourAgo)
    if (recent.length >= limitPerHour) return false
    // Record this attempt
    log.push({ email: userEmail, ts: now })
    // Clean old entries
    const cleaned = log.filter((entry) => entry.ts > oneHourAgo)
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(cleaned))
    return true
  } catch {
    return true
  }
}

/**
 * Generate a unique capture email address for a user.
 */
export function generateCaptureEmail(userId: string): string {
  const hash = userId.replace(/-/g, '').slice(0, 12)
  return `capture-${hash}@inbound.lifeos.app`
}

/**
 * Get the user's capture email from localStorage (client-side cache).
 */
const CAPTURE_EMAIL_KEY = 'lifeos_capture_email'

export function getCaptureEmail(): string | null {
  try {
    return localStorage.getItem(CAPTURE_EMAIL_KEY)
  } catch {
    return null
  }
}

export function setCaptureEmail(email: string): void {
  try {
    localStorage.setItem(CAPTURE_EMAIL_KEY, email)
  } catch { /* ignore */ }
}

export function clearCaptureEmail(): void {
  try {
    localStorage.removeItem(CAPTURE_EMAIL_KEY)
  } catch { /* ignore */ }
}
