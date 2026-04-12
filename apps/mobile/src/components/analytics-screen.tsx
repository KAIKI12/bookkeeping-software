import React, { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { useUIPreferences } from '../hooks/use-ui-preferences'
import { colors, radii, spacing } from '../theme/tokens'

type AnalyticsPayload = {
  overview: {
    headline: string
    insight: string
    summary: { income: number; expense: number; balance: number }
    overview: string
    trend: string
    hottestTag: string | null
    topCategories: Array<{ name: string; amount: number; share: number }>
    topTags: Array<{ name: string; amount: number; share: number }>
    highestExpenseDay: string
    monthLabel: string
    recordCount: number
    sourceSummary: Array<{ label: string; value: string }>
  }
  month: {
    label: string
    summary: { income: number; expense: number; balance: number }
    comparison: string
    overview: string
    topCategories: Array<{ name: string; amount: number; share: number }>
    topTags: Array<{ name: string; amount: number; share: number }>
    highestExpenseDay: string
    dailyExpenses: Array<{ date: string; label: string; expense: number }>
    highlights: Array<{ label: string; value: string }>
  }
  year: {
    label: string
    summary: { income: number; expense: number; balance: number }
    months: Array<{ month: string; income: number; expense: number; balance: number }>
    topCategories: Array<{ name: string; amount: number; share: number }>
    topTags: Array<{ name: string; amount: number; share: number }>
    busiestMonth: string
    highlights: Array<{ label: string; value: string }>
  }
  calendar: {
    label: string
    days: Array<{
      date: string
      label: string
      weekday: string
      expense: number
      income: number
      count: number
      intensity: 'low' | 'medium' | 'high'
    }>
    highestExpenseDay: string
  }
}

type DayGroup = {
  key: string
  date: string
  weekday: string
  income: number
  expense: number
  items: Array<{
    id: string
    category: string
    note: string
    amount: number
    time: string
    tags: string[]
    source: 'manual' | 'voice' | 'chat' | 'import'
  }>
}

type SegmentKey = 'overview' | 'month' | 'year' | 'calendar'

const segments: Array<{ key: SegmentKey; label: string }> = [
  { key: 'overview', label: '总览' },
  { key: 'month', label: '月度' },
  { key: 'year', label: '年度' },
  { key: 'calendar', label: '日历' },
]

const weekLabels = ['日', '一', '二', '三', '四', '五', '六']
const calendarColumnWidth = '14.2857%'

function getCalendarLeadingSlots(date: string) {
  return new Date(`${date}T00:00:00`).getDay()
}

function formatMoney(value: number) {
  return `¥${value.toFixed(0)}`
}

function formatPreciseMoney(value: number) {
  return `¥${value.toFixed(2)}`
}

function formatCalendarSummaryDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return `${month}月${day}日`
}

function getMonthKeyFromDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function shiftMonth(monthKey: string, delta: number) {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  return getMonthKeyFromDate(date)
}

function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number)
  return `${year}年${month}月`
}

function renderTopList({
  title,
  emptyText,
  items,
  typography,
}: {
  title: string
  emptyText: string
  items: Array<{ name: string; amount: number; share: number }>
  typography: ReturnType<typeof useUIPreferences>['typography']
}) {
  return (
    <View style={styles.card}>
      <View style={styles.listHeader}>
        <Text style={[styles.cardTitle, typography.cardTitle]}>{title}</Text>
        <Text style={[styles.listHeaderHint, typography.footnote]}>{items.length ? `共 ${items.length} 项` : '暂无数据'}</Text>
      </View>
      {items.length ? (
        <View style={styles.categoryList}>
          {items.map((item, index) => (
            <View key={item.name} style={[styles.categoryRow, index !== items.length - 1 && styles.categoryRowDivider]}>
              <View style={styles.categoryMeta}>
                <Text style={[styles.categoryName, typography.bodyStrong]}>{item.name}</Text>
                <Text style={[styles.categoryHint, typography.footnote]}>{formatMoney(item.amount)}</Text>
              </View>
              <View style={styles.sharePill}>
                <Text style={[styles.categoryShare, typography.captionStrong]}>{item.share}%</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[styles.cardBody, typography.body]}>{emptyText}</Text>
      )}
    </View>
  )
}

function renderHighlightStrip({
  items,
  typography,
  compact,
}: {
  items: Array<{ label: string; value: string }>
  typography: ReturnType<typeof useUIPreferences>['typography']
  compact: boolean
}) {
  return (
    <View style={[styles.highlightStrip, compact && styles.highlightStripCompact]}>
      {items.map((item) => (
        <View key={item.label} style={[styles.highlightItem, compact && styles.highlightItemCompact]}>
          <Text style={[styles.highlightValue, typography.bodyStrong]}>{item.value}</Text>
          <Text style={[styles.highlightLabel, typography.footnote]}>{item.label}</Text>
        </View>
      ))}
    </View>
  )
}

export function AnalyticsScreen({
  analytics,
  dayGroups,
  viewMonth,
  onViewMonthChange,
}: {
  analytics: AnalyticsPayload
  dayGroups: DayGroup[]
  viewMonth: string
  onViewMonthChange: (monthKey: string) => void
}) {
  const { typography } = useUIPreferences()
  const { width } = useWindowDimensions()
  const isCompactWidth = width < 390
  const [activeSegment, setActiveSegment] = useState<SegmentKey>('overview')
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null)

  const isCurrentMonth = viewMonth === getMonthKeyFromDate(new Date())

  function goToPreviousMonth() {
    onViewMonthChange(shiftMonth(viewMonth, -1))
    setSelectedCalendarDate(null)
  }

  function goToNextMonth() {
    if (isCurrentMonth) return
    onViewMonthChange(shiftMonth(viewMonth, 1))
    setSelectedCalendarDate(null)
  }

  const hero = useMemo(() => {
    switch (activeSegment) {
      case 'month':
        return {
          title: analytics.month.label,
          description: analytics.month.highestExpenseDay.replace(/。$/, ''),
          summary: analytics.month.summary,
        }
      case 'year':
        return {
          title: analytics.year.label,
          description: '按月份看清收入、支出和结余变化',
          summary: analytics.year.summary,
        }
      case 'calendar':
        return {
          title: analytics.month.label,
          description: '日历即账本，选一天就看当天流水',
          summary: analytics.month.summary,
        }
      case 'overview':
      default:
        return {
          title: analytics.overview.monthLabel,
          description: analytics.overview.insight,
          summary: analytics.overview.summary,
        }
    }
  }, [activeSegment, analytics])

  const selectedDayGroup = useMemo(
    () => dayGroups.find((group) => group.date === selectedCalendarDate) ?? null,
    [dayGroups, selectedCalendarDate],
  )

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, typography.hero]}>统计</Text>
      <Text style={[styles.subtitle, typography.body]}>总览优先，再看趋势和结构</Text>

      <View style={styles.monthNav}>
        <Pressable style={[styles.monthNavButton]} onPress={goToPreviousMonth}>
          <Text style={[styles.monthNavArrow, typography.cardTitle]}>&lsaquo;</Text>
        </Pressable>
        <Text style={[styles.monthNavLabel, typography.sectionTitle]}>{getMonthLabel(viewMonth)}</Text>
        <Pressable style={[styles.monthNavButton, isCurrentMonth && styles.monthNavButtonDisabled]} onPress={goToNextMonth} disabled={isCurrentMonth}>
          <Text style={[styles.monthNavArrow, typography.cardTitle, isCurrentMonth && styles.monthNavArrowDisabled]}>&rsaquo;</Text>
        </Pressable>
      </View>

      <View style={styles.heroCompact}>
        <Text style={[styles.heroCompactLabel, typography.caption]}>{hero.title}</Text>
        <Text style={[styles.heroCompactText, typography.body]}>{hero.description}</Text>
      </View>

      <View style={styles.metricRow}>
        <View style={styles.metricCard}>
          <Text style={[styles.metricLabel, typography.caption]}>收入</Text>
          <Text style={[styles.metricValue, typography.cardTitle, styles.metricIncome]}>{formatMoney(hero.summary.income)}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricLabel, typography.caption]}>支出</Text>
          <Text style={[styles.metricValue, typography.cardTitle, styles.metricExpense]}>{formatMoney(hero.summary.expense)}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricLabel, typography.caption]}>结余</Text>
          <Text style={[styles.metricValue, typography.cardTitle]}>{formatMoney(hero.summary.balance)}</Text>
        </View>
      </View>

      <View style={styles.segmentWrap}>
        {segments.map((item) => {
          const active = item.key === activeSegment
          return (
            <Pressable key={item.key} style={[styles.segment, active && styles.segmentActive]} onPress={() => setActiveSegment(item.key)}>
              <Text style={[styles.segmentText, typography.captionStrong, active && styles.segmentTextActive]}>{item.label}</Text>
            </Pressable>
          )
        })}
      </View>

      {activeSegment === 'overview' ? (
        <>
          {renderHighlightStrip({
            items: [
              { label: '本月记录', value: String(analytics.overview.recordCount) },
              ...analytics.overview.sourceSummary,
            ],
            typography,
            compact: isCompactWidth,
          })}
          {renderTopList({
            title: '分类占比',
            emptyText: `${analytics.overview.monthLabel}还没有支出分类数据`,
            items: analytics.overview.topCategories,
            typography,
          })}
          {renderTopList({
            title: '标签热度',
            emptyText: '当前还没有形成明显标签偏好',
            items: analytics.overview.topTags,
            typography,
          })}
        </>
      ) : null}

      {activeSegment === 'month' ? (
        <>
          {renderHighlightStrip({ items: analytics.month.highlights, typography, compact: isCompactWidth })}
          <View style={styles.card}>
            <View style={styles.listHeader}>
              <Text style={[styles.cardTitle, typography.cardTitle]}>月度重点</Text>
              <Text style={[styles.listHeaderHint, typography.footnote]}>{analytics.month.label}</Text>
            </View>
            <View style={[styles.monthHighlightRow, isCompactWidth && styles.monthHighlightRowCompact]}>
              <View style={styles.monthHighlightItem}>
                <Text style={[styles.monthHighlightLabel, typography.footnote]}>本月结余</Text>
                <Text style={[styles.monthHighlightValue, typography.cardTitle]}>{formatMoney(analytics.month.summary.balance)}</Text>
              </View>
              <View style={[styles.monthHighlightDivider, isCompactWidth && styles.monthHighlightDividerCompact]} />
              <View style={styles.monthHighlightItem}>
                <Text style={[styles.monthHighlightLabel, typography.footnote]}>支出最高日</Text>
                <Text style={[styles.monthHighlightValue, typography.bodyStrong]}>{analytics.month.highestExpenseDay.replace(/。$/, '')}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.compactTwoColumn, isCompactWidth && styles.compactTwoColumnCompact]}>
            <View style={[styles.compactColumn, isCompactWidth && styles.compactColumnCompact]}>
              {renderTopList({
                title: '分类 Top',
                emptyText: `${analytics.month.label}还没有支出分类数据`,
                items: analytics.month.topCategories.slice(0, 3),
                typography,
              })}
            </View>
            <View style={[styles.compactColumn, isCompactWidth && styles.compactColumnCompact]}>
              {renderTopList({
                title: '标签 Top',
                emptyText: `${analytics.month.label}还没有标签数据`,
                items: analytics.month.topTags.slice(0, 3),
                typography,
              })}
            </View>
          </View>
        </>
      ) : null}

      {activeSegment === 'year' ? (
        <>
          {renderHighlightStrip({ items: analytics.year.highlights, typography, compact: isCompactWidth })}
          <View style={styles.card}>
            <Text style={[styles.cardTitle, typography.cardTitle]}>年度趋势</Text>
            {analytics.year.months.length ? (
              <View style={styles.timelineList}>
                {analytics.year.months.map((item, index) => (
                  <View key={item.month} style={[styles.yearRowCompact, index !== analytics.year.months.length - 1 && styles.categoryRowDivider]}>
                    <Text style={[styles.timelineLabel, typography.bodyStrong]}>{item.month}</Text>
                    <View style={styles.yearMetricsCompact}>
                      <Text style={[styles.yearMetricText, typography.footnote]}>收 {formatMoney(item.income)}</Text>
                      <Text style={[styles.yearMetricText, typography.footnote]}>支 {formatMoney(item.expense)}</Text>
                      <Text style={[styles.yearMetricBalance, typography.captionStrong]}>余 {formatMoney(item.balance)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.cardBody, typography.body]}>今年还没有足够的记账趋势数据</Text>
            )}
          </View>
          {renderTopList({
            title: '年度分类 Top',
            emptyText: `${analytics.year.label}还没有年度分类数据`,
            items: analytics.year.topCategories,
            typography,
          })}
          {renderTopList({
            title: '年度标签 Top',
            emptyText: `${analytics.year.label}还没有年度标签数据`,
            items: analytics.year.topTags,
            typography,
          })}
        </>
      ) : null}

      {activeSegment === 'calendar' ? (
        <>
          <View style={styles.calendarSummaryRow}>
            <Text style={[styles.calendarMonthTitle, typography.sectionTitle]}>{analytics.month.label}</Text>
            <Text style={[styles.calendarMonthSummary, typography.caption]}>{`收 ${formatMoney(analytics.month.summary.income)}  支 ${formatMoney(analytics.month.summary.expense)}`}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.weekHeaderRow}>
              {weekLabels.map((label) => (
                <View key={label} style={styles.weekHeaderCell}>
                  <Text style={[styles.weekHeaderText, typography.footnote]}>{label}</Text>
                </View>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {analytics.calendar.days.length
                ? Array.from({ length: getCalendarLeadingSlots(analytics.calendar.days[0].date) }).map((_, index) => (
                    <View key={`empty-${index}`} style={styles.calendarBlankCell} />
                  ))
                : null}
              {analytics.calendar.days.map((day) => {
                const selected = day.date === selectedCalendarDate
                const isToday = day.date === new Date().toISOString().slice(0, 10)
                const expenseText = day.expense > 0 ? `-${Math.round(day.expense)}` : ' '
                const incomeText = day.income > 0 ? `+${Math.round(day.income)}` : ' '
                return (
                  <Pressable
                    key={day.date}
                    style={[
                      styles.calendarCell,
                      selected && styles.calendarCellSelected,
                      day.intensity === 'high' && !selected && styles.calendarCellHigh,
                      day.intensity === 'medium' && !selected && styles.calendarCellMedium,
                    ]}
                    onPress={() => setSelectedCalendarDate((current) => (current === day.date ? null : day.date))}
                  >
                    <Text style={[styles.calendarDay, typography.captionStrong, selected && styles.calendarDaySelected, isToday && !selected && styles.calendarDayToday]}>{day.label}</Text>
                    <View style={styles.calendarAmounts}>
                      <Text style={[styles.calendarAmountExpense, typography.footnote]}>{expenseText}</Text>
                      <Text style={[styles.calendarAmountIncome, typography.footnote]}>{incomeText}</Text>
                    </View>
                  </Pressable>
                )
              })}
            </View>
          </View>

          {selectedDayGroup ? (
            <View style={styles.card}>
              <View style={styles.listHeader}>
                <Text style={[styles.cardTitle, typography.cardTitle]}>{formatCalendarSummaryDate(selectedDayGroup.date)}</Text>
                <Text style={[styles.listHeaderHint, typography.footnote]}>{`收 ${formatPreciseMoney(selectedDayGroup.income)}  支 ${formatPreciseMoney(selectedDayGroup.expense)}`}</Text>
              </View>
              <View style={styles.dayLedgerList}>
                {selectedDayGroup.items.map((item, index) => (
                  <View key={item.id} style={[styles.dayLedgerItem, index !== selectedDayGroup.items.length - 1 && styles.categoryRowDivider]}>
                    <View style={styles.dayLedgerCopy}>
                      <Text style={[styles.dayLedgerCategory, typography.bodyStrong]}>{item.category}</Text>
                      {item.note ? <Text style={[styles.dayLedgerNote, typography.caption]}>{item.note}</Text> : null}
                    </View>
                    <View style={styles.dayLedgerAmountWrap}>
                      <Text style={[styles.dayLedgerAmount, typography.cardTitle, item.amount > 0 ? styles.metricIncome : styles.metricExpense]}>
                        {item.amount > 0 ? '+' : '-'}{formatPreciseMoney(Math.abs(item.amount))}
                      </Text>
                      <Text style={[styles.dayLedgerTime, typography.footnote]}>{item.time}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: spacing.page, paddingTop: spacing.pageTop, paddingBottom: spacing.pageBottom, gap: spacing.gapLoose },
  title: { color: colors.textPrimary },
  subtitle: { color: colors.textSecondary },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.gap,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.68)',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  monthNavButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  monthNavButtonDisabled: {
    opacity: 0.3,
  },
  monthNavArrow: {
    color: colors.textPrimary,
    fontSize: 22,
  },
  monthNavArrowDisabled: {
    color: colors.textSecondary,
  },
  monthNavLabel: {
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  heroCompact: {
    gap: 6,
  },
  heroCompactLabel: { color: colors.textSecondary },
  heroCompactText: { color: colors.textPrimary },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.gap,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.cardCompact,
  },
  metricLabel: { color: colors.textSecondary },
  metricValue: { marginTop: 6, color: colors.textPrimary },
  metricIncome: { color: colors.income },
  metricExpense: { color: '#EF4444' },
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.72)',
    padding: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  segment: { flex: 1, paddingVertical: 10, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', minHeight: 40 },
  segmentActive: { backgroundColor: '#FFFFFF' },
  segmentText: { color: colors.textSecondary },
  segmentTextActive: { color: colors.textPrimary },
  card: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.card,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.gap,
  },
  listHeaderHint: {
    color: colors.textSecondary,
  },
  cardTitle: { color: colors.textPrimary },
  cardBody: { marginTop: 10, color: colors.textSecondary },
  categoryList: {
    marginTop: 12,
    gap: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.gap,
    paddingVertical: 10,
  },
  categoryRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  categoryMeta: {
    flex: 1,
  },
  categoryName: {
    color: colors.textPrimary,
  },
  categoryHint: {
    marginTop: 4,
    color: colors.textSecondary,
  },
  sharePill: {
    minWidth: 52,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
  },
  highlightStrip: {
    flexDirection: 'row',
    gap: spacing.gap,
  },
  highlightStripCompact: {
    flexWrap: 'wrap',
  },
  highlightItem: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  highlightItemCompact: {
    width: '48%',
    minWidth: '47%',
    flexGrow: 0,
  },
  highlightValue: {
    color: colors.textPrimary,
  },
  highlightLabel: {
    marginTop: 4,
    color: colors.textSecondary,
  },
  categoryShare: {
    color: colors.accent,
  },
  monthHighlightRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.gap,
  },
  monthHighlightRowCompact: {
    flexDirection: 'column',
  },
  monthHighlightItem: {
    flex: 1,
    gap: 6,
  },
  monthHighlightLabel: {
    color: colors.textSecondary,
  },
  monthHighlightValue: {
    color: colors.textPrimary,
  },
  monthHighlightDivider: {
    width: 1,
    backgroundColor: colors.divider,
  },
  monthHighlightDividerCompact: {
    width: '100%',
    height: 1,
  },
  compactTwoColumn: {
    flexDirection: 'row',
    gap: spacing.gap,
  },
  compactTwoColumnCompact: {
    flexDirection: 'column',
  },
  compactColumn: {
    flex: 1,
  },
  compactColumnCompact: {
    width: '100%',
  },
  timelineList: {
    marginTop: 12,
    gap: 0,
  },
  yearRowCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.gap,
    paddingVertical: 10,
  },
  timelineLabel: {
    color: colors.textPrimary,
  },
  yearMetricsCompact: {
    alignItems: 'flex-end',
    gap: 3,
  },
  yearMetricText: {
    color: colors.textSecondary,
  },
  yearMetricBalance: {
    color: colors.textPrimary,
  },
  calendarSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.gap,
  },
  calendarMonthTitle: {
    color: colors.textPrimary,
  },
  calendarMonthSummary: {
    color: colors.textSecondary,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekHeaderCell: {
    width: calendarColumnWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  weekHeaderText: {
    color: colors.textSecondary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarBlankCell: {
    width: calendarColumnWidth,
    aspectRatio: 0.9,
  },
  calendarCell: {
    width: calendarColumnWidth,
    aspectRatio: 0.9,
    minWidth: 0,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: radii.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  calendarCellSelected: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(238,242,255,0.42)',
  },
  calendarCellHigh: {
    backgroundColor: 'rgba(254,226,226,0.45)',
    borderColor: 'rgba(239,68,68,0.18)',
  },
  calendarCellMedium: {
    backgroundColor: 'rgba(254,243,199,0.35)',
    borderColor: 'rgba(245,158,11,0.14)',
  },
  calendarCellToday: {
    borderColor: colors.accent,
    borderWidth: 1.5,
  },
  calendarDay: {
    color: colors.textPrimary,
  },
  calendarDaySelected: {
    color: colors.accent,
  },
  calendarDayToday: {
    color: colors.accent,
    fontWeight: '700',
  },
  calendarAmounts: {
    marginTop: 2,
    alignSelf: 'stretch',
  },
  calendarAmountExpense: {
    color: '#EF4444',
    lineHeight: 14,
  },
  calendarAmountIncome: {
    color: colors.income,
    lineHeight: 14,
  },
  dayLedgerList: {
    marginTop: 12,
  },
  dayLedgerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.gap,
    paddingVertical: 12,
  },
  dayLedgerCopy: {
    flex: 1,
    gap: 4,
  },
  dayLedgerCategory: {
    color: colors.textPrimary,
  },
  dayLedgerNote: {
    color: colors.textSecondary,
  },
  dayLedgerAmountWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  dayLedgerAmount: {
    color: colors.textPrimary,
  },
  dayLedgerTime: {
    color: colors.textSecondary,
  },
})
