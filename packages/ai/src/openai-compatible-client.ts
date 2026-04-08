import type { ChatCompletionMessage, OpenAICompatibleConfig } from './types'

export async function createOpenAICompatibleClient(
  config: OpenAICompatibleConfig,
  messages: ChatCompletionMessage[],
) {
  const response = await fetch(`${config.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
    }),
  })

  if (!response.ok) {
    throw new Error(`AI request failed with status ${response.status}`)
  }

  return response.json()
}
