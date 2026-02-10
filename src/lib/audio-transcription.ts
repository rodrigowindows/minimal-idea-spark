export type SupportedLanguage = 'pt-BR' | 'en' | 'es';

export const SUPPORTED_LANGUAGES: { code: SupportedLanguage; label: string; whisperCode: string }[] = [
  { code: 'pt-BR', label: 'Portugues', whisperCode: 'pt' },
  { code: 'en', label: 'English', whisperCode: 'en' },
  { code: 'es', label: 'Espanol', whisperCode: 'es' },
];

export interface TranscriptionOptions {
  language?: SupportedLanguage;
  model?: string;
  prompt?: string;
}

export interface TranscriptionResult {
  text: string;
  language: string;
  duration?: number;
}

const DEEPGRAM_API = 'https://api.deepgram.com/v1/listen';

function getDeepgramApiKey(): string {
  const key = import.meta.env.VITE_DEEPGRAM_API_KEY;
  if (!key || key === 'undefined' || key === 'your-deepgram-api-key') {
    throw new Error(
      'Transcription not configured. Set VITE_DEEPGRAM_API_KEY in .env (get a key at https://deepgram.com).'
    );
  }
  return key;
}

/** True if backend transcription (Deepgram) is configured. */
export function isTranscriptionConfigured(): boolean {
  const key = import.meta.env.VITE_DEEPGRAM_API_KEY;
  return Boolean(key && key !== 'undefined' && key !== 'your-deepgram-api-key');
}

/** Browser SpeechRecognition (Chrome, Edge, Safari). Not in Firefox. */
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
  const apiKey = getDeepgramApiKey();
  const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === options.language) ?? SUPPORTED_LANGUAGES[0];
  const language = langConfig.whisperCode; // Deepgram uses pt, en, es
  const model = options.model || 'nova-2';

  const params = new URLSearchParams({ language, model });
  const url = `${DEEPGRAM_API}?${params.toString()}`;

  const contentType = audioBlob.type || 'audio/webm';
  console.info('[audio-transcription] request-start', {
    url,
    language,
    model,
    contentType,
    blobSize: audioBlob.size,
  });
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': contentType,
    },
    body: audioBlob,
  });
  console.info('[audio-transcription] response', {
    status: response.status,
    ok: response.ok,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    let message = `Transcription failed: ${response.status}`;
    try {
      const errJson = JSON.parse(errorText);
      if (errJson.err_msg) message = errJson.err_msg;
      if (errJson.message) message = errJson.message;
    } catch {
      if (errorText) message = errorText.slice(0, 200);
    }
    console.error('[audio-transcription] request-failed', {
      status: response.status,
      message,
      errorText: errorText?.slice(0, 300),
    });
    throw new Error(message);
  }

  const result = await response.json();
  const transcript =
    result?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';
  const duration = result?.metadata?.duration;
  console.info('[audio-transcription] request-success', {
    transcriptLength: typeof transcript === 'string' ? transcript.length : String(transcript).length,
    duration,
    language: langConfig.code,
  });
  return {
    text: typeof transcript === 'string' ? transcript.trim() : String(transcript).trim(),
    language: langConfig.code,
    duration: typeof duration === 'number' ? duration : undefined,
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
