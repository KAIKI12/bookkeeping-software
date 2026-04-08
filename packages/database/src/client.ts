import type { Bill } from '../../core/src/models'

type InMemoryDatabase = {
  bills: Bill[]
}

export function createInMemoryDatabase(): InMemoryDatabase {
  return {
    bills: [],
  }
}

export type DatabaseClient = InMemoryDatabase
