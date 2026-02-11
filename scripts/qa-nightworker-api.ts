/**
 * QA script: validates Night Worker API against the Supabase edge function.
 * Usage: node --env-file=.env --experimental-strip-types scripts/qa-nightworker-api.ts
 * Or: npx tsx scripts/qa-nightworker-api.ts
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

interface Summary {
  connectivity: 'ok' | 'fail'
  create: 'ok' | 'fail'
  read: 'ok' | 'fail'
  update: 'ok' | 'fail'
  filter: 'ok' | 'fail'
  notes: string
}

const summary: Summary = {
  connectivity: 'fail',
  create: 'fail',
  read: 'fail',
  update: 'fail',
  filter: 'fail',
  notes: '',
}

const notes: string[] = []

function logStep(
  step: string,
  method: string,
  url: string,
  body: unknown,
  status: number,
  payloadSummary: string
) {
  console.log(`\n--- ${step} ---`)
  console.log(`  Method: ${method}`)
  console.log(`  URL: ${url}`)
  if (body !== undefined) console.log(`  Body: ${JSON.stringify(body)}`)
  console.log(`  Status: ${status}`)
  console.log(`  Summary: ${payloadSummary}`)
}

async function request<T = unknown>(
  path: string,
  options: { method?: string; body?: object } = {}
): Promise<{ status: number; data: T }> {
  const url = path.startsWith('http') ? path : `${BASE_URL.replace(/\/+$/, '')}/${path.replace(/^\//, '')}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
  }
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const contentType = res.headers.get('content-type') || ''
  const data = contentType.includes('application/json')
    ? await res.json().catch(() => ({}))
    : await res.text()
  return { status: res.status, data: data as T }
}

let createdId: string | null = null

async function main() {
  console.log('Night Worker API - QA')
  console.log('Base URL:', BASE_URL)
  console.log('Token:', TOKEN ? `${TOKEN.slice(0, 20)}...` : '(none)')

  if (!BASE_URL) {
    summary.notes = 'VITE_SUPABASE_URL or VITE_NIGHTWORKER_API_URL is not defined'
    console.log('\n--- SUMMARY ---\n' + JSON.stringify(summary, null, 2))
    process.exit(1)
  }

  // Optional health check (informational)
  try {
    const { status, data } = await request<Record<string, unknown>>('health')
    logStep('0) Health (optional)', 'GET', `${BASE_URL}/health`, undefined, status, JSON.stringify(data))
  } catch (e) {
    logStep('0) Health (optional)', 'GET', `${BASE_URL}/health`, undefined, 0, `error: ${String(e)}`)
  }

  // 1) Connectivity: GET /prompts
  try {
    const { status, data } = await request<{ total?: number; prompts?: unknown[] }>('prompts')
    const hasTotal = typeof (data as any)?.total === 'number'
    const hasPrompts = Array.isArray((data as any)?.prompts)
    logStep(
      '1) Connectivity',
      'GET',
      `${BASE_URL}/prompts`,
      undefined,
      status,
      `total=${(data as any)?.total}, prompts.length=${(data as any)?.prompts?.length ?? 0}`
    )
    if (status === 200 && hasTotal && hasPrompts) {
      summary.connectivity = 'ok'
    } else {
      notes.push(`GET /prompts expected 200 and {total,prompts[]}, got status=${status}`)
    }
  } catch (e) {
    notes.push(`GET /prompts failed: ${e instanceof Error ? e.message : e}`)
    logStep('1) Connectivity', 'GET', `${BASE_URL}/prompts`, undefined, 0, `error: ${e}`)
  }

  // 2) Create: POST /prompts
  const postBody = {
    provider: 'codex',
    name: 'qa-api-script',
    content: 'Hello from QA script',
    target_folder: 'C:\\code\\dummy',
  }
  try {
    const { status, data } = await request<{ id?: string; error?: string }>('prompts', {
      method: 'POST',
      body: postBody,
    })
    const id = (data as any)?.id
    logStep('2) Create', 'POST', `${BASE_URL}/prompts`, postBody, status, id ? `id=${id}` : JSON.stringify(data))
    if ((status === 200 || status === 201) && id) {
      createdId = id
      summary.create = 'ok'
    } else {
      notes.push(`POST /prompts expected 200|201 and id, got status=${status}`)
    }
  } catch (e) {
    notes.push(`POST /prompts failed: ${e instanceof Error ? e.message : e}`)
    logStep('2) Create', 'POST', `${BASE_URL}/prompts`, postBody, 0, `error: ${e}`)
  }

  if (!createdId) {
    summary.notes = notes.join('; ')
    console.log('\n--- SUMMARY ---\n' + JSON.stringify(summary, null, 2))
    process.exit(1)
  }

  // 3) Read: GET /prompts/{id}
  try {
    const { status, data } = await request<{ status?: string }>(`prompts/${createdId}`)
    const st = (data as any)?.status
    logStep('3) Read', 'GET', `${BASE_URL}/prompts/${createdId}`, undefined, status, `status=${st}`)
    if (status === 200 && st === 'pending') {
      summary.read = 'ok'
    } else {
      notes.push(`GET /prompts/${createdId} expected pending, got status=${st}`)
    }
  } catch (e) {
    notes.push(`GET /prompts/${createdId} failed: ${e instanceof Error ? e.message : e}`)
    logStep('3) Read', 'GET', `${BASE_URL}/prompts/${createdId}`, undefined, 0, `error: ${e}`)
  }

  // 4) Update: PATCH /prompts/{id}
  const patchBody = { status: 'done', result_content: 'ok' }
  try {
    const { status, data } = await request<{ id?: string; status?: string }>(`prompts/${createdId}`, {
      method: 'PATCH',
      body: patchBody,
    })
    const id = (data as any)?.id
    const st = (data as any)?.status
    logStep('4) Update', 'PATCH', `${BASE_URL}/prompts/${createdId}`, patchBody, status, `id=${id}, status=${st}`)
    if (status === 200 && id === createdId && st === 'done') {
      summary.update = 'ok'
    } else {
      notes.push(`PATCH expected done, got status=${status}, body.status=${st}`)
    }
  } catch (e) {
    notes.push(`PATCH /prompts/${createdId} failed: ${e instanceof Error ? e.message : e}`)
    logStep('4) Update', 'PATCH', `${BASE_URL}/prompts/${createdId}`, patchBody, 0, `error: ${e}`)
  }

  // 5) Filter list
  try {
    const { status, data } = await request<{ total?: number; prompts?: { id: string }[] }>('prompts?status=done&provider=codex')
    const prompts = (data as any)?.prompts ?? []
    const found = Array.isArray(prompts) && prompts.some((p: { id: string }) => p.id === createdId)
    logStep('5) Filter', 'GET', `${BASE_URL}/prompts?status=done&provider=codex`, undefined, status, `found=${found}`)
    if (status === 200 && found) {
      summary.filter = 'ok'
    } else {
      notes.push(`GET filter did not include created id ${createdId}`)
    }
  } catch (e) {
    notes.push(`GET filter failed: ${e instanceof Error ? e.message : e}`)
    logStep('5) Filter', 'GET', `${BASE_URL}/prompts?status=done&provider=codex`, undefined, 0, `error: ${e}`)
  }

  summary.notes = notes.length ? notes.join('; ') : 'All checks passed.'
  console.log('\n--- SUMMARY ---\n' + JSON.stringify(summary, null, 2))

  process.exit(
    summary.connectivity === 'ok' &&
      summary.create === 'ok' &&
      summary.read === 'ok' &&
      summary.update === 'ok' &&
      summary.filter === 'ok'
      ? 0
      : 1
  )
}

main()
