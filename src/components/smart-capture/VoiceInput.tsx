import { useState, useRef, useCallback } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  transcribeAudio,
  isTranscriptionConfigured,
  isBrowserRecognitionSupported,
} from '@/lib/audio-transcription'
import type { SupportedLanguage } from '@/lib/audio-transcription'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  disabled?: boolean
  language?: SupportedLanguage
}

export function VoiceInput({ onTranscript, disabled, language = 'pt-BR' }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const recognitionRef = useRef<any>(null)
  const isListeningRef = useRef(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordingStartedAtRef = useRef<number>(0)
  /** Only true after user explicitly presses the mic button; prevents "no speech" toast on load. */
  const userInitiatedRecordingRef = useRef(false)

  const langMap: Record<string, string> = { 'pt-BR': 'pt-BR', en: 'en-US', es: 'es-ES' }

  const startRecording = useCallback(async () => {
    const useBackendTranscription = isTranscriptionConfigured()
    const useBrowserFallback = isBrowserRecognitionSupported()

    userInitiatedRecordingRef.current = true

    // Try backend transcription first (Deepgram)
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
          if (e.data.size > 0) chunksRef.current.push(e.data)
        }
        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach(track => track.stop())
          const durationMs = Date.now() - recordingStartedAtRef.current
          const userInitiated = userInitiatedRecordingRef.current
          userInitiatedRecordingRef.current = false
          if (chunksRef.current.length === 0 || durationMs < 1500) {
            if (userInitiated) toast.info('Segure o botão por pelo menos 1-2 segundos enquanto fala.')
            return
          }
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
          chunksRef.current = []
          setIsTranscribing(true)
          try {
            const result = await transcribeAudio(audioBlob, { language })
            if (result.text?.trim()) onTranscript(result.text.trim())
            else if (userInitiated && durationMs >= 1500) toast.info('Nenhuma fala detectada. Tente falar mais perto do microfone.')
          } catch (e) {
            if (userInitiated) toast.error(e instanceof Error ? e.message.slice(0, 80) : 'Falha na transcrição.')
          } finally {
            setIsTranscribing(false)
          }
        }
        mediaRecorderRef.current = mediaRecorder
        recordingStartedAtRef.current = Date.now()
        mediaRecorder.start(250)
        setIsRecording(true)
      } catch {
        userInitiatedRecordingRef.current = false
        toast.error('Não foi possível acessar o microfone. Verifique as permissões.')
      }
      return
    }

    // Browser SpeechRecognition fallback (Chrome/Edge/Safari)
    if (useBrowserFallback) {
      try {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (!SpeechRecognition) {
          userInitiatedRecordingRef.current = false
          toast.error('Reconhecimento de voz não disponível neste navegador.')
          return
        }
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = langMap[language] || 'pt-BR'

        const transcripts: string[] = []

        recognition.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              transcripts.push(event.results[i][0].transcript.trim())
            }
          }
        }

        recordingStartedAtRef.current = Date.now()

        // Auto-restart on silence timeout
        recognition.onend = () => {
          if (isListeningRef.current) {
            try { recognition.start() } catch { /* already started */ }
          } else {
            // Finished - deliver transcript (only show "no speech" if user explicitly recorded)
            const userInitiated = userInitiatedRecordingRef.current
            userInitiatedRecordingRef.current = false
            const durationMs = Date.now() - recordingStartedAtRef.current
            const text = transcripts.join(' ').trim()
            if (text) {
              onTranscript(text)
            } else if (userInitiated && durationMs >= 1500) {
              toast.info('Nenhuma fala detectada. Tente falar mais perto do microfone.')
            }
            setIsTranscribing(false)
          }
        }

        recognition.onerror = (event: any) => {
          if (event.error === 'not-allowed') {
            toast.error('Permissão do microfone negada.')
            isListeningRef.current = false
            setIsRecording(false)
          }
          // 'no-speech' is normal - onend will handle restart
        }

        recognitionRef.current = recognition
        isListeningRef.current = true
        recognition.start()
        setIsRecording(true)
      } catch {
        userInitiatedRecordingRef.current = false
        toast.error('Reconhecimento de voz não disponível.')
      }
      return
    }

    userInitiatedRecordingRef.current = false
    toast.error('Reconhecimento de voz não disponível neste navegador.')
  }, [language, onTranscript])

  const stopRecording = useCallback(() => {
    // Stop backend recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      return
    }

    // Stop browser recognition
    if (recognitionRef.current) {
      isListeningRef.current = false
      setIsRecording(false)
      setIsTranscribing(true)
      recognitionRef.current.stop()
      recognitionRef.current = null
      return
    }

    userInitiatedRecordingRef.current = false
    setIsRecording(false)
  }, [])

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