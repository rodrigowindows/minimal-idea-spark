import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { NightWorkerConfig } from '@/types/night-worker'

const STORAGE_KEY = 'nightworker_config_v1'
const ENV_BASE_URL = (import.meta.env.VITE_NIGHTWORKER_API_URL as string | undefined)?.replace(/\/+$/, '')
const SUGGESTED_SUPABASE =
  (import.meta.env.VITE_SUPABASE_URL
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nightworker-prompts`
    : undefined)
const DEFAULT_BASE_URL = ENV_BASE_URL || SUGGESTED_SUPABASE || 'https://coder-ai.workfaraway.com'

export class ApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

export type ApiFetchOptions = RequestInit & {
  skipAuth?: boolean
  retry?: number
  silentStatuses?: number[]
  timeout?: number
}

interface NightWorkerContextValue {
  config: NightWorkerConfig
  setConfig: (partial: Partial<NightWorkerConfig>) => void
  setToken: (token: string | null) => void
  clearAuth: () => void
  apiFetch: <T = unknown>(path: string, options?: ApiFetchOptions) => Promise<T>
  isConnected: boolean
  lastError: string | null
}

const defaultConfig: NightWorkerConfig = {
  baseUrl: DEFAULT_BASE_URL,
  token: null,
  port: 443,
  workers: {
    claude: {
      active: true,
      provider: 'claude_cli',
      windowStart: '12:00',
      windowEnd: '11:59',
      intervalSeconds: 60,
      timeoutSeconds: 0,
      maxFiles: 3,
      maxPromptSize: 8000,
      folder: 'C:\\\\night-worker\\\\claude',
    },
    codex: {
      active: true,
      provider: 'codex_cli',
      windowStart: '12:00',
      windowEnd: '11:59',
      intervalSeconds: 60,
      timeoutSeconds: 0,
      maxFiles: 3,
      maxPromptSize: 8000,
      folder: 'C:\\\\night-worker\\\\codex',
      cliPath: 'C:\\\\code\\\\codex-cli',
      model: 'gpt-4.1-mini',
    },
  },
  providers: ['claude_cli', 'codex_cli', 'openai_api'],
}

function migrateBaseUrl(url?: string) {
  const current = sanitizeBaseUrl(url || DEFAULT_BASE_URL)
  // Highest priority: explicit env override
  if (ENV_BASE_URL) return sanitizeBaseUrl(ENV_BASE_URL)
  // Legacy migration: only migrate localhost:5555 to Supabase (if available)
  if (current.includes('localhost:5555')) return sanitizeBaseUrl(SUGGESTED_SUPABASE ?? DEFAULT_BASE_URL)
  // Respect user's manual choice: if they saved coder-ai or any other URL, keep it
  return current
}

function loadConfig(): NightWorkerConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as NightWorkerConfig
      return {
        ...defaultConfig,
        ...parsed,
        baseUrl: migrateBaseUrl(parsed.baseUrl),
        workers: {
          claude: { ...defaultConfig.workers.claude, ...(parsed.workers?.claude || {}) },
          codex: { ...defaultConfig.workers.codex, ...(parsed.workers?.codex || {}) },
        },
      }
    }
  } catch {
    /* ignore corrupted storage */
  }
  return defaultConfig
}

const NightWorkerContext = createContext<NightWorkerContextValue | undefined>(undefined)

function sanitizeBaseUrl(url: string) {
  if (!url) return DEFAULT_BASE_URL
  return url.replace(/\/+$/, '')
}

export function NightWorkerProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<NightWorkerConfig>(() => loadConfig())
  const [lastError, setLastError] = useState<string | null>(null)
  const envToken = import.meta.env.VITE_NW_ANON_TOKEN as string | undefined

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.info('[NightWorker] Provider init', {
        baseUrl: config.baseUrl,
        suggestedSupabase: SUGGESTED_SUPABASE,
        envBaseUrl: ENV_BASE_URL,
        defaultBaseUrl: DEFAULT_BASE_URL,
        hasEnvToken: !!envToken,
        VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
        VITE_NIGHTWORKER_API_URL: import.meta.env.VITE_NIGHTWORKER_API_URL
      })
    }

    setConfigState((prev) => {
      const nextBase = migrateBaseUrl(prev.baseUrl)
      const nextToken = prev.token ?? envToken ?? null
      if (import.meta.env.DEV) {
        console.info('[NightWorker] After migration', {
          prevBase: prev.baseUrl,
          nextBase,
          prevToken: prev.token ? '***' : null,
          nextToken: nextToken ? '***' : null
        })
      }
      return { ...prev, baseUrl: nextBase, token: nextToken }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    } catch {
      /* ignore */
    }
  }, [config])

  const setConfig = useCallback((partial: Partial<NightWorkerConfig>) => {
    setConfigState((prev) => ({
      ...prev,
      ...partial,
      baseUrl: sanitizeBaseUrl(partial.baseUrl ?? prev.baseUrl),
      workers: {
        claude: { ...prev.workers.claude, ...(partial.workers?.claude || {}) },
        codex: { ...prev.workers.codex, ...(partial.workers?.codex || {}) },
      },
    }))
  }, [])

  const setToken = useCallback((token: string | null) => {
    setConfigState((prev) => ({ ...prev, token: token || null }))
  }, [])

  const clearAuth = useCallback(() => {
    setConfigState((prev) => ({ ...prev, token: null }))
  }, [])

  const apiFetch = useCallback(
    async <T,>(path: string, options?: ApiFetchOptions) => {
      const { skipAuth = false, retry = 3, silentStatuses = [], timeout = 10_000, headers, ...rest } = options || {}
      const base = sanitizeBaseUrl(config.baseUrl || DEFAULT_BASE_URL)
      const url = path.startsWith('http') ? path : `${base}/${path.replace(/^\//, '')}`
      const maxAttempts = Number.isFinite(retry) ? Math.max(1, Math.floor(retry)) : 3
      const silentStatusSet = new Set(silentStatuses)

      if (import.meta.env.DEV) {
        console.log('[apiFetch] Starting request', {
          path,
          url,
          hasToken: !!config.token,
          skipAuth,
          method: rest.method || 'GET',
        })
      }

      const mergedHeaders = new Headers(headers || {})
      if (!mergedHeaders.has('Content-Type') && rest.body && !(rest.body instanceof FormData)) {
        mergedHeaders.set('Content-Type', 'application/json')
      }
      // Token is now optional - edge function uses service-role internally
      if (!skipAuth && config.token) {
        mergedHeaders.set('Authorization', `Bearer ${config.token}`)
      }

      let attempt = 0
      let error: unknown

      while (attempt < maxAttempts) {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)
        // If caller provided a signal, abort our controller if theirs aborts
        if (rest.signal) {
          rest.signal.addEventListener('abort', () => controller.abort(), { once: true })
        }
        try {
          if (import.meta.env.DEV) {
            console.log(`[apiFetch] Attempt ${attempt + 1}/${maxAttempts}`)
          }

          const response = await fetch(url, {
            ...rest,
            headers: mergedHeaders,
            signal: controller.signal,
          })

          clearTimeout(timeoutId)

          if (import.meta.env.DEV) {
            console.log(`[apiFetch] Response ${response.status}`, { ok: response.ok })
          }

          if (response.status === 401) {
            setLastError('auth')
            throw new ApiError('Unauthorized', 401)
          }
          if (!response.ok) {
            const text = await response.text()
            const apiError = new ApiError(text || response.statusText, response.status)
            if (!silentStatusSet.has(response.status)) {
              console.error('[NightWorker] API error', { url, status: response.status, body: text })
            }
            throw apiError
          }
          const contentType = response.headers.get('content-type') || ''
          const data = response.status === 204
            ? null
            : contentType.includes('application/json')
              ? await response.json()
              : await response.text()
          setLastError(null)
          if (import.meta.env.DEV) {
            console.log('[NightWorker] ✓ API success', { url, status: response.status, dataType: typeof data })
          }
          return data as T
        } catch (err) {
          clearTimeout(timeoutId)
          // Treat AbortError as timeout — do not retry
          if (err instanceof DOMException && err.name === 'AbortError') {
            const timeoutErr = new ApiError(`Request timeout after ${timeout}ms`, 408)
            if (!silentStatusSet.has(408)) {
              console.error('[NightWorker] Request timeout', { url, timeout })
            }
            throw timeoutErr
          }
          error = err
          const silentError = err instanceof ApiError && silentStatusSet.has(err.status ?? -1)
          if (!silentError) {
            console.error(`[apiFetch] Attempt ${attempt + 1} failed:`, err)
          }
          attempt += 1
          if (silentError || attempt >= maxAttempts) break
          const delay = Math.min(4000, 250 * 2 ** attempt)
          if (import.meta.env.DEV) {
            console.log(`[apiFetch] Retrying in ${delay}ms...`)
          }
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
      const silentError = error instanceof ApiError && silentStatusSet.has(error.status ?? -1)
      if (!silentError) {
        console.error('[NightWorker] API fetch failed after all retries', { url, error })
      }
      throw error
    },
    [config.baseUrl, config.token]
  )

  const value = useMemo<NightWorkerContextValue>(
    () => ({
      config,
      setConfig,
      setToken,
      clearAuth,
      apiFetch,
      isConnected: true, // Always connected (no token required)
      lastError,
    }),
    [apiFetch, clearAuth, config, lastError, setConfig, setToken]
  )

  return <NightWorkerContext.Provider value={value}>{children}</NightWorkerContext.Provider>
}

export function useNightWorker() {
  const ctx = useContext(NightWorkerContext)
  if (!ctx) {
    // Graceful fallback when provider is not available (e.g., during SSR, old cached builds)
    console.warn('useNightWorker called outside NightWorkerProvider - returning default values')
    return {
      config: defaultConfig,
      setConfig: () => {},
      setToken: () => {},
      clearAuth: () => {},
      apiFetch: async () => {
        throw new Error('NightWorkerProvider not available')
      },
      isConnected: false,
      lastError: 'provider_missing',
    } as NightWorkerContextValue
  }
  return ctx
}
