import { createOpenAICompatibleClient } from './openai-compatible-client'
import type { ParseTransactionOptions, ParseTransactionResult, ParsedTransactionDraft } from './types'

const CATEGORY_KEYWORDS = [
  { category: '午饭', keywords: ['午餐', '午饭'] },
  { category: '交通', keywords: ['打车', '出租车', '地铁', '公交', '车费'] },
  { category: '咖啡', keywords: ['咖啡'] },
  { category: '房租', keywords: ['房租', '租金'] },
  { category: '购物', keywords: ['购物', '买衣服', '上衣', '裤子', '鞋子'] },
  { category: '娱乐', keywords: ['电影', '游戏', '娱乐'] },
  { category: '旅行', keywords: ['旅游', '旅行'] },
  { category: '医疗', keywords: ['医院', '药', '挂号', '医疗'] },
  { category: '学习', keywords: ['课程', '学费', '书', '学习'] },
  { category: '日用', keywords: ['超市', '日用', '生活用品'] },
  { category: '宠物', keywords: ['宠物', '猫粮', '狗粮'] },
  { category: '工资', keywords: ['工资', '薪资', '薪水'] },
] as const

const INCOME_KEYWORDS = ['收入', '工资', '报销', '退款', '奖金'] as const
const COMPLEX_HINTS = ['昨天', '今天', '前天', '和', '朋友', '旅游', '因为', '然后', '了'] as const

function extractAmount(input: string) {
  const matches = input.match(/\d+(?:\.\d+)?/g)
  if (!matches?.length) {
    return 0
  }

  const last = Number(matches.at(-1) ?? 0)
  return Number.isNaN(last) ? 0 : last
}

function inferType(input: string): 'income' | 'expense' {
  return INCOME_KEYWORDS.some((keyword) => input.includes(keyword)) ? 'income' : 'expense'
}

function inferCategory(input: string, type: 'income' | 'expense') {
  const matched = CATEGORY_KEYWORDS.find(({ keywords }) => keywords.some((keyword) => input.includes(keyword)))
  if (matched) {
    return matched.category
  }

  return type === 'income' ? '收入' : '其他'
}

function isComplexInput(input: string) {
  const normalized = input.replace(/\s+/g, '')
  if (normalized.length > 12) {
    return true
  }

  return COMPLEX_HINTS.some((hint) => normalized.includes(hint))
}

function createDraft(input: string): ParsedTransactionDraft {
  const normalized = input.trim()
  const type = inferType(normalized)

  return {
    type,
    amount: extractAmount(normalized),
    category: inferCategory(normalized, type),
    tags: [],
    note: normalized,
    occurredAt: new Date().toISOString(),
  }
}

function coerceDraft(input: string, payload: unknown, fallback: ParsedTransactionDraft): ParsedTransactionDraft {
  if (!payload || typeof payload !== 'object') {
    return fallback
  }

  const record = payload as Record<string, unknown>
  const type = record.type === 'income' ? 'income' : 'expense'
  const amount = typeof record.amount === 'number' ? record.amount : fallback.amount
  const category = typeof record.category === 'string' && record.category ? record.category : fallback.category
  const tags = Array.isArray(record.tags) ? record.tags.filter((tag): tag is string => typeof tag === 'string') : []
  const note = typeof record.note === 'string' && record.note ? record.note : input
  const occurredAt = typeof record.occurredAt === 'string' && record.occurredAt ? record.occurredAt : fallback.occurredAt

  return {
    type,
    amount,
    category,
    tags,
    note,
    occurredAt,
  }
}

async function parseWithAI(input: string, fallback: ParsedTransactionDraft, options?: ParseTransactionOptions) {
  if (!options?.aiConfig) {
    return fallback
  }

  const response = await createOpenAICompatibleClient(options.aiConfig, [
    {
      role: 'system',
      content: '你是记账解析器。只返回 JSON，不要输出 markdown。字段固定为 type, amount, category, tags, note, occurredAt。type 只能是 income 或 expense。',
    },
    {
      role: 'user',
      content: input,
    },
  ])

  const content = response?.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    return fallback
  }

  try {
    return coerceDraft(input, JSON.parse(content), fallback)
  } catch {
    return fallback
  }
}

export async function parseTransactionInput(input: string, options?: ParseTransactionOptions): Promise<ParseTransactionResult> {
  const draft = createDraft(input)

  if (isComplexInput(input)) {
    return {
      parser: 'ai',
      draft: await parseWithAI(input, draft, options),
    }
  }

  return {
    parser: 'rule',
    draft,
  }
}
