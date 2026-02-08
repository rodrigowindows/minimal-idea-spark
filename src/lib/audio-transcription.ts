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

/** True if backend transcription (Supabase + transcribe-audio) is configured. */
export function isTranscriptionConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  return Boolean(url && url !== 'undefined');
}

/** Browser SpeechRecognition (Chrome, Edge, Safari). Not in Firefox. */
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
}
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
  length: number;
  item(i: number): SpeechRecognitionResult;
  [i: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  length: number;
  item(i: number): SpeechRecognitionResultItem;
  [i: number]: SpeechRecognitionResultItem;
  isFinal: boolean;
}
interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}

const SpeechRecognitionCtor =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : undefined;

/** Whether the browser supports live speech recognition (no backend). */
export function isBrowserRecognitionSupported(): boolean {
  return Boolean(SpeechRecognitionCtor);
}

const langToBrowserCode: Record<SupportedLanguage, string> = {
  'pt-BR': 'pt-BR',
  en: 'en',
  es: 'es',
};

/**
 * Use the browser's built-in speech recognition (no API keys, no backend).
 * Chrome, Edge, Safari. Not supported in Firefox.
 * Call start() on pointer down, stop() on pointer up; stop() resolves with the transcript.
 */
export function createBrowserRecognizer(
  language: SupportedLanguage
): { start: () => void; stop: () => Promise<{ text: string }> } {
  if (!SpeechRecognitionCtor) {
    return {
      start: () => {},
      stop: () => Promise.reject(new Error('Browser speech recognition not supported')),
    };
  }
  let recognizer: SpeechRecognitionInstance | null = null;
  let resolveStop: ((value: { text: string }) => void) | null = null;
  let stopPromise: Promise<{ text: string }> = Promise.resolve({ text: '' });
  const transcripts: string[] = [];

  const onResult = (e: SpeechRecognitionEvent) => {
    const result = e.results[e.results.length - 1];
    const item = result[0];
    if (item?.transcript && result.isFinal) {
      transcripts.push(item.transcript.trim());
    }
  };

  const onEnd = () => {
    if (recognizer) {
      recognizer.onresult = null;
      recognizer.onend = null;
      recognizer.onerror = null;
      recognizer = null;
    }
    if (resolveStop) {
      resolveStop({ text: transcripts.join(' ').trim() });
      resolveStop = null;
    }
  };

  const onError = (e: { error: string }) => {
    if (e.error !== 'aborted') {
      console.warn('Speech recognition error:', e.error);
    }
    onEnd();
  };

  return {
    start() {
      transcripts.length = 0;
      stopPromise = new Promise<{ text: string }>((resolve) => {
        resolveStop = resolve;
      });
      const r = new SpeechRecognitionCtor!();
      r.continuous = true;
      r.interimResults = true;
      r.lang = langToBrowserCode[language] ?? 'pt-BR';
      r.onresult = onResult;
      r.onend = onEnd;
      r.onerror = onError;
      recognizer = r;
      r.start();
    },
    stop() {
      if (recognizer) {
        recognizer.stop();
      } else {
        onEnd();
      }
      return stopPromise;
    },
  };
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
