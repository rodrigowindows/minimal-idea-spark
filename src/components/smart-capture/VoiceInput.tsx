import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, Loader2, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  transcribeAudio,
  isTranscriptionConfigured,
  isBrowserRecognitionSupported,
} from '@/lib/audio-transcription'
import type { SupportedLanguage } from '@/lib/audio-transcription'

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
}

const LANG_MAP: Record<string, string> = { 'pt-BR': 'pt-BR', en: 'en-US', es: 'es-ES' }

export function VoiceInput({ onTranscript, disabled, language = 'pt-BR' }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
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

  const log = useCallback((event: string, data?: Record<string, unknown>) => {
    console.info('[VoiceInput]', {
      event,
      session: activeSessionRef.current,
      engine: activeEngineRef.current,
      language,
      isRecording,
      isTranscribing,
      ...(data ?? {}),
    })
  }, [isRecording, isTranscribing, language])

  const stopAndReleaseStream = useCallback(() => {
    if (!mediaStreamRef.current) return
    const tracks = mediaStreamRef.current.getTracks()
    log('stream-release', { tracks: tracks.length })
    tracks.forEach((track) => {
      try {
        track.stop()
      } catch (err) {
        console.warn('[VoiceInput] failed-to-stop-track', err)
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
          console.error('[VoiceInput] backend-recorder-error', event?.error ?? event)
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
            console.error('[VoiceInput] transcription-error', e)
            if (userInitiated) toast.error(e instanceof Error ? e.message.slice(0, 80) : 'Falha na transcricao.')
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
        console.error('[VoiceInput] start-backend-error', err)
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
              console.warn('[VoiceInput] browser-restart-failed', err)
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
        console.error('[VoiceInput] start-browser-error', err)
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
        console.error('[VoiceInput] stop-backend-error', err)
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
        console.error('[VoiceInput] stop-browser-error', err)
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
        console.warn('[VoiceInput] cleanup-stop-recognition-failed', err)
      }
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop()
        }
      } catch (err) {
        console.warn('[VoiceInput] cleanup-stop-recorder-failed', err)
      }
      stopAndReleaseStream()
      resetSession()
    }
  }, [log, resetSession, stopAndReleaseStream])

  const busy = isRecording || isTranscribing

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

  return (
    <div className="relative flex items-center justify-center h-9 w-9 shrink-0">
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
          'relative z-10 h-9 w-9 shrink-0 touch-manipulation rounded-full',
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
  )
}
