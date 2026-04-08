export type OpenAICompatibleConfig = {
  apiKey: string
  baseURL: string
  model: string
}

export type ParsedTransactionDraft = {
  type: 'income' | 'expense'
  amount: number
  category: string
  tags: string[]
  note: string
  occurredAt: string
}

export type ParseTransactionResult = {
  parser: 'rule' | 'ai'
  draft: ParsedTransactionDraft
}

export type ParseTransactionOptions = {
  aiConfig?: OpenAICompatibleConfig
}

export type ChatCompletionMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}
