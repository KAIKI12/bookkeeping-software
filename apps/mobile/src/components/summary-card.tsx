import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useUIPreferences } from '../hooks/use-ui-preferences'
import { colors, radii, shadows, spacing } from '../theme/tokens'

export function SummaryCard({ summary }: {
  summary: { income: number; expense: number; balance: number }
}) {
  const { typography } = useUIPreferences()

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Metric label="本月收入" value={`¥${summary.income.toLocaleString()}`} tone="income" />
        <Metric label="本月支出" value={`¥${summary.expense.toLocaleString()}`} tone="expense" />
        <Metric label="本月结余" value={`¥${summary.balance.toLocaleString()}`} tone="accent" />
      </View>
    </View>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone: 'income' | 'expense' | 'accent' }) {
  const { typography } = useUIPreferences()

  return (
    <View style={styles.metric}>
      <Text style={[styles.label, typography.caption]}>{label}</Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={[
          styles.value,
          typography.amountMedium,
          tone === 'income' && styles.income,
          tone === 'accent' && styles.accent,
        ]}
      >
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.card,
    ...shadows.card,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.gap,
  },
  metric: {
    flex: 1,
    gap: spacing.gapTight,
  },
  label: {
    color: colors.textSecondary,
  },
  value: {
    color: colors.textPrimary,
  },
  income: {
    color: colors.income,
  },
  accent: {
    color: colors.accent,
  },
})
