import { describe, expect, it } from 'vitest'
import { billSchema, categorySchema, importRecordSchema, savingGoalSchema, tagSchema } from './models'

describe('models', () => {
  it('accepts a valid expense bill', () => {
    const bill = billSchema.parse({
      id: 'bill-1',
      type: 'expense',
      amount: 28,
      categoryId: 'lunch',
      tagIds: ['travel'],
      note: '旅游午饭',
      occurredAt: '2026-04-08T12:00:00.000Z',
      source: 'manual',
    })

    expect(bill.amount).toBe(28)
    expect(bill.source).toBe('manual')
  })

  it('accepts a valid saving goal', () => {
    const goal = savingGoalSchema.parse({
      id: 'goal-1',
      name: '买电脑',
      targetAmount: 8000,
      currentAmount: 2000,
      targetDate: '2026-12-31',
    })

    expect(goal.targetAmount).toBe(8000)
  })

  it('accepts category tag and import record', () => {
    const category = categorySchema.parse({ id: 'shopping', name: '购物', kind: 'expense', system: true })
    const tag = tagSchema.parse({ id: 'travel', name: '旅游' })
    const importRecord = importRecordSchema.parse({
      id: 'import-1',
      source: 'wechat',
      importedAt: '2026-04-08T12:00:00.000Z',
      totalCount: 10,
      importedCount: 8,
      skippedCount: 2,
    })

    expect(category.name).toBe('购物')
    expect(tag.name).toBe('旅游')
    expect(importRecord.importedCount).toBe(8)
  })
})
