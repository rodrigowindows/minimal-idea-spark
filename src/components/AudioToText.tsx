import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2, Upload, Languages } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  transcribeAudio,
  saveTranscriptionLocal,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from '@/lib/audio-transcription';

interface AudioToTextProps {
  onTranscription: (text: string) => void;
  className?: string;
  sourcePage?: string;
  compact?: boolean;
}

export function AudioToText({ onTranscription, className, sourcePage, compact }: AudioToTextProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [language, setLanguage] = useState<SupportedLanguage>('pt-BR');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        const blobType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(chunksRef.current, { type: blobType });
        stream.getTracks().forEach(track => track.stop());
        await handleTranscribe(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Erro ao iniciar gravacao. Verifique permissoes do microfone.');
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const handleTranscribe = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const result = await transcribeAudio(audioBlob, { language });
      onTranscription(result.text);
      saveTranscriptionLocal(result.text, result.language, sourcePage);
      toast.success('Audio transcrito com sucesso!');
    } catch (error) {
      console.error('Error transcribing audio:', error);
      const msg = error instanceof Error ? error.message : 'Erro na transcricao.';
      if (msg.includes('not configured') || msg.includes('VITE_SUPABASE')) {
        toast.error('Audio nao configurado. Defina VITE_SUPABASE_URL e faça deploy da Edge Function transcribe-audio.');
      } else {
        toast.error(msg.slice(0, 100));
      }
    } finally {
      setIsProcessing(false);
      setRecordingDuration(0);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast.error('Por favor, selecione um arquivo de audio');
      return;
    }

    await handleTranscribe(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {isRecording && (
        <span className="text-xs font-mono text-red-400 animate-pulse mr-1">
          {formatDuration(recordingDuration)}
        </span>
      )}

      <Button
        type="button"
        variant={isRecording ? 'destructive' : 'ghost'}
        size="icon"
        className={cn(
          'h-8 w-8 shrink-0',
          isRecording && 'animate-pulse'
        )}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        title={isRecording ? 'Parar gravacao' : 'Gravar audio (Whisper API)'}
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isRecording ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>

      {!compact && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing || isRecording}
            title="Upload arquivo de audio"
          >
            <Upload className="h-4 w-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                disabled={isProcessing || isRecording}
                title="Selecionar idioma"
              >
                <Languages className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1" align="end">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  className={cn(
                    'flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors',
                    language === lang.code
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-muted'
                  )}
                  onClick={() => setLanguage(lang.code)}
                >
                  {lang.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </>
      )}
    </div>
  );
}
