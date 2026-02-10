import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bug, Copy, Loader2, Mic, MicOff, Trash2, Upload, Wrench, Languages } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  transcribeAudio,
  saveTranscriptionLocal,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from '@/lib/audio-transcription';
import {
  addAudioDebugLog,
  clearAudioDebugLogs,
  formatAudioDebugLogLine,
  getAudioDebugLogs,
  subscribeAudioDebugLogs,
  type AudioDebugLogEntry,
} from '@/lib/audio-debug';

interface AudioToTextProps {
  onTranscription: (text: string) => void;
  className?: string;
  sourcePage?: string;
  compact?: boolean;
}

const DEBUG_LOG_LIMIT = 160;

export function AudioToText({ onTranscription, className, sourcePage, compact }: AudioToTextProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [language, setLanguage] = useState<SupportedLanguage>('pt-BR');
  const [debugLogs, setDebugLogs] = useState<AudioDebugLogEntry[]>(() => getAudioDebugLogs(DEBUG_LOG_LIMIT));
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (compact) return;
    return subscribeAudioDebugLogs((logs) => {
      setDebugLogs(logs.slice(0, DEBUG_LOG_LIMIT));
    });
  }, [compact]);

  const log = useCallback((event: string, data?: Record<string, unknown>) => {
    const payload = {
      language,
      sourcePage: sourcePage ?? null,
      isRecording,
      isProcessing,
      ...(data ?? {}),
    };
    addAudioDebugLog('audio-to-text', event, payload);
    console.info('[AudioToText]', { event, ...payload });
  }, [isProcessing, isRecording, language, sourcePage]);

  const stopAndReleaseStream = useCallback(() => {
    if (!mediaStreamRef.current) return;
    const tracks = mediaStreamRef.current.getTracks();
    log('stream-release', { tracks: tracks.length });
    tracks.forEach((track) => {
      try {
        track.stop();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        addAudioDebugLog('audio-to-text', 'stream-release-track-failed', { message });
      }
    });
    mediaStreamRef.current = null;
  }, [log]);

  const handleTranscribe = useCallback(async (audioBlob: Blob) => {
    log('transcribe-start', { blobType: audioBlob.type, blobSize: audioBlob.size });
    setIsProcessing(true);
    try {
      const result = await transcribeAudio(audioBlob, { language });
      onTranscription(result.text);
      saveTranscriptionLocal(result.text, result.language, sourcePage);
      log('transcribe-success', { textLength: result.text.length, resultLanguage: result.language });
      toast.success('Audio transcrito com sucesso!');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro na transcricao.';
      addAudioDebugLog('audio-to-text', 'transcribe-failed', { message: msg });
      console.error('[AudioToText] transcribe-failed', msg);
      if (msg.includes('not configured') || msg.includes('VITE_DEEPGRAM')) {
        toast.error('Audio nao configurado. Defina VITE_DEEPGRAM_API_KEY no .env.');
      } else {
        toast.error(msg.slice(0, 100));
      }
    } finally {
      setIsProcessing(false);
      setRecordingDuration(0);
      log('transcribe-finish');
    }
  }, [language, log, onTranscription, sourcePage]);

  const startRecording = useCallback(async () => {
    log('record-start-requested');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      mediaStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          log('record-dataavailable', { chunkSize: e.data.size, chunks: chunksRef.current.length });
        } else {
          log('record-dataavailable-empty');
        }
      };

      mediaRecorder.onerror = (event: Event & { error?: DOMException }) => {
        const message = event?.error?.message ?? 'unknown-media-recorder-error';
        addAudioDebugLog('audio-to-text', 'record-error', { message });
        console.error('[AudioToText] record-error', message);
        toast.error('Falha ao gravar audio.');
        setIsRecording(false);
        setIsProcessing(false);
        stopAndReleaseStream();
      };

      mediaRecorder.onstop = async () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        const blobType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(chunksRef.current, { type: blobType });
        log('record-stopped', {
          blobType,
          blobSize: audioBlob.size,
          chunks: chunksRef.current.length,
          recordingDuration,
        });
        stopAndReleaseStream();
        await handleTranscribe(audioBlob);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      log('record-started', {
        mimeType: mediaRecorder.mimeType || mimeType || 'default',
        tracks: stream.getAudioTracks().length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addAudioDebugLog('audio-to-text', 'record-start-failed', { message });
      console.error('[AudioToText] record-start-failed', message);
      toast.error('Erro ao iniciar gravacao. Verifique permissoes do microfone.');
    }
  }, [handleTranscribe, log, recordingDuration, stopAndReleaseStream]);

  const stopRecording = useCallback(() => {
    log('record-stop-requested');
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        addAudioDebugLog('audio-to-text', 'record-stop-failed', { message });
        console.error('[AudioToText] record-stop-failed', message);
        stopAndReleaseStream();
      }
      setIsRecording(false);
      return;
    }
    log('record-stop-without-active-recorder');
  }, [isRecording, log, stopAndReleaseStream]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      log('file-upload-empty');
      return;
    }

    if (!file.type.startsWith('audio/')) {
      log('file-upload-invalid-type', { fileType: file.type, fileName: file.name });
      toast.error('Por favor, selecione um arquivo de audio');
      return;
    }

    log('file-upload-selected', { fileName: file.name, fileType: file.type, fileSize: file.size });
    await handleTranscribe(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [handleTranscribe, log]);

  const testMicrophone = useCallback(async () => {
    log('test-mic-start');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      const track = stream.getAudioTracks()[0];
      const label = track?.label || 'microfone-sem-label';
      const settings = track?.getSettings?.();
      addAudioDebugLog('audio-to-text', 'test-mic-success', {
        label,
        settings: settings as unknown as Record<string, unknown>,
      });
      stream.getTracks().forEach((t) => t.stop());
      toast.success('Microfone acessado com sucesso.');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      addAudioDebugLog('audio-to-text', 'test-mic-failed', { message });
      toast.error('Falha no teste do microfone.');
    }
  }, [log]);

  const copyLogs = useCallback(async () => {
    const lines = getAudioDebugLogs(250).map(formatAudioDebugLogLine).join('\n');
    if (!lines) {
      toast.info('Sem logs de audio para copiar.');
      return;
    }
    try {
      await navigator.clipboard.writeText(lines);
      addAudioDebugLog('audio-to-text', 'debug-copy-logs', { lines: lines.split('\n').length });
      toast.success('Logs copiados para a area de transferencia.');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      addAudioDebugLog('audio-to-text', 'debug-copy-logs-failed', { message });
      toast.error('Nao foi possivel copiar os logs.');
    }
  }, []);

  const clearLogs = useCallback(() => {
    clearAudioDebugLogs();
    addAudioDebugLog('audio-to-text', 'debug-clear-logs');
    toast.success('Logs de audio limpos.');
  }, []);

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
        onClick={isRecording ? stopRecording : () => void startRecording()}
        disabled={isProcessing}
        title={isRecording ? 'Parar gravacao' : 'Gravar audio (Deepgram)'}
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
                  onClick={() => {
                    log('language-change', { from: language, to: lang.code });
                    setLanguage(lang.code);
                  }}
                >
                  {lang.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                title="Diagnostico de audio"
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
                    onClick={() => void testMicrophone()}
                    disabled={isRecording || isProcessing}
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
                  Logs completos de gravacao, upload e transcricao.
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
        </>
      )}
    </div>
  );
}
