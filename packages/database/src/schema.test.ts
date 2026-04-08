import { describe, expect, it } from 'vitest'
import { billTagsTable, billsTable, categoriesTable, importRecordsTable, savingGoalsTable, tagsTable } from './schema'

describe('schema', () => {
  it('defines bills table columns', () => {
    expect(billsTable.id.name).toBe('id')
    expect(billsTable.amount.name).toBe('amount')
    expect(billsTable.source.name).toBe('source')
  })

  it('defines related tables', () => {
    expect(categoriesTable.name.name).toBe('name')
    expect(tagsTable.name.name).toBe('name')
    expect(billTagsTable.billId.name).toBe('bill_id')
    expect(savingGoalsTable.targetAmount.name).toBe('target_amount')
    expect(importRecordsTable.totalCount.name).toBe('total_count')
  })
})
