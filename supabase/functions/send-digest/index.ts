/**
 * Send Digest Edge Function
 * Scheduled function (cron) that builds and sends digest emails to users who opted in.
 * Can be triggered by Supabase pg_cron, external cron, or manual invocation.
 *
 * POST /send-digest
 * Body: { frequency: "daily" | "weekly" } (optional, defaults to both)
 *
 * Uses Resend API for email delivery (set RESEND_API_KEY in environment).
 */

import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseAdmin } from '../_shared/supabase.ts'

interface DigestUser {
  user_id: string
  frequency: string
  include_opportunities: boolean
  include_journal: boolean
  include_metrics: boolean
  last_sent_at: string | null
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

function formatPeriod(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}, ${end.getFullYear()}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = getSupabaseAdmin()
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const appUrl = Deno.env.get('APP_URL') ?? 'https://lifeos.app'
  const fromEmail = Deno.env.get('DIGEST_FROM_EMAIL') ?? 'digest@lifeos.app'

  let requestedFrequency: string | null = null
  try {
    const body = await req.json()
    requestedFrequency = body?.frequency ?? null
  } catch { /* no body is fine */ }

  // Fetch users with digest enabled
  let query = supabase
    .from('digest_preferences')
    .select('user_id, frequency, include_opportunities, include_journal, include_metrics, last_sent_at')
    .eq('enabled', true)

  if (requestedFrequency) {
    query = query.eq('frequency', requestedFrequency)
  }

  const { data: users, error: fetchError } = await query

  if (fetchError) {
    return jsonResponse({ error: 'Failed to fetch digest preferences', details: fetchError.message }, 500)
  }

  if (!users || users.length === 0) {
    return jsonResponse({ message: 'No users opted in for digest', sent: 0 })
  }

  const results: { userId: string; success: boolean; error?: string }[] = []
  const now = new Date()

  for (const user of users as DigestUser[]) {
    try {
      // Calculate period
      const periodEnd = new Date(now)
      const periodStart = new Date(now)
      if (user.frequency === 'daily') {
        periodStart.setDate(periodStart.getDate() - 1)
      } else {
        periodStart.setDate(periodStart.getDate() - 7)
      }

      const startIso = periodStart.toISOString()
      const endIso = periodEnd.toISOString()

      // Fetch user email
      const { data: userData } = await supabase.auth.admin.getUserById(user.user_id)
      const userEmail = userData?.user?.email
      if (!userEmail) {
        results.push({ userId: user.user_id, success: false, error: 'No email found' })
        continue
      }

      // Gather digest data
      let opportunitiesCompleted = 0
      let opportunitiesTotal = 0
      let opportunitiesNew = 0

      if (user.include_opportunities) {
        const { count: total } = await supabase
          .from('opportunities')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.user_id)

        const { count: completed } = await supabase
          .from('opportunities')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.user_id)
          .eq('status', 'done')

        const { count: newOpp } = await supabase
          .from('opportunities')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.user_id)
          .gte('created_at', startIso)

        opportunitiesTotal = total ?? 0
        opportunitiesCompleted = completed ?? 0
        opportunitiesNew = newOpp ?? 0
      }

      let journalEntries = 0
      if (user.include_journal) {
        const { count } = await supabase
          .from('daily_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.user_id)
          .gte('created_at', startIso)

        journalEntries = count ?? 0
      }

      // Fetch domain breakdown
      const { data: domains } = await supabase
        .from('life_domains')
        .select('id, name, color_theme')
        .eq('user_id', user.user_id)

      const domainMap = new Map((domains ?? []).map((d: any) => [d.id, { name: d.name, color: d.color_theme }]))

      const { data: oppByDomain } = await supabase
        .from('opportunities')
        .select('domain_id')
        .eq('user_id', user.user_id)
        .gte('created_at', startIso)

      const domainCounts: Record<string, number> = {}
      for (const opp of oppByDomain ?? []) {
        const domainId = (opp as any).domain_id
        if (domainId) domainCounts[domainId] = (domainCounts[domainId] ?? 0) + 1
      }

      const topDomains = Object.entries(domainCounts)
        .map(([id, count]) => ({
          name: domainMap.get(id)?.name ?? 'Unknown',
          color: domainMap.get(id)?.color ?? '#6b7280',
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // Build digest
      const period = formatPeriod(periodStart, periodEnd)
      const digestText = [
        `Your Idea Spark Digest – ${period}`,
        '',
        `Opportunities: ${opportunitiesCompleted}/${opportunitiesTotal} completed (${opportunitiesNew} new)`,
        `Journal entries: ${journalEntries}`,
        '',
        'Top domains:',
        ...topDomains.map((d) => `  ${d.name}: ${d.count}`),
        '',
        `Open Idea Spark: ${appUrl}`,
        '',
        `Manage preferences: ${appUrl}/settings`,
      ].join('\n')

      // Send email via Resend (or log if no API key)
      if (resendApiKey) {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [userEmail],
            subject: `Your Idea Spark Digest – ${period}`,
            text: digestText,
          }),
        })

        if (!emailResponse.ok) {
          const errText = await emailResponse.text()
          results.push({ userId: user.user_id, success: false, error: `Resend error: ${errText}` })
          continue
        }
      }

      // Log digest sent
      await supabase.from('digest_send_log').insert({
        user_id: user.user_id,
        frequency: user.frequency,
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        opportunities_count: opportunitiesNew,
        journal_count: journalEntries,
      })

      // Update last_sent_at
      await supabase
        .from('digest_preferences')
        .update({ last_sent_at: now.toISOString() })
        .eq('user_id', user.user_id)

      results.push({ userId: user.user_id, success: true })
    } catch (err) {
      results.push({ userId: user.user_id, success: false, error: String(err) })
    }
  }

  const sent = results.filter((r) => r.success).length
  return jsonResponse({
    processed: results.length,
    sent,
    failed: results.length - sent,
    results,
  })
})
