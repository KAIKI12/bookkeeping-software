import React, { useMemo, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import type { ParsedTransactionDraft } from '../../../../packages/ai/src'
import { parseTransactionInput } from '../../../../packages/ai/src'
import { useUIPreferences } from '../hooks/use-ui-preferences'
import { hasAIConfig, type StoredAIConfig } from '../lib/ai-config'
import { colors, radii, shadows, spacing } from '../theme/tokens'

const quickCategories = ['餐饮', '交通', '购物', '娱乐']
const moreCategories = ['房租', '咖啡', '宠物', '旅行', '社交', '医疗', '学习', '日用']
const keypad = ['1','2','3','+','4','5','6','-','7','8','9','.','0','=','⌫']
const categoryAlias: Record<string, string> = {
  午饭: '餐饮',
  收入: '收入',
}

function mapCategory(category: string) {
  return categoryAlias[category] ?? category
}

export function ComposerSheet({
  visible,
  onClose,
  onSubmit,
  aiConfig,
}: {
  visible: boolean
  onClose: () => void
  onSubmit: (input: {
    amount: number
    category: string
    note: string
    type: 'income' | 'expense'
    tags?: string[]
    occurredAt?: string
    source?: 'manual' | 'voice' | 'chat' | 'import'
  }) => Promise<void>
  aiConfig: StoredAIConfig
}) {
  const { typography } = useUIPreferences()
  const [amount, setAmount] = useState('0')
  const [selectedCategory, setSelectedCategory] = useState('餐饮')
  const [note, setNote] = useState('')
  const [textInput, setTextInput] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [draft, setDraft] = useState<ParsedTransactionDraft | null>(null)
  const [draftParser, setDraftParser] = useState<'rule' | 'ai' | null>(null)

  const displayAmount = useMemo(() => {
    const numeric = Number(amount || 0)
    return Number.isNaN(numeric) ? '0.00' : numeric.toFixed(2)
  }, [amount])

  function appendKey(key: string) {
    if (key === '⌫') {
      setAmount((current) => (current.length <= 1 ? '0' : current.slice(0, -1)))
      return
    }

    if (key === '=') {
      return
    }

    setAmount((current) => {
      if (current === '0' && /[0-9]/.test(key)) {
        return key
      }
      return `${current}${key}`
    })
  }

  function resetForm() {
    setAmount('0')
    setSelectedCategory('餐饮')
    setNote('')
    setTextInput('')
    setDraft(null)
    setDraftParser(null)
    setIsParsing(false)
  }

  async function submitDraft(currentDraft: ParsedTransactionDraft) {
    await onSubmit({
      amount: currentDraft.amount,
      category: mapCategory(currentDraft.category),
      note: note || currentDraft.note,
      type: currentDraft.type,
      tags: currentDraft.tags,
      occurredAt: currentDraft.occurredAt,
      source: draftParser === 'ai' ? 'chat' : 'manual',
    })

    resetForm()
    onClose()
  }

  async function handleSubmit() {
    const normalizedText = textInput.trim()

    if (draft) {
      await submitDraft(draft)
      return
    }

    if (normalizedText) {
      setIsParsing(true)
      const parsed = await parseTransactionInput(normalizedText, {
        aiConfig: hasAIConfig(aiConfig) ? aiConfig : undefined,
      })
      setIsParsing(false)

      if (parsed.parser === 'rule') {
        await submitDraft(parsed.draft)
        return
      }

      setDraft(parsed.draft)
      setDraftParser(parsed.parser)
      setAmount(String(parsed.draft.amount || 0))
      setSelectedCategory(mapCategory(parsed.draft.category))
      return
    }

    await onSubmit({
      amount: Math.max(Number(amount || 0), 0),
      category: selectedCategory,
      note: note || `${selectedCategory}支出`,
      type: 'expense',
      source: 'manual',
    })

    resetForm()
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={[styles.title, typography.title]}>记一笔</Text>
          <Text style={[styles.subtitle, typography.body]}>手动输入、常用分类和 AI 文本记账都在这里</Text>

          <View style={styles.amountCard}>
            <Text style={[styles.amountLabel, typography.caption]}>金额</Text>
            <Text style={[styles.amountValue, typography.amountLarge]}>¥ {displayAmount}</Text>
          </View>

          {isParsing ? (
            <View style={styles.statusCard}>
              <ActivityIndicator color={colors.accent} />
              <Text style={[styles.statusText, typography.body]}>正在识别这条记账内容…</Text>
            </View>
          ) : null}

          {draft ? (
            <View style={styles.draftCard}>
              <View style={styles.draftHeader}>
                <Text style={[styles.draftTitle, typography.cardTitle]}>识别草稿</Text>
                <Text style={[styles.draftBadge, typography.footnote]}>{draftParser === 'ai' ? 'AI' : '规则'}</Text>
              </View>
              <Text style={[styles.draftLine, typography.body]}>分类：{mapCategory(draft.category)}</Text>
              <Text style={[styles.draftLine, typography.body]}>金额：¥ {draft.amount.toFixed(2)}</Text>
              <Text style={[styles.draftLine, typography.body]}>类型：{draft.type === 'income' ? '收入' : '支出'}</Text>
              <Text style={[styles.draftLine, typography.body]}>备注：{note || draft.note}</Text>
              <View style={styles.draftActions}>
                <Pressable style={styles.secondaryButton} onPress={() => setDraft(null)}>
                  <Text style={[styles.secondaryButtonText, typography.captionStrong]}>重新编辑</Text>
                </Pressable>
                <Pressable style={styles.confirmButton} onPress={() => void submitDraft(draft)}>
                  <Text style={[styles.confirmText, typography.captionStrong]}>确认草稿</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, typography.cardTitle]}>常用分类</Text>
            <Text style={[styles.sectionLink, typography.captionStrong]}>更多</Text>
          </View>
          <View style={styles.quickRow}>
            {quickCategories.map((item) => (
              <Pressable key={item} style={[styles.chip, selectedCategory === item && styles.chipActive]} onPress={() => setSelectedCategory(item)}>
                <Text style={[styles.chipText, typography.captionStrong, selectedCategory === item && styles.chipTextActive]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.grid}>
            {moreCategories.map((item) => (
              <Pressable key={item} style={[styles.gridItem, selectedCategory === item && styles.gridItemActive]} onPress={() => setSelectedCategory(item)}>
                <Text style={[styles.gridText, typography.captionStrong]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.aiTitle, typography.cardTitle]}>AI 文本记账</Text>
          <TextInput
            placeholder="比如：旅游午饭 20"
            placeholderTextColor="#94A3B8"
            style={[styles.input, typography.body]}
            value={textInput}
            onChangeText={setTextInput}
          />

          <TextInput
            placeholder="备注（可选）"
            placeholderTextColor="#94A3B8"
            style={[styles.input, typography.body]}
            value={note}
            onChangeText={setNote}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.keyboardRow}>
            {keypad.map((key) => (
              <Pressable key={key} style={styles.key} onPress={() => appendKey(key)}>
                <Text style={[styles.keyText, typography.cardTitle]}>{key}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.footerRow}>
            <View style={styles.voiceHint}>
              <Text style={[styles.voiceHintText, typography.footnote]}>长按主按钮可语音记账</Text>
            </View>
            <Pressable style={styles.confirmButton} onPress={() => void handleSubmit()}>
              <Text style={[styles.confirmText, typography.captionStrong]}>{draft ? '确认入账' : '确认识别'}</Text>
            </Pressable>
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
    backgroundColor: 'rgba(15,23,42,0.16)',
  },
  sheet: {
    backgroundColor: 'rgba(248,250,252,0.96)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing.page,
    paddingTop: 12,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderColor: colors.cardBorder,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
    marginBottom: 14,
  },
  title: {
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: 6,
    color: colors.textSecondary,
    marginBottom: spacing.section,
  },
  amountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    padding: spacing.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.card,
  },
  amountLabel: {
    color: colors.textSecondary,
  },
  amountValue: {
    marginTop: 10,
    color: colors.textPrimary,
  },
  statusCard: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statusText: {
    color: colors.textSecondary,
    flex: 1,
  },
  draftCard: {
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.cardCompact,
    gap: spacing.gapTight,
  },
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: spacing.gap,
  },
  draftTitle: {
    color: colors.textPrimary,
  },
  draftBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    color: colors.accent,
    fontWeight: '700',
  },
  draftLine: {
    color: colors.textPrimary,
  },
  draftActions: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 10,
  },
  secondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
  },
  sectionHeader: {
    marginTop: spacing.section,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: colors.textPrimary,
  },
  sectionLink: {
    color: colors.accent,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    minHeight: 40,
    justifyContent: 'center',
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridItem: {
    width: '22%',
    minWidth: 72,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  gridItemActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  gridText: {
    color: colors.textPrimary,
  },
  aiTitle: {
    marginTop: spacing.section,
    color: colors.textPrimary,
  },
  input: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.textPrimary,
  },
  keyboardRow: {
    gap: 10,
    paddingTop: 16,
    paddingBottom: 4,
  },
  key: {
    width: 56,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  keyText: {
    color: colors.textPrimary,
  },
  footerRow: {
    marginTop: spacing.section,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.gap,
  },
  voiceHint: {
    flex: 1,
  },
  voiceHintText: {
    color: colors.textSecondary,
  },
  confirmButton: {
    backgroundColor: colors.textPrimary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: radii.pill,
  },
  confirmText: {
    color: '#FFFFFF',
  },
})



