import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useUIPreferences } from '../hooks/use-ui-preferences'
import { colors, radii, spacing } from '../theme/tokens'

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

const segments = ['总览', '月度', '年度', '日历']

export function AnalyticsScreen({ analytics }: { analytics: AnalyticsSummary }) {
  const { typography } = useUIPreferences()

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, typography.hero]}>统计</Text>
      <Text style={[styles.subtitle, typography.body]}>总览优先，再看趋势和结构</Text>
      <View style={styles.hero}>
        <Text style={[styles.heroTitle, typography.sectionTitle]}>{analytics.headline}</Text>
        <Text style={[styles.heroText, typography.body]}>{analytics.insight}</Text>
      </View>
      <View style={styles.metricRow}>
        <View style={styles.metricCard}>
          <Text style={[styles.metricLabel, typography.caption]}>收入</Text>
          <Text style={[styles.metricValue, typography.cardTitle]}>¥{analytics.income.toFixed(0)}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricLabel, typography.caption]}>支出</Text>
          <Text style={[styles.metricValue, typography.cardTitle]}>¥{analytics.expense.toFixed(0)}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricLabel, typography.caption]}>结余</Text>
          <Text style={[styles.metricValue, typography.cardTitle]}>¥{analytics.balance.toFixed(0)}</Text>
        </View>
      </View>
      <View style={styles.segmentWrap}>
        {segments.map((item, index) => (
          <View key={item} style={[styles.segment, index === 0 && styles.segmentActive]}>
            <Text style={[styles.segmentText, typography.captionStrong, index === 0 && styles.segmentTextActive]}>{item}</Text>
          </View>
        ))}
      </View>
      <View style={styles.card}>
        <Text style={[styles.cardTitle, typography.cardTitle]}>分类占比</Text>
        {analytics.topCategories.length ? (
          <View style={styles.categoryList}>
            {analytics.topCategories.map((item) => (
              <View key={item.name} style={styles.categoryRow}>
                <View style={styles.categoryMeta}>
                  <Text style={[styles.categoryName, typography.bodyStrong]}>{item.name}</Text>
                  <Text style={[styles.categoryHint, typography.footnote]}>¥{item.amount.toFixed(0)}</Text>
                </View>
                <Text style={[styles.categoryShare, typography.captionStrong]}>{item.share}%</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.cardBody, typography.body]}>本月还没有支出分类数据</Text>
        )}
      </View>
      <View style={styles.card}>
        <Text style={[styles.cardTitle, typography.cardTitle]}>记录概览</Text>
        <Text style={[styles.cardBody, typography.body]}>{analytics.overview}</Text>
        <Text style={[styles.cardBodySecondary, typography.body]}>{analytics.hottestTag ? `当前最热标签：#${analytics.hottestTag}` : '当前还没有形成明显标签偏好'}</Text>
      </View>
      <View style={styles.card}>
        <Text style={[styles.cardTitle, typography.cardTitle]}>近期趋势</Text>
        <Text style={[styles.cardBody, typography.body]}>{analytics.trend}</Text>
      </View>
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
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.card,
  },
  cardTitle: { color: colors.textPrimary },
  cardBody: { marginTop: 10, color: colors.textSecondary },
  cardBodySecondary: { marginTop: 8, color: colors.textSecondary },
  categoryList: {
    marginTop: 12,
    gap: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.gap,
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
  categoryShare: {
    color: colors.accent,
  },
})
