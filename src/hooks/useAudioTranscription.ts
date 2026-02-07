import { useState, useRef, useCallback } from 'react';
import {
  transcribeAudio,
  saveTranscriptionLocal,
  getTranscriptionHistory,
  clearTranscriptionHistory,
  type SupportedLanguage,
  type TranscriptionRecord,
} from '@/lib/audio-transcription';
import { toast } from 'sonner';

interface UseAudioTranscriptionOptions {
  language?: SupportedLanguage;
  sourcePage?: string;
  onTranscription?: (text: string) => void;
}

export function useAudioTranscription(options: UseAudioTranscriptionOptions = {}) {
  const { language = 'pt-BR', sourcePage, onTranscription } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [lastTranscription, setLastTranscription] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleTranscribe = useCallback(async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const result = await transcribeAudio(audioBlob, { language });
      setLastTranscription(result.text);
      saveTranscriptionLocal(result.text, result.language, sourcePage);
      onTranscription?.(result.text);
      toast.success('Audio transcrito com sucesso!');
      return result.text;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      toast.error('Erro na transcricao. Tente novamente.');
      return null;
    } finally {
      setIsProcessing(false);
      setRecordingDuration(0);
    }
  }, [language, sourcePage, onTranscription]);

  const startRecording = useCallback(async () => {
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
        if (e.data.size > 0) chunksRef.current.push(e.data);
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
  }, [handleTranscribe]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const transcribeFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('audio/')) {
      toast.error('Por favor, selecione um arquivo de audio');
      return null;
    }
    return handleTranscribe(file);
  }, [handleTranscribe]);

  const getHistory = useCallback((limit?: number): TranscriptionRecord[] => {
    return getTranscriptionHistory(limit);
  }, []);

  const clearHistory = useCallback(() => {
    clearTranscriptionHistory();
  }, []);

  return {
    isRecording,
    isProcessing,
    recordingDuration,
    lastTranscription,
    startRecording,
    stopRecording,
    transcribeFile,
    getHistory,
    clearHistory,
  };
}
