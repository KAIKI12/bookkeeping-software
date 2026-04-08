import type { Bill } from '../../core/src/models'
import type { DatabaseClient } from './client'

export function createBillRepository(database: DatabaseClient) {
  return {
    async create(bill: Bill) {
      database.bills.push(bill)
      return bill
    },

    async listRecent() {
      return [...database.bills].sort((left, right) =>
        right.occurredAt.localeCompare(left.occurredAt),
      )
    },

    async listByMonth(month: string) {
      return database.bills.filter((bill) => bill.occurredAt.startsWith(month))
    },
  }
}
