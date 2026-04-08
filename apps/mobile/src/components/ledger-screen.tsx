import React from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { useUIPreferences } from '../hooks/use-ui-preferences'
import { LedgerGroups } from './ledger-groups'
import { SummaryCard } from './summary-card'
import { colors, spacing } from '../theme/tokens'

type LedgerGroup = {
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

export function LedgerScreen({
  summary,
  groups,
}: {
  summary: { income: number; expense: number; balance: number }
  groups: LedgerGroup[]
}) {
  const { typography } = useUIPreferences()

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, typography.hero]}>记账</Text>
      <Text style={[styles.subtitle, typography.body]}>今天也把钱流向看清楚</Text>
      <SummaryCard summary={summary} />
      <LedgerGroups groups={groups} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.page,
    paddingTop: spacing.pageTop,
    gap: spacing.section,
  },
  title: {
    color: colors.textPrimary,
  },
  subtitle: {
    color: colors.textSecondary,
  },
})
