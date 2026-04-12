import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native'
import { useUIPreferences } from '../hooks/use-ui-preferences'
import { colors, radii, spacing } from '../theme/tokens'

export type EditableBillItem = {
  id: string
  category: string
  note: string
  amount: number
  time: string
  tags: string[]
  type: 'income' | 'expense'
  source: 'manual' | 'voice' | 'chat' | 'import'
}

export function BillEditSheet({
  visible,
  bill,
  categories,
  onClose,
  onSave,
  onRemove,
}: {
  visible: boolean
  bill: EditableBillItem | null
  categories: string[]
  onClose: () => void
  onSave: (billId: string, updates: { type: 'income' | 'expense'; amount: number; category: string; note: string; tags: string[] }) => Promise<void>
  onRemove: (billId: string) => Promise<void>
}) {
  const { typography } = useUIPreferences()
  const { height } = useWindowDimensions()
  const isCompactHeight = height < 780
  const [entryType, setEntryType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [note, setNote] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const compactGap = isCompactHeight ? 10 : spacing.gap
  const actionDockHeight = isCompactHeight ? 96 : 108
  const contentContainerStyle = useMemo(
    () => [styles.contentContainer, { gap: compactGap, paddingBottom: compactGap }],
    [compactGap],
  )

  useEffect(() => {
    if (bill) {
      setEntryType(bill.type)
      setAmount(String(bill.amount))
      setSelectedCategory(bill.category)
      setNote(bill.note)
      setSelectedTags(bill.tags)
    }
  }, [bill])

  function toggleTag(tag: string) {
    setSelectedTags((current) => (current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]))
  }

  function handleDelete() {
    if (!bill) return
    Alert.alert('删除账单', '确定删除这笔记录吗？删除后无法恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              setRemoving(true)
              await onRemove(bill.id)
              onClose()
            } finally {
              setRemoving(false)
            }
          })()
        },
      },
    ])
  }

  async function handleSave() {
    if (!bill) return
    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return

    try {
      setSaving(true)
      await onSave(bill.id, {
        type: entryType,
        amount: numericAmount,
        category: selectedCategory,
        note: note.trim(),
        tags: selectedTags,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!bill) return null

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, isCompactHeight && styles.sheetCompact]}>
          <View style={styles.sheetHeader}>
            <View style={styles.handle} />
            <Text style={[styles.title, typography.title]}>编辑账单</Text>
          </View>

          <View style={styles.body}>
            <ScrollView
              style={styles.contentScroll}
              contentContainerStyle={contentContainerStyle}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.typeSwitch}>
                <Pressable style={[styles.typePill, entryType === 'expense' && styles.typePillActive]} onPress={() => setEntryType('expense')}>
                  <Text style={[styles.typePillText, typography.captionStrong, entryType === 'expense' && styles.typePillTextActive]}>支出</Text>
                </Pressable>
                <Pressable style={[styles.typePill, entryType === 'income' && styles.typePillActive]} onPress={() => setEntryType('income')}>
                  <Text style={[styles.typePillText, typography.captionStrong, entryType === 'income' && styles.typePillTextActive]}>收入</Text>
                </Pressable>
              </View>

              <View style={[styles.fieldGroup, isCompactHeight && styles.fieldGroupCompact]}>
                <Text style={[styles.fieldLabel, typography.caption]}>金额</Text>
                <TextInput
                  style={[styles.input, isCompactHeight && styles.inputCompact, typography.body]}
                  value={amount}
                  onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  editable={!saving}
                />
              </View>

              <View style={[styles.fieldGroup, isCompactHeight && styles.fieldGroupCompact]}>
                <Text style={[styles.fieldLabel, typography.caption]}>分类</Text>
                <View style={styles.chipRow}>
                  {categories.slice(0, 8).map((cat) => (
                    <Pressable
                      key={cat}
                      style={[styles.chip, selectedCategory === cat && styles.chipActive]}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Text style={[styles.chipText, typography.captionStrong, selectedCategory === cat && styles.chipTextActive]}>{cat}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={[styles.fieldGroup, isCompactHeight && styles.fieldGroupCompact]}>
                <Text style={[styles.fieldLabel, typography.caption]}>备注</Text>
                <TextInput
                  style={[styles.input, isCompactHeight && styles.inputCompact, typography.body]}
                  value={note}
                  onChangeText={setNote}
                  placeholder="可选"
                  placeholderTextColor="#94A3B8"
                  editable={!saving}
                />
              </View>

              {selectedTags.length > 0 ? (
                <View style={[styles.fieldGroup, styles.tagsGroup, isCompactHeight && styles.fieldGroupCompact]}>
                  <Text style={[styles.fieldLabel, typography.caption]}>标签</Text>
                  <View style={styles.chipRow}>
                    {selectedTags.map((tag) => (
                      <Pressable key={tag} style={[styles.chip, styles.chipActive]} onPress={() => toggleTag(tag)}>
                        <Text style={[styles.chipText, styles.chipTextActive, typography.captionStrong]}>#{tag}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
            </ScrollView>

            <View style={[styles.footerDock, { minHeight: actionDockHeight }]}>
              <View style={styles.actions}>
                <Pressable style={styles.deleteButton} onPress={handleDelete} disabled={removing || saving}>
                  {removing ? <ActivityIndicator color="#DC2626" size="small" /> : <Text style={[styles.deleteText, typography.captionStrong]}>删除</Text>}
                </Pressable>
                <View style={styles.rightActions}>
                  <Pressable style={styles.cancelButton} onPress={onClose} disabled={saving}>
                    <Text style={[styles.cancelText, typography.captionStrong]}>取消</Text>
                  </Pressable>
                  <Pressable style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={() => void handleSave()} disabled={saving}>
                    {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={[styles.saveText, typography.captionStrong]}>保存</Text>}
                  </Pressable>
                </View>
              </View>
              <View style={styles.keyboardDock} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15,23,42,0.18)',
  },
  sheet: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing.page,
    paddingTop: 12,
    maxHeight: '96%',
  },
  sheetCompact: {
    maxHeight: '94%',
  },
  sheetHeader: {
    gap: 6,
    paddingBottom: 12,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: spacing.gap,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 6,
  },
  title: {
    color: colors.textPrimary,
  },
  typeSwitch: {
    flexDirection: 'row',
    gap: 10,
  },
  typePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  typePillActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  typePillText: {
    color: colors.textPrimary,
  },
  typePillTextActive: {
    color: '#FFFFFF',
  },
  fieldGroup: {
    gap: 6,
  },
  fieldGroupCompact: {
    gap: 4,
  },
  fieldLabel: {
    color: colors.textSecondary,
  },
  tagsGroup: {
    marginTop: 2,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.textPrimary,
  },
  inputCompact: {
    paddingVertical: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
  },
  chipActive: {
    backgroundColor: colors.accent,
  },
  chipText: {
    color: colors.accent,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerDock: {
    paddingTop: 14,
    paddingBottom: 12,
    gap: 12,
  },
  keyboardDock: {
    minHeight: 20,
  },
  deleteButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(254,242,242,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  deleteText: {
    color: '#DC2626',
  },
  rightActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.textPrimary,
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.72,
  },
  saveText: {
    color: '#FFFFFF',
  },
})
