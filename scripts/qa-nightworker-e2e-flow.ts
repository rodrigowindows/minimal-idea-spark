/**
 * E2E flow: valida arquitetura Night Worker (conectividade → criar → ler → PATCH → ler → filtro → eventos).
 * Uso: node --env-file=.env --experimental-strip-types scripts/qa-nightworker-e2e-flow.ts
 * Token: Bearer do ambiente (VITE_SUPABASE_PUBLISHABLE_KEY, VITE_NW_ANON_TOKEN ou SUPABASE_SERVICE_ROLE_KEY).
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
  console.log(`  Método: ${method}`)
  console.log(`  URL: ${url}`)
  if (payload !== undefined) console.log(`  Payload enviado: ${JSON.stringify(payload)}`)
  console.log(`  Status recebido: ${status}`)
  console.log(`  Resumo do body: ${bodySummary}`)
}

async function api<T = unknown>(path: string, opts: { method?: string; body?: object } = {}): Promise<{ status: number; data: T }> {
  const url = path.startsWith('http') ? path : `${BASE_URL.replace(/\/+$/, '')}/${path.replace(/^\//, '')}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
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
  console.log('E2E Flow – Night Worker API')
  console.log('Base URL:', BASE_URL)
  console.log('Token:', TOKEN ? `${String(TOKEN).slice(0, 20)}...` : '(nenhum)')

  if (!BASE_URL) {
    summary.notes = 'BASE URL não definida (VITE_SUPABASE_URL ou VITE_NIGHTWORKER_API_URL)'
    console.log('\nSumário:', JSON.stringify(summary, null, 2))
    process.exit(1)
  }

  // 1) Conectividade: GET /prompts
  try {
    const { status, data } = await api<{ total?: number; prompts?: unknown[] }>('prompts')
    const total = (data as any)?.total
    const prompts = (data as any)?.prompts
    const hasShape = typeof total === 'number' && Array.isArray(prompts)
    step('1) Conectividade', 'GET', `${BASE_URL}/prompts`, undefined, status, `total=${total}, prompts.length=${prompts?.length ?? 0}`)
    if (status === 200 && hasShape) summary.connectivity = 'ok'
    else notes.push(`Conectividade: esperado 200 e { total, prompts[] }, obtido status=${status}, shape=${hasShape}`)
  } catch (e) {
    notes.push(`Conectividade: ${e instanceof Error ? e.message : e}`)
    step('1) Conectividade', 'GET', `${BASE_URL}/prompts`, undefined, 0, `Erro: ${e}`)
  }

  // 2) Criação: POST /prompts
  const postBody = {
    provider: 'codex',
    name: 'qa-e2e-flow',
    content: 'Fluxo E2E QA',
    target_folder: 'C:\\code\\dummy',
  }
  try {
    const { status, data } = await api<{ id?: string }>('prompts', { method: 'POST', body: postBody })
    const id = (data as any)?.id
    step('2) Criação', 'POST', `${BASE_URL}/prompts`, postBody, status, id ? `id=${id}` : JSON.stringify(data))
    if (status === 200 && id) {
      createdId = id
      summary.create = 'ok'
    } else notes.push(`Criação: esperado { id }, status=${status}, body=${JSON.stringify(data)}`)
  } catch (e) {
    notes.push(`Criação: ${e instanceof Error ? e.message : e}`)
    step('2) Criação', 'POST', `${BASE_URL}/prompts`, postBody, 0, `Erro: ${e}`)
  }

  if (!createdId) {
    summary.notes = notes.join('; ')
    console.log('\nSumário final:', JSON.stringify(summary, null, 2))
    process.exit(1)
  }

  // 3) Leitura inicial: GET /prompts/{id} → status pending
  try {
    const { status, data } = await api<{ status?: string }>(`prompts/${createdId}`)
    const st = (data as any)?.status
    step('3) Leitura inicial', 'GET', `${BASE_URL}/prompts/${createdId}`, undefined, status, `status=${st}`)
    if (status !== 200 || st !== 'pending') notes.push(`Leitura inicial: esperado status=pending, obtido status=${st}, http=${status}`)
  } catch (e) {
    notes.push(`Leitura inicial: ${e instanceof Error ? e.message : e}`)
    step('3) Leitura inicial', 'GET', `${BASE_URL}/prompts/${createdId}`, undefined, 0, `Erro: ${e}`)
  }

  // 4) Simular worker: PATCH → status=done
  const patchBody = {
    status: 'done',
    result_content: 'resultado ok',
    result_path: 'C:\\results\\qa.txt',
    attempts: 1,
    event_type: 'done',
    event_message: 'worker simulated',
  }
  try {
    const { status, data } = await api<{ id?: string; status?: string }>(`prompts/${createdId}`, { method: 'PATCH', body: patchBody })
    const st = (data as any)?.status
    step('4) PATCH (worker)', 'PATCH', `${BASE_URL}/prompts/${createdId}`, patchBody, status, `id=${(data as any)?.id}, status=${st}`)
    if (status === 200 && st === 'done') summary.update = 'ok'
    else if (status === 409) notes.push('PATCH retornou 409 (já processado); considerar ok se idempotente')
    else notes.push(`PATCH: esperado status=done, status=${status}, body.status=${st}`)
  } catch (e) {
    notes.push(`PATCH: ${e instanceof Error ? e.message : e}`)
    step('4) PATCH (worker)', 'PATCH', `${BASE_URL}/prompts/${createdId}`, patchBody, 0, `Erro: ${e}`)
  }

  // 5) Leitura pós-atualização: GET /prompts/{id} → status=done, result_content preenchido
  try {
    const { status, data } = await api<{ status?: string; result_content?: string }>(`prompts/${createdId}`)
    const st = (data as any)?.status
    const rc = (data as any)?.result_content
    step('5) Leitura pós-atualização', 'GET', `${BASE_URL}/prompts/${createdId}`, undefined, status, `status=${st}, result_content=${rc ? rc.slice(0, 40) + '...' : rc}`)
    if (status !== 200 || st !== 'done' || !rc) notes.push(`Pós-update: esperado status=done e result_content, status=${st}, result_content preenchido=${!!rc}`)
  } catch (e) {
    notes.push(`Pós-update: ${e instanceof Error ? e.message : e}`)
    step('5) Leitura pós-atualização', 'GET', `${BASE_URL}/prompts/${createdId}`, undefined, 0, `Erro: ${e}`)
  }

  // 6) Filtrado: GET /prompts?status=done&provider=codex
  try {
    const { status, data } = await api<{ total?: number; prompts?: { id: string }[] }>('prompts?status=done&provider=codex')
    const prompts = (data as any)?.prompts ?? []
    const found = Array.isArray(prompts) && prompts.some((p: { id: string }) => p.id === createdId)
    step('6) Filtrado', 'GET', `${BASE_URL}/prompts?status=done&provider=codex`, undefined, status, `total=${(data as any)?.total}, id criado na lista=${found}`)
    if (status === 200 && found) summary.filter = 'ok'
    else notes.push(`Filtro: id ${createdId} na lista status=done&provider=codex = ${found}`)
  } catch (e) {
    notes.push(`Filtro: ${e instanceof Error ? e.message : e}`)
    step('6) Filtrado', 'GET', `${BASE_URL}/prompts?status=done&provider=codex`, undefined, 0, `Erro: ${e}`)
  }

  // 7) Evento: GET /prompts/{id} → events[] contém "done"
  try {
    const { status, data } = await api<{ events?: { type?: string; message?: string }[] }>(`prompts/${createdId}`)
    const events = (data as any)?.events ?? []
    const hasDone = Array.isArray(events) && events.some((e: { type?: string; message?: string }) => e.type === 'done' || (e.message && e.message.includes('worker simulated')))
    step('7) Evento', 'GET', `${BASE_URL}/prompts/${createdId}`, undefined, status, `events.length=${events?.length}, contém done=${hasDone}`)
    if (!hasDone && events.length > 0) notes.push('Eventos: nenhum evento com type=done ou message "worker simulated"')
  } catch (e) {
    notes.push(`Eventos: ${e instanceof Error ? e.message : e}`)
    step('7) Evento', 'GET', `${BASE_URL}/prompts/${createdId}`, undefined, 0, `Erro: ${e}`)
  }

  summary.notes = notes.length ? notes.join('; ') : 'Fluxo E2E concluído sem falhas.'
  console.log('\n--- Sumário final ---')
  console.log(JSON.stringify(summary, null, 2))
  process.exit(
    summary.connectivity === 'ok' && summary.create === 'ok' && summary.update === 'ok' && summary.filter === 'ok' ? 0 : 1
  )
}

main()
