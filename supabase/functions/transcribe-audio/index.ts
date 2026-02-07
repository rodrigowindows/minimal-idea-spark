import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const json = (obj: Record<string, unknown>, status: number) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      return json({ error: 'OpenAI API key not configured' }, 500);
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return json({ error: 'Invalid request body. Expected multipart/form-data.' }, 400);
    }

    const fileField = formData.get('file');
    const audioFile = fileField instanceof File ? fileField : null;
    const language = (formData.get('language') as string) || 'pt';
    const model = (formData.get('model') as string) || 'whisper-1';
    const prompt = formData.get('prompt') as string | null;

    if (!audioFile || audioFile.size === 0) {
      return json({ error: 'Audio file is required and must not be empty' }, 400);
    }

    const openaiFormData = new FormData();
    openaiFormData.append('file', audioFile, audioFile.name || 'audio.webm');
    openaiFormData.append('model', model);
    openaiFormData.append('response_format', 'verbose_json');
    openaiFormData.append('language', language);
    if (prompt) openaiFormData.append('prompt', prompt);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: openaiFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return json({ error: 'Transcription failed', details: errorText }, response.status);
    }

    const result = await response.json();
    const text = result.text ?? '';
    return json({
      text: typeof text === 'string' ? text : String(text),
      language: result.language ?? language,
      duration: result.duration,
    }, 200);
  } catch (error) {
    console.error('Transcription error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return json({ error: errorMessage }, 500);
  }
});
