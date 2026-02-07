import { supabase } from '@/integrations/supabase/client';

export type SupportedLanguage = 'pt-BR' | 'en' | 'es';

export const SUPPORTED_LANGUAGES: { code: SupportedLanguage; label: string; whisperCode: string }[] = [
  { code: 'pt-BR', label: 'Portugues', whisperCode: 'pt' },
  { code: 'en', label: 'English', whisperCode: 'en' },
  { code: 'es', label: 'Espanol', whisperCode: 'es' },
];

export interface TranscriptionOptions {
  language?: SupportedLanguage;
  model?: 'whisper-1';
  prompt?: string;
}

export interface TranscriptionResult {
  text: string;
  language: string;
  duration?: number;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export async function transcribeAudio(
  audioBlob: Blob,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === options.language) ?? SUPPORTED_LANGUAGES[0];

  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('language', langConfig.whisperCode);
  formData.append('model', options.model || 'whisper-1');
  if (options.prompt) formData.append('prompt', options.prompt);

  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/transcribe-audio`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ''}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Transcription failed: ${errorText}`);
  }

  const result = await response.json();
  return {
    text: result.text,
    language: langConfig.code,
    duration: result.duration,
  };
}

export interface TranscriptionRecord {
  id: string;
  text: string;
  language: string;
  audio_url?: string;
  source_page?: string;
  created_at: string;
}

const STORAGE_KEY = 'lifeos_transcription_history';

export function saveTranscriptionLocal(
  text: string,
  language: string,
  sourcePage?: string
): TranscriptionRecord {
  const records: TranscriptionRecord[] = JSON.parse(
    localStorage.getItem(STORAGE_KEY) || '[]'
  );
  const record: TranscriptionRecord = {
    id: `tr-${Date.now()}`,
    text,
    language,
    source_page: sourcePage,
    created_at: new Date().toISOString(),
  };
  records.unshift(record);
  // Keep last 200 entries
  if (records.length > 200) records.length = 200;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  return record;
}

export function getTranscriptionHistory(limit = 50): TranscriptionRecord[] {
  const records: TranscriptionRecord[] = JSON.parse(
    localStorage.getItem(STORAGE_KEY) || '[]'
  );
  return records.slice(0, limit);
}

export function clearTranscriptionHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
