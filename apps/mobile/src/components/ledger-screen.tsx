import React, { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { BillEditSheet, type EditableBillItem } from './bill-edit-sheet'
import { LedgerGroups } from './ledger-groups'
import { SummaryCard } from './summary-card'
import { colors, radii, spacing } from '../theme/tokens'
import { useUIPreferences } from '../hooks/use-ui-preferences'

type LedgerGroupItem = {
  id: string
  category: string
  note: string
  amount: number
  time: string
  tags: string[]
  source: 'manual' | 'voice' | 'chat' | 'import'
}

type LedgerGroup = {
  key: string
  date: string
  weekday: string
  income: number
  expense: number
  items: LedgerGroupItem[]
}

export function LedgerScreen({
  summary,
  groups,
  monthLabel,
  dayLabel,
  categories,
  updateBill,
  removeBill,
}: {
  summary: { income: number; expense: number; balance: number }
  groups: LedgerGroup[]
  monthLabel?: string | null
  dayLabel?: string | null
  categories: string[]
  updateBill: (billId: string, updates: { type: 'income' | 'expense'; amount: number; category: string; note: string; tags: string[] }) => Promise<void>
  removeBill: (billId: string) => Promise<void>
}) {
  const { typography } = useUIPreferences()
  const subtitle = dayLabel ? `${dayLabel}流水` : monthLabel ? `${monthLabel}流水` : '今天也把钱流向看清楚'
  const [editingBill, setEditingBill] = useState<EditableBillItem | null>(null)

  function handleItemPress(item: LedgerGroupItem) {
    setEditingBill({
      id: item.id,
      category: item.category,
      note: item.note,
      amount: Math.abs(item.amount),
      time: item.time,
      tags: item.tags,
      type: item.amount > 0 ? 'income' : 'expense',
      source: item.source,
    })
  }

  function handleItemDelete(item: LedgerGroupItem) {
    Alert.alert('删除账单', '确定删除这笔记录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => void removeBill(item.id),
      },
    ])
  }

  async function handleSave(billId: string, updates: { type: 'income' | 'expense'; amount: number; category: string; note: string; tags: string[] }) {
    await updateBill(billId, updates)
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, typography.hero]}>记账</Text>
        <Text style={[styles.subtitle, typography.body]}>{subtitle}</Text>
        <SummaryCard summary={summary} />
        {groups.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={[styles.emptyTitle, typography.sectionTitle]}>暂无账单</Text>
            <Text style={[styles.emptyHint, typography.body]}>点击下方按钮记一笔，或去"我的"导入历史账单。</Text>
          </View>
        ) : (
          <LedgerGroups
            groups={groups}
            onItemPress={handleItemPress}
            onItemDelete={handleItemDelete}
          />
        )}
      </ScrollView>

      <BillEditSheet
        visible={editingBill !== null}
        bill={editingBill}
        categories={categories}
        onClose={() => setEditingBill(null)}
        onSave={handleSave}
        onRemove={removeBill}
      />
    </>
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
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.74)',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.card,
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    color: colors.textPrimary,
  },
  emptyHint: {
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
})