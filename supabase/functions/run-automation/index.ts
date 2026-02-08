import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseClient } from '../_shared/supabase.ts'

interface AutomationAction {
  kind: string
  title?: string
  body?: string
  to?: string
  subject?: string
  message?: string
  url?: string
  method?: string
  headers?: Record<string, string>
  seconds?: number
  amount?: number
  reason?: string
  field?: string
  op?: string
  value?: string | number
  thenActions?: AutomationAction[]
  elseActions?: AutomationAction[]
  entity?: string
  entityId?: string
  description?: string
  domain_id?: string
  type?: string
  priority?: number
}

interface AutomationRow {
  id: string
  name: string
  enabled: boolean
  trigger: Record<string, unknown>
  actions: AutomationAction[]
  user_id: string
}

interface RunAutomationBody {
  automation_id: string
  context: { event?: string; payload?: Record<string, unknown>; user_id: string }
}

function evaluateCondition(action: AutomationAction, payload: Record<string, unknown>): boolean {
  const v = payload[action.field || '']
  if (v === undefined) return false
  switch (action.op) {
    case 'eq': return v === action.value
    case 'gt': return Number(v) > Number(action.value)
    case 'lt': return Number(v) < Number(action.value)
    case 'contains': return String(v).includes(String(action.value))
    default: return false
  }
}

async function executeActions(
  actions: AutomationAction[],
  ctx: RunAutomationBody['context'],
  supabase: ReturnType<typeof getSupabaseClient>
): Promise<{ executed: number; errors: string[] }> {
  let executed = 0
  const errors: string[] = []

  for (const action of actions) {
    try {
      switch (action.kind) {
        case 'log':
          console.log('[Automation]', action.message)
          executed++
          break

        case 'send_notification':
          await supabase.from('notifications').insert({
            user_id: ctx.user_id,
            title: action.title || 'Automation',
            body: action.body || '',
            read: false,
            created_at: new Date().toISOString(),
          })
          executed++
          break

        case 'create_task':
          await supabase.from('opportunities').insert({
            user_id: ctx.user_id,
            title: action.title || 'New task',
            description: action.description || 'Created by automation',
            type: action.type || 'action',
            status: 'backlog',
            priority: action.priority ?? 5,
            strategic_value: 5,
            domain_id: action.domain_id || null,
          })
          executed++
          break

        case 'send_email':
          console.log('[Automation] Email stub:', action.to, action.subject)
          executed++
          break

        case 'webhook':
          if (action.url) {
            await fetch(action.url, {
              method: action.method || 'POST',
              headers: { 'Content-Type': 'application/json', ...(action.headers || {}) },
              body: action.method !== 'GET' ? (action.body || '{}') : undefined,
            })
          }
          executed++
          break

        case 'delay':
          await new Promise(r => setTimeout(r, (action.seconds || 1) * 1000))
          executed++
          break

        case 'condition': {
          const branch = evaluateCondition(action, ctx.payload || {})
            ? (action.thenActions || [])
            : (action.elseActions || [])
          const sub = await executeActions(branch, ctx, supabase)
          executed += sub.executed
          errors.push(...sub.errors)
          break
        }

        case 'add_xp':
          await supabase.rpc('add_user_xp', {
            p_user_id: ctx.user_id,
            p_amount: action.amount || 0,
          })
          executed++
          break

        case 'update_field':
          if (action.entity && action.entityId && action.field) {
            const table = action.entity === 'opportunity' ? 'opportunities'
              : action.entity === 'habit' ? 'habits'
              : action.entity === 'goal' ? 'goals'
              : null
            if (table) {
              await supabase.from(table).update({ [action.field]: action.value }).eq('id', action.entityId)
            }
          }
          executed++
          break

        default:
          console.warn('[Automation] Unknown action kind:', action.kind)
      }
    } catch (e) {
      errors.push(`${action.kind}: ${String(e)}`)
    }
  }

  return { executed, errors }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    let body: RunAutomationBody
    try {
      body = (await req.json()) as RunAutomationBody
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const authHeader = req.headers.get('Authorization')
    const supabase = getSupabaseClient(authHeader)
    const { automation_id, context } = body

    // Fetch automation
    const { data: automation, error: fetchError } = await supabase
      .from('automations')
      .select('*')
      .eq('id', automation_id)
      .single()

    if (fetchError || !automation) {
      return new Response(JSON.stringify({ ran: false, error: 'Automation not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    const auto = automation as AutomationRow
    if (!auto.enabled) {
      return new Response(JSON.stringify({ ran: false, reason: 'disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Execute actions
    const result = await executeActions(auto.actions || [], context, supabase)

    // Log execution
    await supabase.from('automation_logs').insert({
      automation_id,
      automation_name: auto.name,
      triggered_by: context.event || 'manual',
      success: result.errors.length === 0,
      actions_executed: result.executed,
      errors: result.errors.length > 0 ? result.errors : null,
      triggered_at: new Date().toISOString(),
      context,
    })

    // Update run count
    await supabase.rpc('increment_automation_run_count', { p_automation_id: automation_id })

    return new Response(JSON.stringify({
      ran: true,
      actions_executed: result.executed,
      errors: result.errors,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
