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

function getSupabaseUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url || url === 'undefined') {
    throw new Error(
      'Transcription not configured. Set VITE_SUPABASE_URL in .env and deploy the transcribe-audio Edge Function.'
    );
  }
  return url;
}

export async function transcribeAudio(
  audioBlob: Blob,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const supabaseUrl = getSupabaseUrl();
  const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === options.language) ?? SUPPORTED_LANGUAGES[0];

  const formData = new FormData();
  const fileName = audioBlob.type === 'audio/webm' ? 'audio.webm' : audioBlob.type === 'audio/mp4' ? 'audio.m4a' : 'audio.webm';
  formData.append('file', audioBlob, fileName);
  formData.append('language', langConfig.whisperCode);
  formData.append('model', options.model || 'whisper-1');
  if (options.prompt) formData.append('prompt', options.prompt);

  let token = '';
  try {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token ?? '';
  } catch {
    // Continue without auth; Edge Function may allow anonymous
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/transcribe-audio`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    let message = `Transcription failed: ${response.status}`;
    try {
      const errJson = JSON.parse(errorText);
      if (errJson.error) message = errJson.error;
      if (errJson.details) message += ' — ' + errJson.details;
    } catch {
      if (errorText) message = errorText.slice(0, 200);
    }
    throw new Error(message);
  }

  const result = await response.json();
  const text = result.text ?? '';
  return {
    text: typeof text === 'string' ? text : String(text),
    language: result.language ?? langConfig.code,
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

const STORAGE_KEY = 'minimal_idea_spark_transcription_history';

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
