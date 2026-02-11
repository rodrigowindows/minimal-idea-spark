/**
 * E2E flow for Night Worker API.
 * Usage: node --env-file=.env --experimental-strip-types scripts/qa-nightworker-e2e-flow.ts
 */

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env')
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
      if (m && !process.env[m[1]]) {
        const val = m[2].replace(/^["']|["']$/g, '').trim()
        process.env[m[1]] = val
      }
    }
  }
}
loadEnv()

const BASE_URL =
  process.env.VITE_NIGHTWORKER_API_URL ||
  (process.env.VITE_SUPABASE_URL
    ? `${process.env.VITE_SUPABASE_URL}/functions/v1/nightworker-prompts`
    : '')

const TOKEN =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_NW_ANON_TOKEN ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  ''

const ANON_TOKEN =
  process.env.VITE_NW_ANON_TOKEN ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  ''

const summary: {
  connectivity: 'ok' | 'fail'
  create: 'ok' | 'fail'
  update: 'ok' | 'fail'
  filter: 'ok' | 'fail'
  notes: string
} = {
  connectivity: 'fail',
  create: 'fail',
  update: 'fail',
  filter: 'fail',
  notes: '',
}

const notes: string[] = []

function step(stepName: string, method: string, url: string, payload: unknown, status: number, bodySummary: string) {
  console.log(`\n--- ${stepName} ---`)
  console.log(`  Method: ${method}`)
  console.log(`  URL: ${url}`)
  if (payload !== undefined) console.log(`  Payload: ${JSON.stringify(payload)}`)
  console.log(`  Status: ${status}`)
  console.log(`  Body summary: ${bodySummary}`)
}

async function api<T = unknown>(path: string, opts: { method?: string; body?: object; token?: string } = {}): Promise<{ status: number; data: T }> {
  const url = path.startsWith('http') ? path : `${BASE_URL.replace(/\/+$/, '')}/${path.replace(/^\//, '')}`
  const token = opts.token !== undefined ? opts.token : TOKEN
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const ct = res.headers.get('content-type') || ''
  const data = ct.includes('application/json') ? await res.json().catch(() => ({})) : await res.text()
  return { status: res.status, data: data as T }
}

let createdId: string | null = null

async function main() {
  console.log('E2E Flow - Night Worker API')
  console.log('Base URL:', BASE_URL)
  console.log('Token:', TOKEN ? `${String(TOKEN).slice(0, 20)}...` : '(none)')

  if (!BASE_URL) {
    summary.notes = 'Base URL is not defined (VITE_SUPABASE_URL or VITE_NIGHTWORKER_API_URL)'
    console.log('\nSummary:', JSON.stringify(summary, null, 2))
    process.exit(1)
  }

  // 0) Optional health check
  try {
    const { status, data } = await api<Record<string, unknown>>('health')
    step('0) Health (optional)', 'GET', `${BASE_URL}/health`, undefined, status, JSON.stringify(data))
  } catch (e) {
    step('0) Health (optional)', 'GET', `${BASE_URL}/health`, undefined, 0, `Error: ${e}`)
  }

  // 1) Connectivity: GET /prompts
  try {
    const { status, data } = await api<{ total?: number; prompts?: unknown[] }>('prompts')
    const total = (data as any)?.total
    const prompts = (data as any)?.prompts
    const hasShape = typeof total === 'number' && Array.isArray(prompts)
    step('1) Connectivity', 'GET', `${BASE_URL}/prompts`, undefined, status, `total=${total}, prompts.length=${prompts?.length ?? 0}`)
    if (status === 200 && hasShape) summary.connectivity = 'ok'
    else notes.push(`Connectivity expected 200 + shape, got status=${status}, shape=${hasShape}`)
  } catch (e) {
    notes.push(`Connectivity: ${e instanceof Error ? e.message : e}`)
    step('1) Connectivity', 'GET', `${BASE_URL}/prompts`, undefined, 0, `Error: ${e}`)
  }

  // 2) Create: POST /prompts
  const postBody = {
    provider: 'codex',
    name: 'qa-e2e-flow',
    content: 'E2E QA flow',
    target_folder: 'C:\\code\\dummy',
  }
  try {
    const { status, data } = await api<{ id?: string }>('prompts', { method: 'POST', body: postBody })
    const id = (data as any)?.id
    step('2) Create', 'POST', `${BASE_URL}/prompts`, postBody, status, id ? `id=${id}` : JSON.stringify(data))
    if ((status === 200 || status === 201) && id) {
      createdId = id
      summary.create = 'ok'
    } else notes.push(`Create expected id with 200|201, got status=${status}, body=${JSON.stringify(data)}`)
  } catch (e) {
    notes.push(`Create: ${e instanceof Error ? e.message : e}`)
    step('2) Create', 'POST', `${BASE_URL}/prompts`, postBody, 0, `Error: ${e}`)
  }

  if (!createdId) {
    summary.notes = notes.join('; ')
    console.log('\nFinal summary:', JSON.stringify(summary, null, 2))
    process.exit(1)
  }

  // 3) Initial read
  try {
    const { status, data } = await api<{ status?: string }>(`prompts/${createdId}`)
    const st = (data as any)?.status
    step('3) Initial read', 'GET', `${BASE_URL}/prompts/${createdId}`, undefined, status, `status=${st}`)
    if (status !== 200 || st !== 'pending') notes.push(`Initial read expected pending, got status=${st}, http=${status}`)
  } catch (e) {
    notes.push(`Initial read: ${e instanceof Error ? e.message : e}`)
    step('3) Initial read', 'GET', `${BASE_URL}/prompts/${createdId}`, undefined, 0, `Error: ${e}`)
  }

  // 3.5) Test PATCH with anon token (should return 403)
  if (ANON_TOKEN && ANON_TOKEN !== TOKEN) {
    try {
      const { status, data } = await api<{ error?: string }>(`prompts/${createdId}`, {
        method: 'PATCH',
        body: { status: 'done' },
        token: ANON_TOKEN,
      })
      step('3.5) PATCH with anon (403 expected)', 'PATCH', `${BASE_URL}/prompts/${createdId}`, { status: 'done' }, status, JSON.stringify(data).slice(0, 100))
      if (status === 403) {
        console.log('  ✓ Correctly rejected anon token')
      } else {
        notes.push(`PATCH with anon expected 403, got ${status}`)
      }
    } catch (e) {
      notes.push(`PATCH anon test: ${e instanceof Error ? e.message : e}`)
      step('3.5) PATCH with anon (403 expected)', 'PATCH', `${BASE_URL}/prompts/${createdId}`, { status: 'done' }, 0, `Error: ${e}`)
    }
  }

  // 4) Simulate worker PATCH done
  const patchBody = {
    status: 'done',
    result_content: 'result ok',
    result_path: 'C:\\results\\qa.txt',
    attempts: 1,
    event_type: 'done',
    event_message: 'worker simulated',
  }
  try {
    const { status, data } = await api<{ id?: string; status?: string }>(`prompts/${createdId}`, { method: 'PATCH', body: patchBody })
    const st = (data as any)?.status
    step('4) PATCH worker', 'PATCH', `${BASE_URL}/prompts/${createdId}`, patchBody, status, `id=${(data as any)?.id}, status=${st}`)
    if (status === 200 && st === 'done') summary.update = 'ok'
    else if (status === 409) notes.push('PATCH returned 409 (already processed); treat as idempotent')
    else notes.push(`PATCH expected done, got status=${status}, body.status=${st}`)
  } catch (e) {
    notes.push(`PATCH: ${e instanceof Error ? e.message : e}`)
    step('4) PATCH worker', 'PATCH', `${BASE_URL}/prompts/${createdId}`, patchBody, 0, `Error: ${e}`)
  }

  // 5) Read after update
  try {
    const { status, data } = await api<{ status?: string; result_content?: string }>(`prompts/${createdId}`)
    const st = (data as any)?.status
    const rc = (data as any)?.result_content
    step('5) Read after update', 'GET', `${BASE_URL}/prompts/${createdId}`, undefined, status, `status=${st}, hasResult=${!!rc}`)
    if (status !== 200 || st !== 'done' || !rc) notes.push(`Post-update expected done + result_content, got status=${st}`)
  } catch (e) {
    notes.push(`Post-update: ${e instanceof Error ? e.message : e}`)
    step('5) Read after update', 'GET', `${BASE_URL}/prompts/${createdId}`, undefined, 0, `Error: ${e}`)
  }

  // 6) Filter
  try {
    const { status, data } = await api<{ total?: number; prompts?: { id: string }[] }>('prompts?status=done&provider=codex')
    const prompts = (data as any)?.prompts ?? []
    const found = Array.isArray(prompts) && prompts.some((p: { id: string }) => p.id === createdId)
    step('6) Filter', 'GET', `${BASE_URL}/prompts?status=done&provider=codex`, undefined, status, `total=${(data as any)?.total}, found=${found}`)
    if (status === 200 && found) summary.filter = 'ok'
    else notes.push(`Filter missing id ${createdId}`)
  } catch (e) {
    notes.push(`Filter: ${e instanceof Error ? e.message : e}`)
    step('6) Filter', 'GET', `${BASE_URL}/prompts?status=done&provider=codex`, undefined, 0, `Error: ${e}`)
  }

  // 7) Event check
  try {
    const { status, data } = await api<{ events?: { type?: string; message?: string }[] }>(`prompts/${createdId}`)
    const events = (data as any)?.events ?? []
    const hasDone = Array.isArray(events) && events.some((e: { type?: string; message?: string }) => e.type === 'done' || (e.message && e.message.includes('worker simulated')))
    step('7) Events', 'GET', `${BASE_URL}/prompts/${createdId}`, undefined, status, `events.length=${events?.length}, hasDone=${hasDone}`)
    if (!hasDone && events.length > 0) notes.push('Events do not contain done marker')
  } catch (e) {
    notes.push(`Events: ${e instanceof Error ? e.message : e}`)
    step('7) Events', 'GET', `${BASE_URL}/prompts/${createdId}`, undefined, 0, `Error: ${e}`)
  }

  summary.notes = notes.length ? notes.join('; ') : 'E2E flow completed without failures.'
  console.log('\n--- Final summary ---')
  console.log(JSON.stringify(summary, null, 2))
  process.exit(
    summary.connectivity === 'ok' && summary.create === 'ok' && summary.update === 'ok' && summary.filter === 'ok' ? 0 : 1
  )
}

main()
