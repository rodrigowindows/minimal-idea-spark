// Shared OpenAI utilities for Edge Functions

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface EmbeddingResponse {
  data: Array<{ embedding: number[] }>
}

interface ChatResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

export async function createEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`)
  }

  const data: EmbeddingResponse = await response.json()
  return data.data[0].embedding
}

export async function chatCompletion(
  messages: ChatMessage[],
  options: {
    model?: string
    temperature?: number
    maxTokens?: number
  } = {}
): Promise<string> {
  const {
    model = 'gpt-4o-mini',
    temperature = 0.7,
    maxTokens = 1024,
  } = options

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`)
  }

  const data: ChatResponse = await response.json()
  return data.choices[0].message.content
}
