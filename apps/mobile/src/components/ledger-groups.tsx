import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useUIPreferences } from '../hooks/use-ui-preferences'
import { colors, radii, shadows, spacing } from '../theme/tokens'

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
  }>
}

function formatDateLabel(date: string) {
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  if (date === today) {
    return '今天'
  }

  if (date === yesterday) {
    return '昨天'
  }

  return date.slice(5).replace('-', '/')
}

export function LedgerGroups({ groups }: { groups: LedgerGroup[] }) {
  const { typography } = useUIPreferences()

  return (
    <View style={styles.container}>
      {groups.map((group) => (
        <View key={group.key} style={styles.groupCard}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={[styles.date, typography.sectionTitle]}>{formatDateLabel(group.date)}</Text>
              <Text style={[styles.weekday, typography.caption]}>{group.weekday}</Text>
            </View>
            <View style={styles.summaryWrap}>
              <Text style={[styles.summaryText, typography.captionStrong]}>收 {group.income ? `¥${group.income}` : '—'}</Text>
              <Text style={[styles.summaryText, typography.captionStrong]}>支 ¥{group.expense}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          {group.items.map((item, index) => (
            <View key={item.id} style={[styles.item, index !== group.items.length - 1 && styles.itemBorder]}>
              <View style={styles.itemLeft}>
                <Text style={[styles.category, typography.cardTitle]} numberOfLines={1}>{item.category}</Text>
                <Text style={[styles.note, typography.caption]} numberOfLines={2}>{item.note}</Text>
              </View>
              <View style={styles.itemRight}>
                <Text style={[styles.amount, typography.cardTitle, item.amount > 0 && styles.amountIncome]}>
                  {item.amount > 0 ? '+' : '-'}¥{Math.abs(item.amount)}
                </Text>
                <Text style={[styles.time, typography.footnote]}>{item.time}</Text>
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.gapLoose,
    paddingBottom: spacing.pageBottom,
  },
  groupCard: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: radii.xl,
    padding: spacing.cardCompact,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.gap,
  },
  headerLeft: {
    flex: 1,
    gap: 4,
  },
  date: {
    color: colors.textPrimary,
  },
  weekday: {
    color: colors.textSecondary,
  },
  summaryWrap: {
    alignItems: 'flex-end',
    gap: 6,
    minWidth: 84,
  },
  summaryText: {
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 14,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.gap,
    paddingVertical: 12,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  itemLeft: {
    flex: 1,
    gap: 4,
    paddingRight: 8,
  },
  category: {
    color: colors.textPrimary,
  },
  note: {
    color: colors.textSecondary,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 4,
    minWidth: 88,
  },
  amount: {
    color: colors.textPrimary,
  },
  amountIncome: {
    color: colors.income,
  },
  time: {
    color: colors.textSecondary,
  },
})
