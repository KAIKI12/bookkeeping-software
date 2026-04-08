import { describe, expect, it } from 'vitest'
import type { Bill } from '../../core/src/models'
import { createBillRepository } from './bill-repository'
import { createInMemoryDatabase } from './client'

const firstBill: Bill = {
  id: 'bill-1',
  type: 'expense',
  amount: 28,
  categoryId: 'lunch',
  tagIds: ['travel'],
  note: '旅游午饭',
  occurredAt: '2026-04-08T12:00:00.000Z',
  source: 'manual',
}

const secondBill: Bill = {
  id: 'bill-2',
  type: 'income',
  amount: 5000,
  categoryId: 'salary',
  tagIds: [],
  note: '4月工资',
  occurredAt: '2026-04-09T09:00:00.000Z',
  source: 'manual',
}

describe('bill repository', () => {
  it('creates and lists bills ordered by occurredAt desc', async () => {
    const repo = createBillRepository(createInMemoryDatabase())

    await repo.create(firstBill)
    await repo.create(secondBill)

    const bills = await repo.listRecent()

    expect(bills).toHaveLength(2)
    expect(bills[0].id).toBe('bill-2')
    expect(bills[1].tagIds).toEqual(['travel'])
  })

  it('lists bills by month', async () => {
    const repo = createBillRepository(createInMemoryDatabase())

    await repo.create(firstBill)
    await repo.create({
      ...secondBill,
      id: 'bill-3',
      occurredAt: '2026-05-01T09:00:00.000Z',
    })

    const aprilBills = await repo.listByMonth('2026-04')

    expect(aprilBills).toHaveLength(1)
    expect(aprilBills[0].id).toBe('bill-1')
  })
})
