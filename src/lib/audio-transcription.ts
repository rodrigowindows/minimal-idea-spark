import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface TranscriptionOptions {
  language?: string;
  model?: 'whisper-1';
  prompt?: string;
}

export async function transcribeAudio(
  audioBlob: Blob,
  options: TranscriptionOptions = {}
): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    if (options.language) formData.append('language', options.language);
    if (options.prompt) formData.append('prompt', options.prompt);
    formData.append('model', options.model || 'whisper-1');

    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch(
      `${supabaseUrl}/functions/v1/transcribe-audio`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Transcription failed');
    }

    const result = await response.json();
    return result.text;
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
}

export async function saveTranscription(
  text: string,
  audioUrl?: string
): Promise<void> {
  const { error } = await supabase.from('transcriptions').insert({
    text,
    audio_url: audioUrl,
    created_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function getTranscriptionHistory(limit = 50) {
  const { data, error } = await supabase
    .from('transcriptions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
