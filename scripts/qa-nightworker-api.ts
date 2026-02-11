/**
 * QA script: valida o painel Night Worker contra a edge function Supabase.
 * Uso: node scripts/qa-nightworker-api.ts  ou  bun run scripts/qa-nightworker-api.ts
 * Requer .env com VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY (ou VITE_NW_ANON_TOKEN).
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
  console.log(`  Resumo: ${payloadSummary}`)
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
  console.log('Night Worker API – QA técnico')
  console.log('Base URL:', BASE_URL)
  console.log('Token:', TOKEN ? `${TOKEN.slice(0, 20)}...` : '(nenhum)')

  if (!BASE_URL) {
    summary.notes = 'VITE_SUPABASE_URL ou VITE_NIGHTWORKER_API_URL não definido'
    console.log('\n' + summary.notes)
    console.log('\n--- SUMÁRIO ---\n' + JSON.stringify(summary, null, 2))
    process.exit(1)
  }

  // 1) Conectividade: GET /prompts
  try {
    const { status, data } = await request<{ total?: number; prompts?: unknown[] }>('prompts')
    const hasTotal = typeof (data as any)?.total === 'number'
    const hasPrompts = Array.isArray((data as any)?.prompts)
    logStep(
      '1) Conectividade',
      'GET',
      `${BASE_URL}/prompts`,
      undefined,
      status,
      `total=${(data as any)?.total}, prompts.length=${(data as any)?.prompts?.length ?? 0}`
    )
    if (status === 200 && hasTotal && hasPrompts) {
      summary.connectivity = 'ok'
    } else {
      notes.push(`GET /prompts: esperado 200 e { total, prompts[] }, obtido status=${status}, total=${hasTotal}, prompts=${hasPrompts}`)
    }
  } catch (e) {
    notes.push(`GET /prompts falhou: ${e instanceof Error ? e.message : e}`)
    logStep('1) Conectividade', 'GET', `${BASE_URL}/prompts`, undefined, 0, `Erro: ${e}`)
  }

  // 2) Criação: POST /prompts
  const postBody = {
    provider: 'codex',
    name: 'qa-llm-test',
    content: 'Hello from QA',
    target_folder: 'C:\\code\\dummy',
  }
  try {
    const { status, data } = await request<{ id?: string; error?: string }>('prompts', {
      method: 'POST',
      body: postBody,
    })
    const id = (data as any)?.id
    logStep(
      '2) Criação',
      'POST',
      `${BASE_URL}/prompts`,
      postBody,
      status,
      id ? `id=${id}` : `error=${(data as any)?.error ?? 'no id'}`
    )
    if (status === 200 && id) {
      createdId = id
      summary.create = 'ok'
    } else {
      notes.push(`POST /prompts: esperado { id }, obtido status=${status}, body=${JSON.stringify(data)}`)
    }
  } catch (e) {
    notes.push(`POST /prompts falhou: ${e instanceof Error ? e.message : e}`)
    logStep('2) Criação', 'POST', `${BASE_URL}/prompts`, postBody, 0, `Erro: ${e}`)
  }

  if (!createdId) {
    summary.notes = notes.join('; ')
    console.log('\n--- SUMÁRIO ---\n' + JSON.stringify(summary, null, 2))
    process.exit(1)
  }

  // 3) Leitura: GET /prompts/{id}
  try {
    const { status, data } = await request<{ status?: string }>(`prompts/${createdId}`)
    const raw = data as Record<string, unknown>
    const st = (raw?.status ?? (raw as any)?.Status) as string | undefined
    const payloadSummary = st != null ? `status=${st}` : `(keys: ${raw ? Object.keys(raw).join(',') : ''})`
    logStep(
      '3) Leitura',
      'GET',
      `${BASE_URL}/prompts/${createdId}`,
      undefined,
      status,
      payloadSummary
    )
    if (status === 200 && st === 'pending') {
      summary.read = 'ok'
    } else {
      notes.push(`GET /prompts/${createdId}: esperado status=pending, obtido status=${st ?? 'undefined'}`)
    }
  } catch (e) {
    notes.push(`GET /prompts/${createdId} falhou: ${e instanceof Error ? e.message : e}`)
    logStep('3) Leitura', 'GET', `${BASE_URL}/prompts/${createdId}`, undefined, 0, `Erro: ${e}`)
  }

  // 4) Atualização: PATCH /prompts/{id}
  const patchBody = { status: 'done', result_content: 'ok' }
  try {
    const { status, data } = await request<{ id?: string; status?: string }>(`prompts/${createdId}`, {
      method: 'PATCH',
      body: patchBody,
    })
    const id = (data as any)?.id
    const st = (data as any)?.status
    logStep(
      '4) Atualização',
      'PATCH',
      `${BASE_URL}/prompts/${createdId}`,
      patchBody,
      status,
      `id=${id}, status=${st}`
    )
    if (status === 200 && id === createdId && st === 'done') {
      summary.update = 'ok'
    } else {
      notes.push(`PATCH: esperado { id, status="done" }, obtido status=${status}, id=${id}, status=${st}`)
    }

    // GET posterior para refletir mudança
    const { status: getStatus, data: getData } = await request<{ status?: string }>(`prompts/${createdId}`)
    const afterStatus = (getData as any)?.status
    console.log(`  GET posterior: status=${getStatus}, prompt.status=${afterStatus}`)
    if (summary.update === 'ok' && getStatus === 200 && afterStatus === 'done') {
      // já marcado update=ok
    } else if (summary.update === 'ok' && afterStatus !== 'done') {
      notes.push(`GET após PATCH: esperado status=done, obtido ${afterStatus}`)
    }
  } catch (e) {
    notes.push(`PATCH /prompts/${createdId} falhou: ${e instanceof Error ? e.message : e}`)
    logStep('4) Atualização', 'PATCH', `${BASE_URL}/prompts/${createdId}`, patchBody, 0, `Erro: ${e}`)
  }

  // 5) Listagem filtrada: GET /prompts?status=done
  try {
    const { status, data } = await request<{ total?: number; prompts?: { id: string }[] }>('prompts?status=done')
    const prompts = (data as any)?.prompts ?? []
    const found = Array.isArray(prompts) && prompts.some((p: { id: string }) => p.id === createdId)
    logStep(
      '5) Listagem filtrada',
      'GET',
      `${BASE_URL}/prompts?status=done`,
      undefined,
      status,
      `total=${(data as any)?.total}, encontrado id criado=${found}`
    )
    if (status === 200 && found) {
      summary.filter = 'ok'
    } else {
      notes.push(`GET ?status=done: id ${createdId} não encontrado na lista`)
    }
  } catch (e) {
    notes.push(`GET /prompts?status=done falhou: ${e instanceof Error ? e.message : e}`)
    logStep('5) Listagem filtrada', 'GET', `${BASE_URL}/prompts?status=done`, undefined, 0, `Erro: ${e}`)
  }

  summary.notes = notes.length ? notes.join('; ') : 'Todas as validações passaram.'
  console.log('\n--- SUMÁRIO ---\n' + JSON.stringify(summary, null, 2))
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
