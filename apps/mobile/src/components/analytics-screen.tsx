import React, { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
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

type SegmentKey = 'overview' | 'month' | 'year' | 'calendar'

const segments: Array<{ key: SegmentKey; label: string }> = [
  { key: 'overview', label: '总览' },
  { key: 'month', label: '月度' },
  { key: 'year', label: '年度' },
  { key: 'calendar', label: '日历' },
]

const weekLabels = ['一', '二', '三', '四', '五', '六', '日']

function getCalendarLeadingSlots(date: string) {
  const day = new Date(`${date}T00:00:00`).getDay()
  return day === 0 ? 6 : day - 1
}

function formatMoney(value: number) {
  return `¥${value.toFixed(0)}`
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
}: {
  items: Array<{ label: string; value: string }>
  typography: ReturnType<typeof useUIPreferences>['typography']
}) {
  return (
    <View style={styles.highlightStrip}>
      {items.map((item) => (
        <View key={item.label} style={styles.highlightItem}>
          <Text style={[styles.highlightValue, typography.bodyStrong]}>{item.value}</Text>
          <Text style={[styles.highlightLabel, typography.footnote]}>{item.label}</Text>
        </View>
      ))}
    </View>
  )
}

export function AnalyticsScreen({
  analytics,
  onOpenLedger,
}: {
  analytics: AnalyticsPayload
  onOpenLedger: (date: string | null) => void
}) {
  const { typography } = useUIPreferences()
  const [activeSegment, setActiveSegment] = useState<SegmentKey>('overview')
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null)

  const hero = useMemo(() => {
    switch (activeSegment) {
      case 'month':
        return {
          title: `${analytics.month.label}统计`,
          description: analytics.month.comparison,
          summary: analytics.month.summary,
        }
      case 'year':
        return {
          title: `${analytics.year.label}收支总览`,
          description: analytics.year.busiestMonth,
          summary: analytics.year.summary,
        }
      case 'calendar':
        return {
          title: analytics.calendar.label,
          description: analytics.calendar.highestExpenseDay,
          summary: analytics.overview.summary,
        }
      case 'overview':
      default:
        return {
          title: analytics.overview.headline,
          description: analytics.overview.insight,
          summary: analytics.overview.summary,
        }
    }
  }, [activeSegment, analytics])

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, typography.hero]}>统计</Text>
      <Text style={[styles.subtitle, typography.body]}>总览优先，再看趋势和结构</Text>
      <View style={styles.hero}>
        <Text style={[styles.heroTitle, typography.sectionTitle]}>{hero.title}</Text>
        <Text style={[styles.heroText, typography.body]}>{hero.description}</Text>
      </View>
      <View style={styles.metricRow}>
        <View style={styles.metricCard}>
          <Text style={[styles.metricLabel, typography.caption]}>收入</Text>
          <Text style={[styles.metricValue, typography.cardTitle]}>{formatMoney(hero.summary.income)}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricLabel, typography.caption]}>支出</Text>
          <Text style={[styles.metricValue, typography.cardTitle]}>{formatMoney(hero.summary.expense)}</Text>
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
          <View style={styles.card}>
            <Text style={[styles.cardTitle, typography.cardTitle]}>记录概览</Text>
            <Text style={[styles.cardBody, typography.body]}>{analytics.overview.overview}</Text>
            <Text style={[styles.cardBodySecondary, typography.body]}>{analytics.overview.highestExpenseDay}</Text>
            <Text style={[styles.cardBodySecondary, typography.body]}>{analytics.overview.hottestTag ? `当前最热标签：#${analytics.overview.hottestTag}` : '当前还没有形成明显标签偏好'}</Text>
          </View>
          <View style={styles.card}>
            <Text style={[styles.cardTitle, typography.cardTitle]}>近期趋势</Text>
            <Text style={[styles.cardBody, typography.body]}>{analytics.overview.trend}</Text>
          </View>
        </>
      ) : null}

      {activeSegment === 'month' ? (
        <>
          {renderHighlightStrip({ items: analytics.month.highlights, typography })}
          <View style={styles.card}>
            <View style={styles.listHeader}>
              <Text style={[styles.cardTitle, typography.cardTitle]}>月度重点</Text>
              <Text style={[styles.listHeaderHint, typography.footnote]}>{analytics.month.label}</Text>
            </View>
            <View style={styles.monthHighlightRow}>
              <View style={styles.monthHighlightItem}>
                <Text style={[styles.monthHighlightLabel, typography.footnote]}>本月结余</Text>
                <Text style={[styles.monthHighlightValue, typography.cardTitle]}>{formatMoney(analytics.month.summary.balance)}</Text>
              </View>
              <View style={styles.monthHighlightDivider} />
              <View style={styles.monthHighlightItem}>
                <Text style={[styles.monthHighlightLabel, typography.footnote]}>支出最高日</Text>
                <Text style={[styles.monthHighlightValue, typography.bodyStrong]}>{analytics.month.highestExpenseDay.replace(/。$/, '')}</Text>
              </View>
            </View>
            <Text style={[styles.monthComparisonText, typography.body]}>{analytics.month.comparison}</Text>
          </View>
          <View style={styles.compactTwoColumn}>
            <View style={styles.compactColumn}>
              {renderTopList({
                title: '分类 Top',
                emptyText: `${analytics.month.label}还没有支出分类数据`,
                items: analytics.month.topCategories.slice(0, 3),
                typography,
              })}
            </View>
            <View style={styles.compactColumn}>
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
          {renderHighlightStrip({ items: analytics.year.highlights, typography })}
          <View style={styles.card}>
            <Text style={[styles.cardTitle, typography.cardTitle]}>年度趋势</Text>
            {analytics.year.months.length ? (
              <View style={styles.timelineList}>
                {analytics.year.months.map((item) => (
                  <View key={item.month} style={styles.yearRow}>
                    <Text style={[styles.timelineLabel, typography.bodyStrong]}>{item.month}</Text>
                    <View style={styles.yearMetrics}>
                      <Text style={[styles.yearMetricText, typography.footnote]}>收 {formatMoney(item.income)}</Text>
                      <Text style={[styles.yearMetricText, typography.footnote]}>支 {formatMoney(item.expense)}</Text>
                      <Text style={[styles.yearMetricText, typography.captionStrong]}>余 {formatMoney(item.balance)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.cardBody, typography.body]}>今年还没有足够的记账趋势数据</Text>
            )}
            <Text style={[styles.cardBodySecondary, typography.body]}>{analytics.year.busiestMonth}</Text>
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
        <View style={styles.card}>
          <View style={styles.listHeader}>
            <Text style={[styles.cardTitle, typography.cardTitle]}>月度日历</Text>
            <Text style={[styles.listHeaderHint, typography.footnote]}>{analytics.calendar.label}</Text>
          </View>
          <Text style={[styles.cardBody, typography.body]}>{analytics.calendar.highestExpenseDay}</Text>
          <Text style={[styles.cardBodySecondary, typography.body]}>{selectedCalendarDate ? `当前选中 ${selectedCalendarDate.slice(5).replace('-', '/')}，可直接跳转看当天流水。` : '先看整个月，再按日期选择要查看的具体一天。'}</Text>
          {analytics.calendar.days.length ? (
            <>
              <View style={styles.weekHeaderRow}>
                {weekLabels.map((label) => (
                  <View key={label} style={styles.weekHeaderCell}>
                    <Text style={[styles.weekHeaderText, typography.footnote]}>{label}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.calendarGrid}>
                {Array.from({ length: getCalendarLeadingSlots(analytics.calendar.days[0].date) }).map((_, index) => (
                  <View key={`empty-${index}`} style={styles.calendarBlankCell} />
                ))}
                {analytics.calendar.days.map((day) => {
                  const selected = day.date === selectedCalendarDate
                  return (
                    <Pressable
                      key={day.date}
                      style={[
                        styles.calendarCell,
                        day.intensity === 'high' && styles.calendarCellHigh,
                        day.intensity === 'medium' && styles.calendarCellMedium,
                        selected && styles.calendarCellSelected,
                      ]}
                      onPress={() => setSelectedCalendarDate((current) => (current === day.date ? null : day.date))}
                    >
                      <Text style={[styles.calendarDay, typography.captionStrong, selected && styles.calendarDaySelected]}>{day.label}</Text>
                      <Text style={[styles.calendarAmount, typography.footnote, selected && styles.calendarAmountSelected]}>{day.expense ? formatMoney(day.expense) : '—'}</Text>
                      <Text style={[styles.calendarMeta, typography.footnote, selected && styles.calendarMetaSelected]}>{day.weekday}</Text>
                    </Pressable>
                  )
                })}
              </View>
            </>
          ) : (
            <Text style={[styles.cardBody, typography.body]}>这个月还没有日历统计数据</Text>
          )}
          <Pressable style={styles.calendarAction} onPress={() => onOpenLedger(selectedCalendarDate)}>
            <Text style={[styles.calendarActionText, typography.captionStrong]}>{selectedCalendarDate ? '查看当天流水' : '查看当月流水'}</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: spacing.page, paddingTop: spacing.pageTop, paddingBottom: spacing.pageBottom, gap: spacing.gapLoose },
  title: { color: colors.textPrimary },
  subtitle: { color: colors.textSecondary },
  hero: {
    backgroundColor: '#111827',
    borderRadius: radii.xl,
    padding: spacing.card,
  },
  heroTitle: { color: '#FFFFFF' },
  heroText: { color: 'rgba(255,255,255,0.76)', marginTop: 8 },
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
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.72)',
    padding: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  segment: { flex: 1, paddingVertical: 10, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', minHeight: 42 },
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
  cardlessSection: {
    gap: 12,
  },
  ledgerWrap: {
    marginTop: 4,
  },
  calendarHint: {
    color: colors.textSecondary,
  },
  cardTitle: { color: colors.textPrimary },
  cardBody: { marginTop: 10, color: colors.textSecondary },
  cardBodySecondary: { marginTop: 8, color: colors.textSecondary },
  calendarAction: {
    marginTop: 14,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.textPrimary,
  },
  calendarActionText: {
    color: '#FFFFFF',
  },
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
  timelineList: {
    marginTop: 12,
    gap: 10,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.gap,
  },
  monthHighlightRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.gap,
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
  monthComparisonText: {
    marginTop: 14,
    color: colors.textSecondary,
  },
  compactTwoColumn: {
    flexDirection: 'row',
    gap: spacing.gap,
  },
  compactColumn: {
    flex: 1,
  },
  timelineLabel: {
    color: colors.textPrimary,
  },
  timelineValue: {
    color: colors.accent,
  },
  yearRow: {
    gap: 6,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  yearMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  yearMetricText: {
    color: colors.textSecondary,
  },
  weekHeaderRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 8,
  },
  weekHeaderCell: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  weekHeaderText: {
    color: colors.textSecondary,
  },
  calendarGrid: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  calendarBlankCell: {
    width: '12.57%',
    aspectRatio: 0.88,
  },
  calendarCell: {
    width: '12.57%',
    aspectRatio: 0.88,
    minWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: radii.lg,
    backgroundColor: colors.accentSoft,
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarCellMedium: {
    backgroundColor: 'rgba(99,102,241,0.18)',
  },
  calendarCellHigh: {
    backgroundColor: 'rgba(99,102,241,0.26)',
  },
  calendarCellSelected: {
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: '#FFFFFF',
  },
  calendarDay: {
    color: colors.textPrimary,
  },
  calendarDaySelected: {
    color: colors.accent,
  },
  calendarAmount: {
    color: colors.textPrimary,
  },
  calendarAmountSelected: {
    color: colors.accent,
  },
  calendarMeta: {
    color: colors.textSecondary,
  },
  calendarMetaSelected: {
    color: colors.textPrimary,
  },
})
