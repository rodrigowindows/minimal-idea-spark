import { useState, useRef, useCallback } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  transcribeAudio,
  isTranscriptionConfigured,
  isBrowserRecognitionSupported,
  createBrowserRecognizer,
} from '@/lib/audio-transcription'
import type { SupportedLanguage } from '@/lib/audio-transcription'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  disabled?: boolean
  language?: SupportedLanguage
}

const useBackendTranscription = isTranscriptionConfigured()
const useBrowserFallback = !useBackendTranscription && isBrowserRecognitionSupported()

/** Minimum recording duration (ms) before we send to transcription. Shorter = "hold longer" message. */
const MIN_RECORDING_MS = 1500

export function VoiceInput({ onTranscript, disabled, language = 'pt-BR' }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const browserRecognizerRef = useRef<ReturnType<typeof createBrowserRecognizer> | null>(null)
  const recordingStartedAtRef = useRef<number>(0)

  const startRecording = useCallback(async () => {
    if (useBackendTranscription) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : 'audio/webm',
        })

        chunksRef.current = []

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data)
          }
        }

        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach(track => track.stop())

          const durationMs = Date.now() - recordingStartedAtRef.current
          if (chunksRef.current.length === 0) return
          if (durationMs < MIN_RECORDING_MS) {
            toast.info('Hold the button for at least 1–2 seconds while you speak.')
            return
          }

          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
          chunksRef.current = []

          setIsTranscribing(true)
          try {
            const result = await transcribeAudio(audioBlob, { language })
            if (result.text?.trim()) {
              onTranscript(result.text.trim())
            } else {
              toast.info('No speech detected. Try speaking closer to the mic.')
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Transcription failed.'
            if (msg.includes('not configured') || msg.includes('VITE_DEEPGRAM')) {
              toast.error(
                'Audio not configured. Add VITE_DEEPGRAM_API_KEY to .env and restart the dev server.'
              )
            } else {
              toast.error(msg.slice(0, 80))
            }
          } finally {
            setIsTranscribing(false)
          }
        }

        mediaRecorderRef.current = mediaRecorder
        recordingStartedAtRef.current = Date.now()
        mediaRecorder.start(250)
        setIsRecording(true)
      } catch {
        toast.error('Could not access microphone. Check permissions.')
      }
      return
    }

    if (useBrowserFallback) {
      try {
        const recognizer = createBrowserRecognizer(language)
        browserRecognizerRef.current = recognizer
        recognizer.start()
        setIsRecording(true)
      } catch {
        toast.error('Voice input not available in this browser.')
      }
      return
    }

    toast.error(
      'Audio not configured. Set VITE_DEEPGRAM_API_KEY in .env, or use Chrome/Edge/Safari for browser voice.'
    )
  }, [language, onTranscript])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      return
    }

    const recognizer = browserRecognizerRef.current
    if (recognizer && useBrowserFallback) {
      browserRecognizerRef.current = null
      setIsRecording(false)
      setIsTranscribing(true)
      recognizer
        .stop()
        .then(({ text }) => {
          if (text?.trim()) {
            onTranscript(text.trim())
          } else {
            toast.info('No speech detected. Try speaking closer to the mic.')
          }
        })
        .catch(() => {
          toast.error('Voice recognition failed.')
        })
        .finally(() => {
          setIsTranscribing(false)
        })
      return
    }

    setIsRecording(false)
  }, [onTranscript])

  const busy = isRecording || isTranscribing

  return (
    <div className="relative flex items-center justify-center h-9 w-9 shrink-0">
      {/* Pulsing red ring when recording */}
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
          isRecording && 'text-red-500 bg-red-500/10',
          isTranscribing && 'text-amber-500'
        )}
        onPointerDown={(e) => {
          e.preventDefault()
          if (!busy) startRecording()
        }}
        onPointerUp={(e) => {
          e.preventDefault()
          if (isRecording) stopRecording()
        }}
      >
        {isTranscribing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isRecording ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
        <span className="sr-only">
          {isTranscribing ? 'Transcribing...' : isRecording ? 'Release to stop' : 'Hold to record'}
        </span>
      </Button>
    </div>
  )
}