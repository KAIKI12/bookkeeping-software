import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useUIPreferences } from '../hooks/use-ui-preferences'
import { colors, radii, spacing } from '../theme/tokens'

type AnalyticsSummary = {
  headline: string
  insight: string
  topCategories: string
  trend: string
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
      <View style={styles.segmentWrap}>
        {segments.map((item, index) => (
          <View key={item} style={[styles.segment, index === 0 && styles.segmentActive]}>
            <Text style={[styles.segmentText, typography.captionStrong, index === 0 && styles.segmentTextActive]}>{item}</Text>
          </View>
        ))}
      </View>
      <View style={styles.card}>
        <Text style={[styles.cardTitle, typography.cardTitle]}>分类占比</Text>
        <Text style={[styles.cardBody, typography.body]}>{analytics.topCategories}</Text>
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
})
