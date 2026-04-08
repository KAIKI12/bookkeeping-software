import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseTransactionInput } from './parse-transaction'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('parseTransactionInput', () => {
  it('parses simple category and amount without AI', async () => {
    const result = await parseTransactionInput('午餐20')

    expect(result.parser).toBe('rule')
    expect(result.draft.category).toBe('午饭')
    expect(result.draft.amount).toBe(20)
    expect(result.draft.type).toBe('expense')
  })

  it('parses simple taxi input without AI', async () => {
    const result = await parseTransactionInput('打车36')

    expect(result.parser).toBe('rule')
    expect(result.draft.category).toBe('交通')
    expect(result.draft.amount).toBe(36)
  })

  it('marks complex sentence for ai fallback', async () => {
    const result = await parseTransactionInput('昨天和朋友去杭州旅游吃午饭花了20')

    expect(result.parser).toBe('ai')
    expect(result.draft.amount).toBe(20)
    expect(result.draft.note).toContain('昨天和朋友')
  })

  it('uses ai result when config is provided', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                type: 'expense',
                amount: 20,
                category: '午饭',
                tags: ['旅游'],
                note: '和朋友旅游午饭',
                occurredAt: '2026-04-08T12:00:00.000Z',
              }),
            },
          },
        ],
      }),
    }))

    const result = await parseTransactionInput('昨天和朋友去杭州旅游吃午饭花了20', {
      aiConfig: {
        apiKey: 'test-key',
        baseURL: 'https://example.com',
        model: 'gpt-test',
      },
    })

    expect(result.parser).toBe('ai')
    expect(result.draft.tags).toEqual(['旅游'])
    expect(result.draft.note).toBe('和朋友旅游午饭')
  })
})
