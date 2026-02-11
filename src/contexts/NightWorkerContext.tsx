import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { NightWorkerConfig } from '@/types/night-worker'

const STORAGE_KEY = 'nightworker_config_v1'
const DEFAULT_BASE_URL = (import.meta.env.VITE_NIGHTWORKER_API_URL as string | undefined) || 'https://coder-ai.workfaraway.com'

export class ApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

export type ApiFetchOptions = RequestInit & { skipAuth?: boolean; retry?: number }

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

function loadConfig(): NightWorkerConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as NightWorkerConfig
      return {
        ...defaultConfig,
        ...parsed,
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
      const { skipAuth = false, retry = 3, headers, ...rest } = options || {}
      const base = sanitizeBaseUrl(config.baseUrl || DEFAULT_BASE_URL)
      const url = path.startsWith('http') ? path : `${base}/${path.replace(/^\//, '')}`

      console.log('[apiFetch] Starting request', {
        path,
        url,
        hasToken: !!config.token,
        skipAuth,
        baseUrl: config.baseUrl
      })

      const mergedHeaders = new Headers(headers || {})
      if (!mergedHeaders.has('Content-Type') && rest.body && !(rest.body instanceof FormData)) {
        mergedHeaders.set('Content-Type', 'application/json')
      }
      if (!skipAuth && config.token) {
        mergedHeaders.set('Authorization', `Bearer ${config.token}`)
      }

      let attempt = 0
      let error: unknown

      while (attempt < retry) {
        try {
          console.log(`[apiFetch] Attempt ${attempt + 1}/${retry} to ${url}`)
          const response = await fetch(url, { ...rest, headers: mergedHeaders })

          console.log(`[apiFetch] Response received`, {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
          })

          if (response.status === 401) {
            setLastError('auth')
            throw new ApiError('Unauthorized', 401)
          }
          if (!response.ok) {
            const text = await response.text()
            console.error('[NightWorker] API error', { url, status: response.status, body: text })
            throw new ApiError(text || response.statusText, response.status)
          }
          const contentType = response.headers.get('content-type') || ''
          const data = response.status === 204
            ? null
            : contentType.includes('application/json')
              ? await response.json()
              : await response.text()
          setLastError(null)
          console.log('[NightWorker] ✓ API success', { url, status: response.status, dataType: typeof data })
          return data as T
        } catch (err) {
          error = err
          console.error(`[apiFetch] Attempt ${attempt + 1} failed:`, err)
          attempt += 1
          if (err instanceof DOMException && err.name === 'AbortError') break
          if (attempt >= retry) break
          const delay = Math.min(4000, 250 * 2 ** attempt)
          console.log(`[apiFetch] Retrying in ${delay}ms...`)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
      console.error('[NightWorker] ✗ API fetch failed after all retries', { url, error })
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
      isConnected: !!config.token,
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
