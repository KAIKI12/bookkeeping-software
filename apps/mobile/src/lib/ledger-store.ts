import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Bill } from '../../../../packages/core/src/models'

export type StoredGoal = {
  id: string
  name: string
  target: number
  createdAt: string
}

const LEDGER_STORAGE_KEY = 'bookkeeping.ledger.bills'
const GOALS_STORAGE_KEY = 'bookkeeping.ledger.goals'

const seedBills: Bill[] = [
  {
    id: 'seed-1',
    type: 'expense',
    amount: 28,
    categoryId: '午饭',
    tagIds: [],
    note: '公司楼下简餐',
    occurredAt: '2026-04-08T12:21:00.000Z',
    source: 'manual',
  },
  {
    id: 'seed-2',
    type: 'expense',
    amount: 18,
    categoryId: '咖啡',
    tagIds: [],
    note: '瑞幸',
    occurredAt: '2026-04-08T15:08:00.000Z',
    source: 'manual',
  },
  {
    id: 'seed-3',
    type: 'expense',
    amount: 80,
    categoryId: '打车',
    tagIds: [],
    note: '回家',
    occurredAt: '2026-04-08T19:40:00.000Z',
    source: 'manual',
  },
  {
    id: 'seed-4',
    type: 'income',
    amount: 5000,
    categoryId: '工资',
    tagIds: [],
    note: '4月工资',
    occurredAt: '2026-04-07T09:00:00.000Z',
    source: 'manual',
  },
  {
    id: 'seed-5',
    type: 'expense',
    amount: 199,
    categoryId: '购物',
    tagIds: ['服饰'],
    note: '上衣',
    occurredAt: '2026-04-07T20:18:00.000Z',
    source: 'manual',
  },
  {
    id: 'seed-6',
    type: 'expense',
    amount: 87,
    categoryId: '晚饭',
    tagIds: [],
    note: '火锅',
    occurredAt: '2026-04-07T21:03:00.000Z',
    source: 'manual',
  },
]

async function loadBills(): Promise<Bill[]> {
  const raw = await AsyncStorage.getItem(LEDGER_STORAGE_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as Bill[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function saveBills(bills: Bill[]) {
  await AsyncStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(bills))
}

async function loadGoals(): Promise<StoredGoal[]> {
  const raw = await AsyncStorage.getItem(GOALS_STORAGE_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as StoredGoal[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function saveGoals(goals: StoredGoal[]) {
  await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals))
}

export const repository = {
  async create(bill: Bill) {
    const bills = await loadBills()
    bills.push(bill)
    await saveBills(bills)
    return bill
  },

  async createMany(nextBills: Bill[]) {
    const bills = await loadBills()
    bills.push(...nextBills)
    await saveBills(bills)
    return nextBills
  },

  async listRecent() {
    const bills = await loadBills()
    return [...bills].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
  },

  async listByMonth(month: string) {
    const bills = await loadBills()
    return bills.filter((bill) => bill.occurredAt.startsWith(month))
  },

  async listGoals() {
    const goals = await loadGoals()
    return [...goals].sort((left, right) => left.createdAt.localeCompare(right.createdAt))
  },

  async createGoal(goal: StoredGoal) {
    const goals = await loadGoals()
    goals.push(goal)
    await saveGoals(goals)
    return goal
  },

  async updateGoal(goalId: string, updates: Pick<StoredGoal, 'name' | 'target'>) {
    const goals = await loadGoals()
    const nextGoals = goals.map((goal) =>
      goal.id === goalId
        ? {
            ...goal,
            ...updates,
          }
        : goal,
    )
    await saveGoals(nextGoals)
    return nextGoals.find((goal) => goal.id === goalId) ?? null
  },

  async removeGoal(goalId: string) {
    const goals = await loadGoals()
    const nextGoals = goals.filter((goal) => goal.id !== goalId)
    await saveGoals(nextGoals)
  },
}

let seeded = false

export async function ensureSeedData() {
  if (seeded) {
    return
  }

  const existing = await loadBills()
  if (existing.length > 0) {
    seeded = true
    return
  }

  await saveBills(seedBills)
  seeded = true
}
