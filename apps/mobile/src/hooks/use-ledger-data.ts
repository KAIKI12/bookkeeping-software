import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Bill } from '../../../../packages/core/src/models'
import { ensureSeedData, repository, type StoredGoal } from '../lib/ledger-store'

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

type MoneySummary = {
  income: number
  expense: number
  balance: number
}

type CategoryStat = {
  name: string
  amount: number
  share: number
}

type TagStat = {
  name: string
  amount: number
  share: number
}

type DailyExpenseStat = {
  date: string
  label: string
  expense: number
}

type CalendarDayStat = {
  date: string
  label: string
  weekday: string
  expense: number
  income: number
  count: number
  intensity: 'low' | 'medium' | 'high'
}

type MonthlyTrendPoint = {
  month: string
  income: number
  expense: number
  balance: number
}

type AnalyticsPayload = {
  overview: {
    headline: string
    insight: string
    summary: MoneySummary
    overview: string
    trend: string
    hottestTag: string | null
    topCategories: CategoryStat[]
    topTags: TagStat[]
    highestExpenseDay: string
    monthLabel: string
    recordCount: number
    sourceSummary: Array<{ label: string; value: string }>
  }
  month: {
    label: string
    summary: MoneySummary
    comparison: string
    overview: string
    topCategories: CategoryStat[]
    topTags: TagStat[]
    highestExpenseDay: string
    dailyExpenses: DailyExpenseStat[]
    highlights: Array<{ label: string; value: string }>
  }
  year: {
    label: string
    summary: MoneySummary
    months: MonthlyTrendPoint[]
    topCategories: CategoryStat[]
    topTags: TagStat[]
    busiestMonth: string
    highlights: Array<{ label: string; value: string }>
  }
  calendar: {
    label: string
    days: CalendarDayStat[]
    highestExpenseDay: string
  }
}

type GoalSummary = {
  id: string
  name: string
  current: number
  target: number
  eta: string
}

type GoalDraft = {
  name: string
  target: number
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
const yearMonthFormatter = new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' })

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

function getYearKey(date: Date) {
  return String(date.getFullYear())
}

function getPreviousMonthKey(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 2, 1)
  return getMonthKey(date)
}

function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number)
  return `${year}年${month}月`
}

function getYearLabel(yearKey: string) {
  return `${yearKey}年`
}

function toCurrencySummary(bills: Bill[]): MoneySummary {
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

  return [...groups.entries()]
    .map(([key, items]) => {
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
    .sort((left, right) => right.date.localeCompare(left.date))
}

function normalizeCategory(category: string) {
  const value = category.trim()

  if (['午饭', '午餐', '晚饭', '晚餐', '早餐', '餐饮', '咖啡', '奶茶', '宵夜'].includes(value)) {
    return '餐饮'
  }

  return value
}

function deriveAutoTags(bill: Bill) {
  const tags = [...bill.tagIds]
  const normalizedCategory = normalizeCategory(bill.categoryId)

  if (normalizedCategory === '餐饮') {
    tags.push(bill.amount > 80 ? '大餐' : '小餐')
  }

  return [...new Set(tags)]
}

function summarizeCategories(bills: Bill[]) {
  const totals = new Map<string, number>()

  for (const bill of bills) {
    if (bill.type !== 'expense') {
      continue
    }

    const category = normalizeCategory(bill.categoryId)
    totals.set(category, (totals.get(category) ?? 0) + bill.amount)
  }

  const totalExpense = bills.filter((bill) => bill.type === 'expense').reduce((sum, bill) => sum + bill.amount, 0)

  return [...totals.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([name, amount]) => ({
      name,
      amount,
      share: Math.round((amount / Math.max(totalExpense, 1)) * 100),
    }))
}

function summarizeTags(bills: Bill[]) {
  const totals = new Map<string, number>()

  for (const bill of bills) {
    if (bill.type !== 'expense') {
      continue
    }

    for (const tag of deriveAutoTags(bill)) {
      totals.set(tag, (totals.get(tag) ?? 0) + bill.amount)
    }
  }

  const totalExpense = bills.filter((bill) => bill.type === 'expense').reduce((sum, bill) => sum + bill.amount, 0)

  return [...totals.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([name, amount]) => ({
      name,
      amount,
      share: Math.round((amount / Math.max(totalExpense, 1)) * 100),
    }))
}

function buildDailyExpenseStats(groups: DayGroup[]): DailyExpenseStat[] {
  return [...groups]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((group) => ({
      date: group.date,
      label: yearMonthFormatter.format(new Date(`${group.date}T00:00:00`)),
      expense: group.expense,
    }))
}

function describeHighestExpenseDay(groups: DayGroup[], monthLabel: string) {
  const highest = groups.reduce<DayGroup | null>((current, group) => {
    if (!current || group.expense > current.expense) {
      return group
    }
    return current
  }, null)

  if (!highest || highest.expense <= 0) {
    return `${monthLabel}还没有形成明显高消费日。`
  }

  return `${monthLabel}支出最高的是 ${highest.date.slice(5).replace('-', '/')}，当天共支出 ¥${highest.expense.toFixed(0)}。`
}

function describeTrend(monthBills: Bill[]) {
  const recentExpenses = monthBills.filter((bill) => bill.type === 'expense').slice(0, 7)
  const weekendCount = recentExpenses.filter((bill) => {
    const day = new Date(bill.occurredAt).getDay()
    return day === 0 || day === 6
  }).length

  if (!recentExpenses.length) {
    return '本月还没有足够的支出记录，先继续记几笔再看趋势。'
  }

  return weekendCount >= Math.ceil(recentExpenses.length / 2)
    ? '最近 7 笔支出更多出现在周末，外出和休闲消费更集中。'
    : '最近 7 笔支出主要落在工作日，消费节奏较平稳。'
}

function buildOverviewAnalytics(monthBills: Bill[], previousMonthBills: Bill[], monthLabel: string) {
  const current = toCurrencySummary(monthBills)
  const previous = toCurrencySummary(previousMonthBills)
  const topCategories = summarizeCategories(monthBills).slice(0, 3)
  const topTags = summarizeTags(monthBills).slice(0, 3)
  const hottestTag = topTags[0]?.name ?? null
  const groups = groupBillsByDay(monthBills)
  const expenseChange = current.expense - previous.expense
  const percent = previous.expense ? Math.round((Math.abs(expenseChange) / previous.expense) * 100) : 0
  const direction = expenseChange <= 0 ? '下降' : '上升'
  const manualCount = monthBills.filter((bill) => bill.source === 'manual').length
  const aiCount = monthBills.filter((bill) => bill.source === 'chat').length
  const importCount = monthBills.filter((bill) => bill.source === 'import').length

  return {
    headline: previous.expense
      ? `${monthLabel}支出较上月${direction} ${percent}%`
      : `${monthLabel}正在累计新的记账样本`,
    insight: hottestTag
      ? `${monthLabel}支出 ${current.expense.toFixed(0)} 元，标签“${hottestTag}”热度最高。`
      : `${monthLabel}已记录收入 ${current.income.toFixed(0)} 元，支出 ${current.expense.toFixed(0)} 元。`,
    summary: current,
    overview: `${monthLabel}共记 ${monthBills.length} 笔，手动 ${manualCount} 笔，AI 识别 ${aiCount} 笔，导入 ${importCount} 笔。`,
    trend: describeTrend(monthBills),
    hottestTag,
    topCategories,
    topTags,
    highestExpenseDay: describeHighestExpenseDay(groups, monthLabel),
    monthLabel,
    recordCount: monthBills.length,
    sourceSummary: [
      { label: '手动', value: String(manualCount) },
      { label: 'AI', value: String(aiCount) },
      { label: '导入', value: String(importCount) },
    ],
  }
}

function buildMonthAnalytics(monthBills: Bill[], previousMonthBills: Bill[], monthLabel: string) {
  const summary = toCurrencySummary(monthBills)
  const previous = toCurrencySummary(previousMonthBills)
  const groups = groupBillsByDay(monthBills)
  const topCategories = summarizeCategories(monthBills).slice(0, 5)
  const topTags = summarizeTags(monthBills).slice(0, 5)
  const diff = summary.expense - previous.expense
  const comparison = previous.expense
    ? `${monthLabel}支出较上月${diff >= 0 ? '增加' : '减少'} ¥${Math.abs(diff).toFixed(0)}。`
    : `${monthLabel}暂无上月对比数据。`

  return {
    label: monthLabel,
    summary,
    comparison,
    overview: `${monthLabel}共有 ${groups.length} 个记账日，分类 ${topCategories.length} 个，标签 ${topTags.length} 个。`,
    topCategories,
    topTags,
    highestExpenseDay: describeHighestExpenseDay(groups, monthLabel),
    dailyExpenses: buildDailyExpenseStats(groups),
    highlights: [
      { label: '记账日', value: String(groups.length) },
      { label: '分类数', value: String(topCategories.length) },
      { label: '标签数', value: String(topTags.length) },
    ],
  }
}

function buildYearAnalytics(yearBills: Bill[], yearKey: string) {
  const summary = toCurrencySummary(yearBills)
  const monthBuckets = new Map<string, Bill[]>()

  for (const bill of yearBills) {
    const monthKey = bill.occurredAt.slice(0, 7)
    const current = monthBuckets.get(monthKey) ?? []
    current.push(bill)
    monthBuckets.set(monthKey, current)
  }

  const months = [...monthBuckets.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([monthKey, items]) => {
      const monthSummary = toCurrencySummary(items)
      return {
        month: monthFormatter.format(new Date(`${monthKey}-01T00:00:00`)),
        income: monthSummary.income,
        expense: monthSummary.expense,
        balance: monthSummary.balance,
      }
    })

  const busiestMonth = months.reduce<MonthlyTrendPoint | null>((current, item) => {
    if (!current || item.expense > current.expense) {
      return item
    }
    return current
  }, null)

  return {
    label: getYearLabel(yearKey),
    summary,
    months,
    topCategories: summarizeCategories(yearBills).slice(0, 5),
    topTags: summarizeTags(yearBills).slice(0, 5),
    busiestMonth: busiestMonth ? `${busiestMonth.month}支出最高，达到 ¥${busiestMonth.expense.toFixed(0)}。` : `${yearKey}年还没有明显的高消费月份。`,
    highlights: [
      { label: '活跃月份', value: String(months.length) },
      { label: '年度分类', value: String(summarizeCategories(yearBills).slice(0, 5).length) },
      { label: '年度标签', value: String(summarizeTags(yearBills).slice(0, 5).length) },
    ],
  }
}

function buildCalendarAnalytics(monthBills: Bill[], monthLabel: string, monthKey: string) {
  const groups = groupBillsByDay(monthBills)
  const groupMap = new Map(groups.map((group) => [group.date, group]))
  const maxExpense = Math.max(...groups.map((group) => group.expense), 0)
  const [year, month] = monthKey.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const days: CalendarDayStat[] = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1
    const date = `${monthKey}-${pad(day)}`
    const current = groupMap.get(date)
    const expense = current?.expense ?? 0
    const income = current?.income ?? 0
    const count = current?.items.length ?? 0
    const ratio = maxExpense ? expense / maxExpense : 0
    const intensity: CalendarDayStat['intensity'] = expense === 0 ? 'low' : ratio >= 0.7 ? 'high' : ratio >= 0.35 ? 'medium' : 'low'

    return {
      date,
      label: pad(day),
      weekday: weekdayFormatter.format(new Date(`${date}T00:00:00`)).replace('星期', '周'),
      expense,
      income,
      count,
      intensity,
    }
  })

  return {
    label: `${monthLabel}日历统计`,
    days,
    highestExpenseDay: describeHighestExpenseDay(groups, monthLabel),
  }
}

function formatMonths(months: number) {
  if (months <= 1) {
    return '约 1 个月'
  }

  return `约 ${months} 个月`
}

function buildGoalSummaries(
  storedGoals: StoredGoal[],
  monthBills: Bill[],
  averageBalance: number,
): { goals: GoalSummary[]; suggestion: GoalSuggestion } {
  const current = toCurrencySummary(monthBills)
  const monthlySaving = Math.max(averageBalance || current.balance, 1)

  const goals = storedGoals.map((goal) => {
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
  const monthlyGap = primaryGoal ? Math.max(Math.ceil((primaryGoal.target - primaryGoal.current) / 6), 0) : 0

  return {
    goals,
    suggestion: primaryGoal
      ? {
          title: '本月建议',
          hint: primaryGoal.current >= primaryGoal.target
            ? `“${primaryGoal.name}”已经达成，可以开始设下一个目标。`
            : `如果想把“${primaryGoal.name}”再提前一点完成，建议月均多攒 ¥${monthlyGap || 200}。`,
        }
      : {
          title: '开始你的第一个目标',
          hint: '先设一个具体金额的小目标，会更容易坚持记账和攒钱。',
        },
  }
}

export function useLedgerData() {
  const [bills, setBills] = useState<Bill[]>([])
  const [storedGoals, setStoredGoals] = useState<StoredGoal[]>([])

  const refresh = useCallback(async () => {
    await ensureSeedData()
    const [recent, goals] = await Promise.all([repository.listRecent(), repository.listGoals()])
    setBills(recent)
    setStoredGoals(goals)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const today = useMemo(() => new Date(), [])
  const currentMonthKey = useMemo(() => getMonthKey(today), [today])
  const previousMonthKey = useMemo(() => getPreviousMonthKey(currentMonthKey), [currentMonthKey])
  const currentYearKey = useMemo(() => getYearKey(today), [today])

  const monthBills = useMemo(() => bills.filter((bill) => bill.occurredAt.startsWith(currentMonthKey)), [bills, currentMonthKey])
  const previousMonthBills = useMemo(() => bills.filter((bill) => bill.occurredAt.startsWith(previousMonthKey)), [bills, previousMonthKey])
  const yearBills = useMemo(() => bills.filter((bill) => bill.occurredAt.startsWith(currentYearKey)), [bills, currentYearKey])

  const summary = useMemo(() => toCurrencySummary(monthBills), [monthBills])
  const previousSummary = useMemo(() => toCurrencySummary(previousMonthBills), [previousMonthBills])
  const groups = useMemo(() => groupBillsByDay(monthBills), [monthBills])
  const analytics = useMemo<AnalyticsPayload>(() => {
    const monthLabel = getMonthLabel(currentMonthKey)

    return {
      overview: buildOverviewAnalytics(monthBills, previousMonthBills, monthLabel),
      month: buildMonthAnalytics(monthBills, previousMonthBills, monthLabel),
      year: buildYearAnalytics(yearBills, currentYearKey),
      calendar: buildCalendarAnalytics(monthBills, monthLabel, currentMonthKey),
    }
  }, [currentMonthKey, currentYearKey, monthBills, previousMonthBills, yearBills])

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
  const goals = useMemo(() => buildGoalSummaries(storedGoals, monthBills, averageBalance), [averageBalance, monthBills, storedGoals])
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

  const addGoal = useCallback(async (input: GoalDraft) => {
    await repository.createGoal({
      id: `goal-${Date.now()}`,
      name: input.name,
      target: input.target,
      createdAt: new Date().toISOString(),
    })
    await refresh()
  }, [refresh])

  const updateGoal = useCallback(async (goalId: string, input: GoalDraft) => {
    await repository.updateGoal(goalId, input)
    await refresh()
  }, [refresh])

  const removeGoal = useCallback(async (goalId: string) => {
    await repository.removeGoal(goalId)
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
    addGoal,
    updateGoal,
    removeGoal,
    refresh,
  }
}
