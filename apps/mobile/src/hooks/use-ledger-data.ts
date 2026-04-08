import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Bill } from '../../../../packages/core/src/models'
import { ensureSeedData, repository } from '../lib/ledger-store'

type DayGroupItem = {
  id: string
  category: string
  note: string
  amount: number
  time: string
  tags: string[]
  source: Bill['source']
}

type DayGroup = {
  key: string
  date: string
  weekday: string
  income: number
  expense: number
  items: DayGroupItem[]
}

type MonthSummary = {
  income: number
  expense: number
  balance: number
}

type AnalyticsSummary = {
  headline: string
  insight: string
  income: number
  expense: number
  balance: number
  overview: string
  trend: string
  hottestTag: string | null
  topCategories: Array<{ name: string; amount: number; share: number }>
}

type GoalSummary = {
  id: string
  name: string
  current: number
  target: number
  eta: string
}

type GoalSuggestion = {
  title: string
  hint: string
}

type SaveBillInput = {
  amount: number
  category: string
  note: string
  type: 'income' | 'expense'
  tags?: string[]
  occurredAt?: string
  source?: Bill['source']
}

type ImportBillInput = {
  amount: number
  category: string
  note: string
  type: 'income' | 'expense'
  tags?: string[]
  occurredAt?: string
}

type QuickComposerPreset = {
  category: string
  tags: string[]
  note: string
  amount: number
  type: 'income' | 'expense'
}

const weekdayFormatter = new Intl.DateTimeFormat('zh-CN', { weekday: 'short' })
const monthFormatter = new Intl.DateTimeFormat('zh-CN', { month: 'numeric' })
const goalTargets = [
  { id: 'goal-1', name: '买电脑', target: 8000 },
  { id: 'goal-2', name: '旅行基金', target: 5000 },
] as const

function toCurrencySummary(bills: Bill[]): MonthSummary {
  return bills.reduce(
    (accumulator, bill) => {
      if (bill.type === 'income') {
        accumulator.income += bill.amount
      } else {
        accumulator.expense += bill.amount
      }
      accumulator.balance = accumulator.income - accumulator.expense
      return accumulator
    },
    { income: 0, expense: 0, balance: 0 },
  )
}

function groupBillsByDay(bills: Bill[]): DayGroup[] {
  const groups = new Map<string, Bill[]>()

  for (const bill of bills) {
    const key = bill.occurredAt.slice(0, 10)
    const current = groups.get(key) ?? []
    current.push(bill)
    groups.set(key, current)
  }

  return [...groups.entries()].map(([key, items]) => {
    const date = new Date(`${key}T00:00:00`)
    const weekday = weekdayFormatter.format(date).replace('星期', '周')
    const income = items.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
    const expense = items.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)

    return {
      key,
      date: key,
      weekday,
      income,
      expense,
      items: [...items]
        .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
        .map((item) => ({
          id: item.id,
          category: item.categoryId,
          note: item.note,
          amount: item.type === 'income' ? item.amount : -item.amount,
          time: item.occurredAt.slice(11, 16),
          tags: item.tagIds,
          source: item.source,
        })),
    }
  })
}

function formatMonths(months: number) {
  if (months <= 1) {
    return '约 1 个月'
  }

  return `约 ${months} 个月`
}

function buildAnalyticsSummary(monthBills: Bill[], previousMonthBills: Bill[]): AnalyticsSummary {
  const current = toCurrencySummary(monthBills)
  const previous = toCurrencySummary(previousMonthBills)
  const expenseChange = current.expense - previous.expense
  const percent = previous.expense ? Math.round((Math.abs(expenseChange) / previous.expense) * 100) : 0
  const direction = expenseChange <= 0 ? '下降' : '上升'

  const categoryTotals = new Map<string, number>()
  const tagTotals = new Map<string, number>()

  for (const bill of monthBills) {
    if (bill.type !== 'expense') {
      continue
    }

    categoryTotals.set(bill.categoryId, (categoryTotals.get(bill.categoryId) ?? 0) + bill.amount)
    for (const tag of bill.tagIds) {
      tagTotals.set(tag, (tagTotals.get(tag) ?? 0) + bill.amount)
    }
  }

  const topCategories = [...categoryTotals.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)

  const hottestTag = [...tagTotals.entries()].sort((left, right) => right[1] - left[1])[0]?.[0]
  const recentExpenses = monthBills.filter((bill) => bill.type === 'expense').slice(0, 7)
  const weekendCount = recentExpenses.filter((bill) => {
    const day = new Date(bill.occurredAt).getDay()
    return day === 0 || day === 6
  }).length
  const manualCount = monthBills.filter((bill) => bill.source === 'manual').length
  const aiCount = monthBills.filter((bill) => bill.source === 'chat').length

  return {
    headline: previous.expense
      ? `${monthFormatter.format(new Date('2026-04-01'))}支出较上月${direction} ${percent}%`
      : '本月刚开始记账，先积累几笔数据',
    insight: hottestTag
      ? `本月支出 ${current.expense.toFixed(0)} 元，标签“${hottestTag}”热度最高。`
      : `本月已记录收入 ${current.income.toFixed(0)} 元，支出 ${current.expense.toFixed(0)} 元。`,
    income: current.income,
    expense: current.expense,
    balance: current.balance,
    overview: `本月共记 ${monthBills.length} 笔，手动 ${manualCount} 笔，AI 识别 ${aiCount} 笔。`,
    trend: weekendCount >= Math.ceil(recentExpenses.length / 2)
      ? '最近 7 笔支出更多出现在周末，外出和休闲消费更集中。'
      : '最近 7 笔支出主要落在工作日，消费节奏较平稳。',
    hottestTag: hottestTag ?? null,
    topCategories: topCategories.map(([name, amount]) => ({
      name,
      amount,
      share: Math.round((amount / Math.max(current.expense, 1)) * 100),
    })),
  }
}

function buildGoalSummaries(monthBills: Bill[], averageBalance: number): { goals: GoalSummary[]; suggestion: GoalSuggestion } {
  const current = toCurrencySummary(monthBills)
  const monthlySaving = Math.max(averageBalance || current.balance, 1)

  const goals = goalTargets.map((goal) => {
    const currentAmount = Math.max(Math.round(current.balance * 0.65), 0)
    const remaining = Math.max(goal.target - currentAmount, 0)
    const eta = remaining === 0 ? '已达成' : formatMonths(Math.ceil(remaining / monthlySaving))

    return {
      id: goal.id,
      name: goal.name,
      current: currentAmount,
      target: goal.target,
      eta,
    }
  })

  const primaryGoal = goals[0]
  const monthlyGap = Math.max(Math.ceil((primaryGoal.target - primaryGoal.current) / 6), 0)

  return {
    goals,
    suggestion: {
      title: '本月建议',
      hint: primaryGoal.current >= primaryGoal.target
        ? `“${primaryGoal.name}”已经达成，可以开始设下一个目标。`
        : `如果想把“${primaryGoal.name}”再提前一点完成，建议月均多攒 ¥${monthlyGap || 200}。`,
    },
  }
}

export function useLedgerData() {
  const [bills, setBills] = useState<Bill[]>([])

  const refresh = useCallback(async () => {
    await ensureSeedData()
    const recent = await repository.listRecent()
    setBills(recent)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const monthBills = useMemo(() => bills.filter((bill) => bill.occurredAt.startsWith('2026-04')), [bills])
  const previousMonthBills = useMemo(() => bills.filter((bill) => bill.occurredAt.startsWith('2026-03')), [bills])
  const summary = useMemo(() => toCurrencySummary(monthBills), [monthBills])
  const previousSummary = useMemo(() => toCurrencySummary(previousMonthBills), [previousMonthBills])
  const groups = useMemo(() => groupBillsByDay(monthBills), [monthBills])
  const analytics = useMemo(() => buildAnalyticsSummary(monthBills, previousMonthBills), [monthBills, previousMonthBills])
  const averageBalance = useMemo(() => {
    const allMonths = new Map<string, Bill[]>()
    for (const bill of bills) {
      const monthKey = bill.occurredAt.slice(0, 7)
      const current = allMonths.get(monthKey) ?? []
      current.push(bill)
      allMonths.set(monthKey, current)
    }

    const balances = [...allMonths.values()].map((items) => toCurrencySummary(items).balance)
    if (!balances.length) {
      return 0
    }

    return balances.reduce((sum, item) => sum + item, 0) / balances.length
  }, [bills])
  const goals = useMemo(() => buildGoalSummaries(monthBills, averageBalance), [averageBalance, monthBills])
  const recentCategoryChoices = useMemo(() => [...new Set(bills.map((bill) => bill.categoryId))].slice(0, 4), [bills])
  const recentTagChoices = useMemo(() => [...new Set(bills.flatMap((bill) => bill.tagIds))].slice(0, 6), [bills])
  const latestBillPreset = useMemo<QuickComposerPreset | null>(() => {
    const latest = bills[0]
    if (!latest) {
      return null
    }

    return {
      category: latest.categoryId,
      tags: latest.tagIds,
      note: latest.note,
      amount: latest.amount,
      type: latest.type,
    }
  }, [bills])

  const addManualBill = useCallback(async (input: SaveBillInput) => {
    const occurredAt = input.occurredAt ?? new Date().toISOString()
    await repository.create({
      id: `bill-${Date.now()}`,
      type: input.type,
      amount: input.amount,
      categoryId: input.category,
      tagIds: input.tags ?? [],
      note: input.note,
      occurredAt,
      source: input.source ?? 'manual',
    })
    await refresh()
  }, [refresh])

  const importBills = useCallback(async (inputs: ImportBillInput[]) => {
    const nextBills = inputs.map((input, index) => ({
      id: `import-${Date.now()}-${index}`,
      type: input.type,
      amount: input.amount,
      categoryId: input.category,
      tagIds: input.tags ?? [],
      note: input.note,
      occurredAt: input.occurredAt ?? new Date().toISOString(),
      source: 'import' as const,
    }))

    await repository.createMany(nextBills)
    await refresh()
  }, [refresh])

  return {
    bills,
    groups,
    summary,
    previousSummary,
    analytics,
    goals: goals.goals,
    goalSuggestion: goals.suggestion,
    recentCategoryChoices,
    recentTagChoices,
    latestBillPreset,
    addManualBill,
    importBills,
    refresh,
  }
}
