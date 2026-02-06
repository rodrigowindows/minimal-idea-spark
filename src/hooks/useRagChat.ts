import { useState, useRef, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { ContextSource } from '@/types'

interface RagSource {
  title: string
  type: 'opportunity' | 'journal' | 'knowledge'
  relevance: number
  metadata?: Record<string, unknown>
}

interface StreamState {
  isStreaming: boolean
  streamingContent: string
  sources: ContextSource[]
  sessionId: string | null
  error: string | null
}

export function useRagChat() {
  const [state, setState] = useState<StreamState>({
    isStreaming: false,
    streamingContent: '',
    sources: [],
    sessionId: null,
    error: null,
  })
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(async (
    message: string,
    sessionId?: string | null,
  ): Promise<{ content: string; sources: ContextSource[]; sessionId: string } | null> => {
    // Abort any in-flight request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setState(prev => ({
      ...prev,
      isStreaming: true,
      streamingContent: '',
      sources: [],
      error: null,
    }))

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        throw new Error('Not authenticated')
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(`${supabaseUrl}/functions/v1/rag-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          message,
          sessionId: sessionId ?? state.sessionId,
          stream: true,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const contentType = response.headers.get('Content-Type') || ''

      if (contentType.includes('text/event-stream')) {
        // SSE streaming
        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let fullContent = ''
        let sources: ContextSource[] = []
        let newSessionId = sessionId ?? state.sessionId ?? ''
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const events = buffer.split('\n\n')
          buffer = events.pop() || ''

          for (const event of events) {
            const lines = event.split('\n')
            let eventType = ''
            let eventData = ''

            for (const line of lines) {
              if (line.startsWith('event: ')) {
                eventType = line.slice(7)
              } else if (line.startsWith('data: ')) {
                eventData = line.slice(6)
              }
            }

            if (!eventData) continue

            try {
              const parsed = JSON.parse(eventData)

              if (eventType === 'sources') {
                newSessionId = parsed.sessionId ?? newSessionId
                sources = (parsed.sources as RagSource[]).map(s => ({
                  title: s.title,
                  type: s.type,
                  relevance: s.relevance,
                }))
                setState(prev => ({
                  ...prev,
                  sessionId: newSessionId,
                  sources,
                }))
              } else if (eventType === 'token') {
                fullContent += parsed.token
                setState(prev => ({
                  ...prev,
                  streamingContent: fullContent,
                }))
              } else if (eventType === 'done') {
                newSessionId = parsed.sessionId ?? newSessionId
              } else if (eventType === 'error') {
                throw new Error(parsed.error || 'Stream error')
              }
            } catch (e) {
              if (e instanceof Error && e.message !== 'Stream error') {
                // Ignore JSON parse errors from partial chunks
              } else {
                throw e
              }
            }
          }
        }

        setState(prev => ({
          ...prev,
          isStreaming: false,
          streamingContent: '',
          sessionId: newSessionId,
        }))

        return { content: fullContent, sources, sessionId: newSessionId }
      } else {
        // Non-streaming JSON response
        const data = await response.json()
        const sources: ContextSource[] = (data.sources || []).map((s: RagSource) => ({
          title: s.title,
          type: s.type,
          relevance: s.relevance,
        }))

        setState(prev => ({
          ...prev,
          isStreaming: false,
          streamingContent: '',
          sources,
          sessionId: data.sessionId ?? prev.sessionId,
        }))

        return {
          content: data.response,
          sources,
          sessionId: data.sessionId,
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setState(prev => ({ ...prev, isStreaming: false, streamingContent: '' }))
        return null
      }

      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setState(prev => ({
        ...prev,
        isStreaming: false,
        streamingContent: '',
        error: errorMsg,
      }))
      return null
    }
  }, [state.sessionId])

  const abort = useCallback(() => {
    abortRef.current?.abort()
    setState(prev => ({ ...prev, isStreaming: false, streamingContent: '' }))
  }, [])

  const resetSession = useCallback(() => {
    setState({
      isStreaming: false,
      streamingContent: '',
      sources: [],
      sessionId: null,
      error: null,
    })
  }, [])

  return {
    ...state,
    sendMessage,
    abort,
    resetSession,
  }
}
