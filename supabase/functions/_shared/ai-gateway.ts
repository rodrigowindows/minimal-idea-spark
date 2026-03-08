// Shared AI utilities for Edge Functions — uses Lovable AI Gateway
// Compatible with OpenAI completions API

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
const GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
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
    model = 'google/gemini-3-flash-preview',
    temperature = 0.7,
    maxTokens = 1024,
  } = options

  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured')
  }

  const response = await fetch(GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  })

  if (response.status === 429) {
    throw new Error('RATE_LIMITED: Too many requests. Please try again later.')
  }
  if (response.status === 402) {
    throw new Error('PAYMENT_REQUIRED: AI credits exhausted. Please add credits.')
  }
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`AI gateway error (${response.status}): ${text}`)
  }

  const data: ChatResponse = await response.json()
  return data.choices[0]?.message?.content ?? ''
}

export async function chatCompletionWithTools(
  messages: ChatMessage[],
  tools: any[],
  toolChoice: any,
  options: {
    model?: string
    temperature?: number
    maxTokens?: number
  } = {}
): Promise<any> {
  const {
    model = 'google/gemini-3-flash-preview',
    temperature = 0.3,
    maxTokens = 512,
  } = options

  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured')
  }

  const response = await fetch(GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      tools,
      tool_choice: toolChoice,
      temperature,
      max_tokens: maxTokens,
    }),
  })

  if (response.status === 429) {
    throw new Error('RATE_LIMITED: Too many requests. Please try again later.')
  }
  if (response.status === 402) {
    throw new Error('PAYMENT_REQUIRED: AI credits exhausted. Please add credits.')
  }
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`AI gateway error (${response.status}): ${text}`)
  }

  return await response.json()
}

export async function streamChatCompletion(
  messages: ChatMessage[],
  options: {
    model?: string
    temperature?: number
    maxTokens?: number
  } = {}
): Promise<Response> {
  const {
    model = 'google/gemini-3-flash-preview',
    temperature = 0.7,
    maxTokens = 1024,
  } = options

  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured')
  }

  const response = await fetch(GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }),
  })

  if (response.status === 429) {
    throw new Error('RATE_LIMITED: Too many requests. Please try again later.')
  }
  if (response.status === 402) {
    throw new Error('PAYMENT_REQUIRED: AI credits exhausted. Please add credits.')
  }
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`AI gateway error (${response.status}): ${text}`)
  }

  return response
}

// Keep backward compat for embedding (will be no-op for now)
export async function createEmbedding(_text: string): Promise<number[]> {
  console.warn('[createEmbedding] Not available via Lovable AI Gateway — returning empty')
  return []
}
