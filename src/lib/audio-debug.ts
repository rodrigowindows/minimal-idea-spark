export interface AudioDebugLogEntry {
  id: string
  at: string
  source: string
  event: string
  data?: Record<string, unknown>
}

const AUDIO_DEBUG_STORAGE_KEY = 'minimal_idea_spark_audio_debug_logs'
const MAX_AUDIO_DEBUG_LOGS = 500

type AudioDebugListener = (logs: AudioDebugLogEntry[]) => void

let listeners = new Set<AudioDebugListener>()

function sanitize(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.map(sanitize)
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(record)) {
      out[key] = sanitize(val)
    }
    return out
  }
  return String(value)
}

function readStoredLogs(): AudioDebugLogEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(AUDIO_DEBUG_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as AudioDebugLogEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

let cache: AudioDebugLogEntry[] = readStoredLogs()

function persistLogs() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(AUDIO_DEBUG_STORAGE_KEY, JSON.stringify(cache))
  } catch {
    // Ignore storage failures to keep capture path lightweight.
  }
}

function notifyListeners() {
  for (const listener of listeners) {
    try {
      listener(cache)
    } catch {
      // Ignore listener failures.
    }
  }
}

export function addAudioDebugLog(
  source: string,
  event: string,
  data?: Record<string, unknown>
): AudioDebugLogEntry {
  const entry: AudioDebugLogEntry = {
    id: `ad-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    source,
    event,
    data: data ? (sanitize(data) as Record<string, unknown>) : undefined,
  }
  cache = [entry, ...cache].slice(0, MAX_AUDIO_DEBUG_LOGS)
  persistLogs()
  notifyListeners()
  return entry
}

export function getAudioDebugLogs(limit = 200): AudioDebugLogEntry[] {
  return cache.slice(0, limit)
}

export function clearAudioDebugLogs(): void {
  cache = []
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(AUDIO_DEBUG_STORAGE_KEY)
    } catch {
      // Ignore storage failures.
    }
  }
  notifyListeners()
}

export function subscribeAudioDebugLogs(listener: AudioDebugListener): () => void {
  listeners.add(listener)
  try {
    listener(cache)
  } catch {
    // Ignore listener failures.
  }
  return () => {
    listeners.delete(listener)
  }
}

export function formatAudioDebugLogLine(entry: AudioDebugLogEntry): string {
  const data = entry.data ? ` ${JSON.stringify(entry.data)}` : ''
  return `${entry.at} [${entry.source}] ${entry.event}${data}`
}
