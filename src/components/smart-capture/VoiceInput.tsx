import { useState, useRef, useCallback, useEffect } from 'react'
import { Bug, Copy, Loader2, Mic, Play, Square, Trash2, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  transcribeAudio,
  isTranscriptionConfigured,
  isBrowserRecognitionSupported,
} from '@/lib/audio-transcription'
import type { SupportedLanguage } from '@/lib/audio-transcription'
import {
  addAudioDebugLog,
  clearAudioDebugLogs,
  formatAudioDebugLogLine,
  getAudioDebugLogs,
  subscribeAudioDebugLogs,
  type AudioDebugLogEntry,
} from '@/lib/audio-debug'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface BrowserRecognitionResult {
  isFinal: boolean
  0: { transcript: string }
}

interface BrowserRecognitionEvent {
  resultIndex: number
  results: ArrayLike<BrowserRecognitionResult>
}

interface BrowserRecognitionErrorEvent {
  error: string
}

interface BrowserSpeechRecognition {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: BrowserRecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: ((event: BrowserRecognitionErrorEvent) => void) | null
  onstart: (() => void) | null
  start: () => void
  stop: () => void
}

type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognition

interface VoiceInputProps {
  onTranscript: (text: string) => void
  disabled?: boolean
  language?: SupportedLanguage
  showDebugControls?: boolean
}

const LANG_MAP: Record<string, string> = { 'pt-BR': 'pt-BR', en: 'en-US', es: 'es-ES' }
const DEBUG_LOG_LIMIT = 180

export function VoiceInput({
  onTranscript,
  disabled,
  language = 'pt-BR',
  showDebugControls = true,
}: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [debugLogs, setDebugLogs] = useState<AudioDebugLogEntry[]>(() => getAudioDebugLogs(DEBUG_LOG_LIMIT))
  const isRecordingRef = useRef(false)
  const isTranscribingRef = useRef(false)
  const languageRef = useRef<SupportedLanguage>(language)
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const isListeningRef = useRef(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordingStartedAtRef = useRef<number>(0)
  const userInitiatedRecordingRef = useRef(false)
  const activeEngineRef = useRef<'backend' | 'browser' | null>(null)
  const sessionCounterRef = useRef(0)
  const activeSessionRef = useRef<number | null>(null)

  useEffect(() => {
    isRecordingRef.current = isRecording
  }, [isRecording])

  useEffect(() => {
    isTranscribingRef.current = isTranscribing
  }, [isTranscribing])

  useEffect(() => {
    languageRef.current = language
  }, [language])

  useEffect(() => {
    if (!showDebugControls) return
    return subscribeAudioDebugLogs((logs) => {
      setDebugLogs(logs.slice(0, DEBUG_LOG_LIMIT))
    })
  }, [showDebugControls])

  const log = useCallback((event: string, data?: Record<string, unknown>) => {
    const payload = {
      session: activeSessionRef.current,
      engine: activeEngineRef.current,
      language: languageRef.current,
      isRecording: isRecordingRef.current,
      isTranscribing: isTranscribingRef.current,
      ...(data ?? {}),
    }
    addAudioDebugLog('voice-input', event, payload)
    console.info('[VoiceInput]', { event, ...payload })
  }, [])

  const stopAndReleaseStream = useCallback(() => {
    if (!mediaStreamRef.current) return
    const tracks = mediaStreamRef.current.getTracks()
    log('stream-release', { tracks: tracks.length })
    tracks.forEach((track) => {
      try {
        track.stop()
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        addAudioDebugLog('voice-input', 'stream-release-track-failed', { message })
        console.warn('[VoiceInput] stream-release-track-failed', message)
      }
    })
    mediaStreamRef.current = null
  }, [log])

  const resetSession = useCallback(() => {
    userInitiatedRecordingRef.current = false
    activeEngineRef.current = null
    activeSessionRef.current = null
    mediaRecorderRef.current = null
    recognitionRef.current = null
  }, [])

  const startRecording = useCallback(async () => {
    if (isRecording || isTranscribing) {
      log('start-skip-busy')
      return
    }

    const useBackendTranscription = isTranscriptionConfigured()
    const useBrowserFallback = isBrowserRecognitionSupported()
    const sessionId = ++sessionCounterRef.current

    userInitiatedRecordingRef.current = true
    activeSessionRef.current = sessionId

    log('start-requested', {
      useBackendTranscription,
      useBrowserFallback,
    })

    if (useBackendTranscription) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        })
        mediaStreamRef.current = stream

        const preferredMimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : ''
        const mediaRecorder = preferredMimeType
          ? new MediaRecorder(stream, { mimeType: preferredMimeType })
          : new MediaRecorder(stream)

        log('backend-recorder-created', {
          mimeType: mediaRecorder.mimeType || preferredMimeType || 'default',
          tracks: stream.getAudioTracks().length,
        })

        activeEngineRef.current = 'backend'
        chunksRef.current = []
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data)
            log('backend-dataavailable', { chunkSize: e.data.size, chunks: chunksRef.current.length })
          } else {
            log('backend-dataavailable-empty')
          }
        }

        mediaRecorder.onerror = (event: Event & { error?: DOMException }) => {
          const message = event?.error?.message ?? 'unknown-media-recorder-error'
          addAudioDebugLog('voice-input', 'backend-recorder-error', { message })
          console.error('[VoiceInput] backend-recorder-error', message)
          toast.error('Falha no gravador de audio.')
          setIsRecording(false)
          setIsTranscribing(false)
          stopAndReleaseStream()
          resetSession()
        }

        mediaRecorder.onstop = async () => {
          log('backend-onstop', { chunks: chunksRef.current.length })
          stopAndReleaseStream()
          const durationMs = Date.now() - recordingStartedAtRef.current
          const userInitiated = userInitiatedRecordingRef.current
          const totalBytes = chunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0)
          log('backend-recording-finished', {
            durationMs,
            chunks: chunksRef.current.length,
            totalBytes,
            userInitiated,
          })

          if (chunksRef.current.length === 0 || totalBytes === 0 || durationMs < 700) {
            if (userInitiated) toast.info('Gravacao muito curta. Fale por pelo menos 1 segundo.')
            setIsTranscribing(false)
            resetSession()
            return
          }

          const blobType = mediaRecorder.mimeType || chunksRef.current[0]?.type || 'audio/webm'
          const audioBlob = new Blob(chunksRef.current, { type: blobType })
          chunksRef.current = []
          try {
            log('transcription-start', { blobType, blobSize: audioBlob.size })
            const result = await transcribeAudio(audioBlob, { language })
            const text = result.text?.trim()
            log('transcription-success', { textLength: text?.length ?? 0, resultLanguage: result.language })
            if (text) {
              onTranscript(text)
            } else if (userInitiated && durationMs >= 700) {
              toast.info('Nenhuma fala detectada. Tente falar mais perto do microfone.')
            }
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e)
            addAudioDebugLog('voice-input', 'transcription-error', { message })
            console.error('[VoiceInput] transcription-error', message)
            if (userInitiated) toast.error(message.slice(0, 80))
          } finally {
            log('transcription-finish')
            setIsTranscribing(false)
            resetSession()
          }
        }

        mediaRecorderRef.current = mediaRecorder
        recordingStartedAtRef.current = Date.now()
        setIsTranscribing(false)
        mediaRecorder.start(250)
        setIsRecording(true)
        log('backend-recording-started', { state: mediaRecorder.state })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        addAudioDebugLog('voice-input', 'start-backend-error', { message })
        console.error('[VoiceInput] start-backend-error', message)
        userInitiatedRecordingRef.current = false
        toast.error('Nao foi possivel acessar o microfone. Verifique as permissoes.')
        stopAndReleaseStream()
        resetSession()
      }
      return
    }

    if (useBrowserFallback) {
      try {
        const speechWindow = window as Window & typeof globalThis & {
          SpeechRecognition?: BrowserSpeechRecognitionCtor
          webkitSpeechRecognition?: BrowserSpeechRecognitionCtor
        }
        const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition
        if (!SpeechRecognition) {
          userInitiatedRecordingRef.current = false
          toast.error('Reconhecimento de voz nao disponivel neste navegador.')
          resetSession()
          return
        }
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = LANG_MAP[language] || 'pt-BR'
        activeEngineRef.current = 'browser'

        const transcripts: string[] = []

        recognition.onresult = (event: BrowserRecognitionEvent) => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              const finalText = event.results[i][0].transcript.trim()
              transcripts.push(finalText)
              log('browser-final-result', { index: i, textLength: finalText.length })
            } else {
              const interimText = event.results[i][0]?.transcript?.trim?.() ?? ''
              log('browser-interim-result', { index: i, textLength: interimText.length })
            }
          }
        }

        recordingStartedAtRef.current = Date.now()
        recognition.onstart = () => {
          log('browser-onstart')
        }

        recognition.onend = () => {
          log('browser-onend', { isListening: isListeningRef.current, transcriptParts: transcripts.length })
          if (isListeningRef.current) {
            try {
              recognition.start()
              log('browser-auto-restart')
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err)
              addAudioDebugLog('voice-input', 'browser-auto-restart-failed', { message })
              console.warn('[VoiceInput] browser-auto-restart-failed', message)
            }
          } else {
            const userInitiated = userInitiatedRecordingRef.current
            const durationMs = Date.now() - recordingStartedAtRef.current
            const text = transcripts.join(' ').trim()
            log('browser-finish', { durationMs, textLength: text.length, userInitiated })
            if (text) {
              onTranscript(text)
            } else if (userInitiated && durationMs >= 700) {
              toast.info('Nenhuma fala detectada. Tente falar mais perto do microfone.')
            }
            setIsTranscribing(false)
            resetSession()
          }
        }

        recognition.onerror = (event: BrowserRecognitionErrorEvent) => {
          log('browser-onerror', { error: event.error })
          if (event.error === 'not-allowed') {
            toast.error('Permissao do microfone negada.')
            isListeningRef.current = false
            setIsRecording(false)
            setIsTranscribing(false)
            resetSession()
            return
          }
          if (event.error === 'audio-capture') {
            toast.error('Microfone nao encontrado. Verifique o dispositivo.')
            isListeningRef.current = false
            setIsRecording(false)
            setIsTranscribing(false)
            resetSession()
          }
        }

        recognitionRef.current = recognition
        isListeningRef.current = true
        recognition.start()
        setIsTranscribing(false)
        setIsRecording(true)
        log('browser-recording-started')
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        addAudioDebugLog('voice-input', 'start-browser-error', { message })
        console.error('[VoiceInput] start-browser-error', message)
        userInitiatedRecordingRef.current = false
        toast.error('Reconhecimento de voz nao disponivel.')
        resetSession()
      }
      return
    }

    log('start-failed-no-engine')
    userInitiatedRecordingRef.current = false
    toast.error('Reconhecimento de voz nao disponivel neste navegador.')
    resetSession()
  }, [isRecording, isTranscribing, language, log, onTranscript, resetSession, stopAndReleaseStream])

  const stopRecording = useCallback(() => {
    log('stop-requested')

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      setIsRecording(false)
      setIsTranscribing(true)
      try {
        mediaRecorderRef.current.stop()
        log('stop-backend-called', { state: mediaRecorderRef.current.state })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        addAudioDebugLog('voice-input', 'stop-backend-error', { message })
        console.error('[VoiceInput] stop-backend-error', message)
        setIsTranscribing(false)
        stopAndReleaseStream()
        resetSession()
      }
      return
    }

    if (recognitionRef.current) {
      isListeningRef.current = false
      setIsRecording(false)
      setIsTranscribing(true)
      try {
        recognitionRef.current.stop()
        log('stop-browser-called')
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        addAudioDebugLog('voice-input', 'stop-browser-error', { message })
        console.error('[VoiceInput] stop-browser-error', message)
        setIsTranscribing(false)
        resetSession()
      }
      return
    }

    log('stop-without-active-engine')
    resetSession()
    setIsRecording(false)
    setIsTranscribing(false)
  }, [log, resetSession, stopAndReleaseStream])

  useEffect(() => {
    return () => {
      log('component-unmount-cleanup')
      isListeningRef.current = false
      try {
        if (recognitionRef.current) recognitionRef.current.stop()
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        addAudioDebugLog('voice-input', 'cleanup-stop-recognition-failed', { message })
        console.warn('[VoiceInput] cleanup-stop-recognition-failed', message)
      }
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop()
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        addAudioDebugLog('voice-input', 'cleanup-stop-recorder-failed', { message })
        console.warn('[VoiceInput] cleanup-stop-recorder-failed', message)
      }
      stopAndReleaseStream()
      resetSession()
    }
  }, [log, resetSession, stopAndReleaseStream])

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    if (!e.isTrusted) {
      log('click-ignored-untrusted')
      return
    }
    if (disabled || isTranscribing) {
      log('click-ignored-disabled-or-transcribing', { disabled, isTranscribing })
      return
    }
    if (isRecording) {
      stopRecording()
      return
    }
    void startRecording()
  }, [disabled, isRecording, isTranscribing, log, startRecording, stopRecording])

  const testMicrophone = useCallback(async () => {
    log('test-mic-start')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      })
      const track = stream.getAudioTracks()[0]
      const settings = track?.getSettings?.()
      const label = track?.label || 'microfone-sem-label'
      addAudioDebugLog('voice-input', 'test-mic-success', {
        label,
        settings: settings as unknown as Record<string, unknown>,
      })
      console.info('[VoiceInput] test-mic-success', { label, settings })
      stream.getTracks().forEach((t) => t.stop())
      toast.success('Microfone acessado com sucesso.')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      addAudioDebugLog('voice-input', 'test-mic-failed', { message })
      console.error('[VoiceInput] test-mic-failed', message)
      toast.error('Falha no teste do microfone.')
    }
  }, [log])

  const copyLogs = useCallback(async () => {
    const lines = getAudioDebugLogs(250).map(formatAudioDebugLogLine).join('\n')
    if (!lines) {
      toast.info('Sem logs de audio para copiar.')
      return
    }
    try {
      await navigator.clipboard.writeText(lines)
      addAudioDebugLog('voice-input', 'debug-copy-logs', { lines: lines.split('\n').length })
      toast.success('Logs copiados para a area de transferencia.')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      addAudioDebugLog('voice-input', 'debug-copy-logs-failed', { message })
      toast.error('Nao foi possivel copiar os logs.')
    }
  }, [])

  const clearLogs = useCallback(() => {
    clearAudioDebugLogs()
    addAudioDebugLog('voice-input', 'debug-clear-logs')
    toast.success('Logs de audio limpos.')
  }, [])

  return (
    <div className="relative flex items-center gap-1 shrink-0">
      <div className="relative flex h-9 w-9 items-center justify-center shrink-0">
        {isRecording && (
          <span className="absolute inset-[-4px] rounded-full border-2 border-red-500 animate-pulse" />
        )}
        {isRecording && (
          <span className="absolute inset-[-6px] rounded-full border border-red-400/50 animate-ping" />
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled || isTranscribing}
          className={cn(
            'relative z-10 h-9 w-9 touch-manipulation rounded-full',
            isRecording && 'text-white bg-red-500 hover:bg-red-500/90',
            isTranscribing && 'text-amber-500'
          )}
          title={isTranscribing ? 'Transcrevendo audio...' : isRecording ? 'Parar gravacao' : 'Iniciar gravacao'}
          aria-label={isTranscribing ? 'Transcrevendo audio...' : isRecording ? 'Parar gravacao' : 'Iniciar gravacao'}
          onClick={handleClick}
        >
          {isTranscribing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isRecording ? (
            <Square className="h-4 w-4 fill-current" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          <span className="sr-only">
            {isTranscribing ? 'Transcribing...' : isRecording ? 'Stop recording' : 'Start recording'}
          </span>
        </Button>
      </div>

      {showDebugControls && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              title="Abrir diagnostico de audio"
              aria-label="Abrir diagnostico de audio"
            >
              <Bug className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[360px] p-3" align="end">
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void startRecording()}
                  disabled={Boolean(disabled) || isRecording || isTranscribing}
                  className="justify-start"
                >
                  <Play className="mr-1 h-3.5 w-3.5" />
                  Iniciar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={stopRecording}
                  disabled={!isRecording}
                  className="justify-start"
                >
                  <Square className="mr-1 h-3.5 w-3.5" />
                  Parar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void testMicrophone()}
                  disabled={isRecording || isTranscribing}
                  className="justify-start"
                >
                  <Wrench className="mr-1 h-3.5 w-3.5" />
                  Testar Mic
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void copyLogs()}
                  className="justify-start"
                >
                  <Copy className="mr-1 h-3.5 w-3.5" />
                  Copiar Logs
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={clearLogs}
                  className="col-span-2 justify-start"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Limpar Logs
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Log detalhado de audio (captura, reconhecimento, transcricao e erros).
              </p>

              <ScrollArea className="h-44 rounded-md border p-2">
                {debugLogs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem logs de audio.</p>
                ) : (
                  <div className="space-y-1">
                    {debugLogs.map((entry) => (
                      <div key={entry.id} className="rounded-sm bg-muted/40 px-2 py-1">
                        <p className="font-mono text-[10px] text-muted-foreground">{entry.at}</p>
                        <p className="font-mono text-[11px]">
                          [{entry.source}] {entry.event}
                        </p>
                        {entry.data && (
                          <p className="font-mono text-[10px] text-muted-foreground break-all">
                            {JSON.stringify(entry.data)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
