import { useState, useRef, useCallback } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { SupportedLanguage } from '@/lib/audio-transcription'

const LANG_MAP: Record<SupportedLanguage, string> = {
  'pt-BR': 'pt-BR',
  'en': 'en-US',
  'es': 'es-ES',
}

interface VoiceInputProps {
  onTranscript: (text: string) => void
  disabled?: boolean
  language?: SupportedLanguage
}

export function VoiceInput({ onTranscript, disabled, language = 'pt-BR' }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const startListening = useCallback(() => {
    if (!isSupported) {
      toast.error('Speech recognition is not supported in this browser.')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = LANG_MAP[language] || 'pt-BR'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1]
      if (last.isFinal) {
        onTranscript(last[0].transcript)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'aborted') {
        toast.error('Voice recognition error. Please try again.')
      }
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [isSupported, onTranscript, language])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  if (!isSupported) return null

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      className={cn(
        'h-9 w-9 shrink-0 touch-manipulation',
        isListening && 'text-red-500 animate-pulse'
      )}
      onPointerDown={(e) => {
        e.preventDefault()
        startListening()
      }}
      onPointerUp={(e) => {
        e.preventDefault()
        stopListening()
      }}
      onPointerLeave={() => {
        if (isListening) stopListening()
      }}
    >
      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      <span className="sr-only">{isListening ? 'Stop recording' : 'Hold to record'}</span>
    </Button>
  )
}
