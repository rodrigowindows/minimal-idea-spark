/**
 * Email Inbound Edge Function
 * Webhook handler for receiving emails via Resend/SendGrid inbound parse.
 * Parses email, validates sender, creates opportunity or journal entry,
 * sends confirmation, and applies rate limiting.
 *
 * POST /email-inbound
 * Body: Resend/SendGrid inbound email payload
 */

import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseAdmin } from '../_shared/supabase.ts'

interface InboundEmailPayload {
  from: string
  to: string
  subject: string
  text?: string
  html?: string
  attachments?: { filename: string; content_type: string; size: number; url?: string }[]
}

const TAG_REGEX = /#(\w[\w-]*)/g
const JOURNAL_KEYWORDS = /journal|diário|diario|reflexão|reflexao|daily\s*log|gratitude|gratidão/i
const PRIORITY_REGEX = /!priority[:\s]*(\d)/i

function extractSenderEmail(from: string): string {
  const match = from.match(/<([^>]+)>/)
  return (match ? match[1] : from).trim().toLowerCase()
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = getSupabaseAdmin()

  let payload: InboundEmailPayload
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const senderEmail = extractSenderEmail(payload.from)
  const toAddress = extractSenderEmail(payload.to)

  // Look up user by capture email
  const { data: captureSettings, error: lookupError } = await supabase
    .from('email_capture_settings')
    .select('user_id, is_active, rate_limit_per_hour')
    .eq('capture_email', toAddress)
    .single()

  if (lookupError || !captureSettings) {
    return jsonResponse({ error: 'Unknown capture email address' }, 404)
  }

  if (!captureSettings.is_active) {
    return jsonResponse({ error: 'Email capture is disabled for this user' }, 403)
  }

  const userId = captureSettings.user_id

  // Validate sender: check that sender email matches the user's registered email
  const { data: userData } = await supabase.auth.admin.getUserById(userId)
  if (!userData?.user?.email || userData.user.email.toLowerCase() !== senderEmail) {
    await supabase.from('email_inbound_log').insert({
      user_id: userId,
      from_email: senderEmail,
      subject: payload.subject,
      status: 'rejected',
      error_message: 'Sender email does not match user email',
    })
    return jsonResponse({ error: 'Unauthorized sender' }, 403)
  }

  // Rate limiting: check emails in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('email_inbound_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('received_at', oneHourAgo)
    .in('status', ['processed'])

  if ((count ?? 0) >= (captureSettings.rate_limit_per_hour ?? 20)) {
    await supabase.from('email_inbound_log').insert({
      user_id: userId,
      from_email: senderEmail,
      subject: payload.subject,
      status: 'rate_limited',
      error_message: `Rate limit exceeded (${captureSettings.rate_limit_per_hour}/hour)`,
    })
    return jsonResponse({ error: 'Rate limit exceeded' }, 429)
  }

  // Parse email content
  const body = payload.text ?? payload.html?.replace(/<[^>]+>/g, '') ?? ''
  const subject = (payload.subject ?? '').trim()

  if (!subject) {
    await supabase.from('email_inbound_log').insert({
      user_id: userId,
      from_email: senderEmail,
      subject: null,
      status: 'error',
      error_message: 'Empty subject',
    })
    return jsonResponse({ error: 'Email subject is required' }, 400)
  }

  // Extract tags
  const tags = [...new Set([...subject.matchAll(TAG_REGEX), ...body.matchAll(TAG_REGEX)].map((m) => m[1]))]
  const cleanTitle = subject.replace(TAG_REGEX, '').trim() || subject

  // Detect type
  const textToCheck = `${subject} ${body.slice(0, 300)}`
  const isJournal = JOURNAL_KEYWORDS.test(textToCheck)

  // Extract priority
  const priorityMatch = textToCheck.match(PRIORITY_REGEX)
  const priority = priorityMatch ? Math.min(10, Math.max(1, parseInt(priorityMatch[1], 10))) : 5

  // Build description
  let description = body.slice(0, 2000).trim()
  const attachmentLinks = (payload.attachments ?? [])
    .filter((a) => a.url)
    .map((a) => `[${a.filename}](${a.url})`)
  if (attachmentLinks.length > 0) {
    description += '\n\nAttachments:\n' + attachmentLinks.join('\n')
  }

  let createdId: string | null = null
  let createdType: string

  if (isJournal) {
    createdType = 'journal'
    const { data: entry, error } = await supabase
      .from('daily_logs')
      .insert({
        user_id: userId,
        content: `${cleanTitle}\n\n${description}`.trim(),
        mood: null,
        energy_level: null,
        log_date: new Date().toISOString().split('T')[0],
      })
      .select('id')
      .single()

    if (error) {
      await supabase.from('email_inbound_log').insert({
        user_id: userId,
        from_email: senderEmail,
        subject,
        status: 'error',
        error_message: error.message,
      })
      return jsonResponse({ error: 'Failed to create journal entry' }, 500)
    }
    createdId = entry?.id ?? null
  } else {
    createdType = 'opportunity'
    const { data: opp, error } = await supabase
      .from('opportunities')
      .insert({
        user_id: userId,
        title: cleanTitle,
        description,
        type: 'action',
        status: 'backlog',
        priority,
        strategic_value: Math.max(1, priority - 1),
      })
      .select('id')
      .single()

    if (error) {
      await supabase.from('email_inbound_log').insert({
        user_id: userId,
        from_email: senderEmail,
        subject,
        status: 'error',
        error_message: error.message,
      })
      return jsonResponse({ error: 'Failed to create opportunity' }, 500)
    }
    createdId = opp?.id ?? null
  }

  // Log successful processing
  await supabase.from('email_inbound_log').insert({
    user_id: userId,
    from_email: senderEmail,
    subject,
    created_type: createdType,
    created_id: createdId,
    status: 'processed',
  })

  return jsonResponse({
    ok: true,
    type: createdType,
    id: createdId,
    title: cleanTitle,
    tags,
    message: `Created ${createdType} from email: "${cleanTitle}"`,
  }, 201)
})
