import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native'
import type { ParsedTransactionDraft } from '../../../../packages/ai/src'
import { parseTransactionInput } from '../../../../packages/ai/src'
import { useUIPreferences } from '../hooks/use-ui-preferences'
import { hasAIConfig, type StoredAIConfig } from '../lib/ai-config'
import { colors, radii, shadows, spacing } from '../theme/tokens'

const incomeCategoryHints = ['工资', '奖金', '报销', '红包', '理财', '兼职', '退款']
const keypadRows = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', '⌫'],
  ['+', '-', '='],
]
const categoryAlias: Record<string, string> = {
  午饭: '餐饮',
  收入: '工资',
}

function mapCategory(category: string) {
  return categoryAlias[category] ?? category
}

function appendUnique(items: string[], value: string) {
  const normalized = value.trim()
  if (!normalized || items.includes(normalized)) {
    return items
  }

  return [...items, normalized]
}

function isIncomeCategory(category: string) {
  return incomeCategoryHints.some((item) => category.includes(item))
}

export function ComposerSheet({
  visible,
  onClose,
  onSubmit,
  aiConfig,
  categories,
  tags,
  addCategory,
  addTag,
  recentCategories,
  recentTags,
  latestPreset,
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
  categories: string[]
  tags: string[]
  addCategory: (name: string) => Promise<void>
  addTag: (name: string) => Promise<void>
  recentCategories: string[]
  recentTags: string[]
  latestPreset: {
    category: string
    tags: string[]
    note: string
    amount: number
    type: 'income' | 'expense'
  } | null
}) {
  const { typography } = useUIPreferences()
  const { height } = useWindowDimensions()
  const isCompactHeight = height < 780
  const [amount, setAmount] = useState('0')
  const [entryType, setEntryType] = useState<'income' | 'expense'>('expense')
  const [selectedCategory, setSelectedCategory] = useState('餐饮')
  const [note, setNote] = useState('')
  const [textInput, setTextInput] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [draft, setDraft] = useState<ParsedTransactionDraft | null>(null)
  const [draftParser, setDraftParser] = useState<'rule' | 'ai' | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [newCategory, setNewCategory] = useState('')
  const [newTag, setNewTag] = useState('')
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [isAddingTag, setIsAddingTag] = useState(false)

  const displayAmount = useMemo(() => {
    const numeric = Number(amount || 0)
    return Number.isNaN(numeric) ? '0.00' : numeric.toFixed(2)
  }, [amount])
  const compactGap = isCompactHeight ? 8 : spacing.gap
  const footerDockMinHeight = isCompactHeight ? 324 : 360
  const contentMaxHeight = isCompactHeight ? 208 : 272
  const keypadGap = isCompactHeight ? 6 : 8
  const keypadButtonHeight = isCompactHeight ? 44 : 48
  const contentContainerStyle = useMemo(
    () => [styles.contentContainer, { gap: compactGap, paddingBottom: compactGap }],
    [compactGap],
  )

  const incomeCategories = useMemo(() => categories.filter((item) => isIncomeCategory(item)), [categories])
  const expenseCategories = useMemo(() => categories.filter((item) => !isIncomeCategory(item)), [categories])
  const activeCategories = entryType === 'income' ? incomeCategories : expenseCategories
  const quickCategories = (appendUnique(recentCategories, '').slice(0, 4).length ? appendUnique(recentCategories, '').slice(0, 4) : activeCategories.slice(0, 4))
    .filter((item) => activeCategories.includes(item))
  const moreCategories = activeCategories.filter((item) => !quickCategories.includes(item))
  const quickTags = recentTags.length ? recentTags : tags.slice(0, 6)

  useEffect(() => {
    if (!activeCategories.length) {
      return
    }

    if (!activeCategories.includes(selectedCategory)) {
      setSelectedCategory(activeCategories[0])
    }
  }, [activeCategories, selectedCategory])

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
    setEntryType('expense')
    setSelectedCategory(expenseCategories[0] ?? categories[0] ?? '餐饮')
    setSelectedTags([])
    setNewCategory('')
    setNewTag('')
    setIsAddingCategory(false)
    setIsAddingTag(false)
    setNote('')
    setTextInput('')
    setDraft(null)
    setDraftParser(null)
    setIsParsing(false)
  }

  async function submitDraft(currentDraft: ParsedTransactionDraft) {
    const normalizedCategory = mapCategory(currentDraft.category)
    const normalizedTags = [...new Set(currentDraft.tags.map((item) => item.trim()).filter(Boolean))]

    await addCategory(normalizedCategory)
    await Promise.all(normalizedTags.map((tag) => addTag(tag)))

    await onSubmit({
      amount: currentDraft.amount,
      category: normalizedCategory,
      note: note || currentDraft.note,
      type: currentDraft.type,
      tags: normalizedTags,
      occurredAt: currentDraft.occurredAt,
      source: draftParser === 'ai' ? 'chat' : 'manual',
    })

    resetForm()
    onClose()
  }

  function toggleTag(tag: string) {
    setSelectedTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])
  }

  async function handleCreateCategory() {
    const normalized = newCategory.trim()
    if (!normalized) {
      return
    }

    await addCategory(normalized)
    setSelectedCategory(normalized)
    setNewCategory('')
    setIsAddingCategory(false)
  }

  async function handleCreateTag() {
    const normalized = newTag.trim()
    if (!normalized) {
      return
    }

    await addTag(normalized)
    setSelectedTags((current) => current.includes(normalized) ? current : [...current, normalized])
    setNewTag('')
    setIsAddingTag(false)
  }

  function applyLatestPreset() {
    if (!latestPreset) {
      return
    }

    setAmount(String(latestPreset.amount))
    setSelectedCategory(latestPreset.category)
    setSelectedTags(latestPreset.tags)
    setNote(latestPreset.note)
    setDraft(null)
    setDraftParser(null)
    setTextInput('')
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
      setEntryType(parsed.draft.type)
      setSelectedCategory(mapCategory(parsed.draft.category) || activeCategories[0] || categories[0] || '餐饮')
      setSelectedTags(parsed.draft.tags)
      return
    }

    await addCategory(selectedCategory)
    await Promise.all(selectedTags.map((tag) => addTag(tag)))

    await onSubmit({
      amount: Math.max(Number(amount || 0), 0),
      category: selectedCategory,
      note: note || `${selectedCategory}${entryType === 'income' ? '收入' : '支出'}`,
      type: entryType,
      tags: selectedTags,
      source: 'manual',
    })

    resetForm()
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, isCompactHeight && styles.sheetCompact]}>
          <View style={styles.sheetHeader}>
            <View style={styles.handle} />
            <Text style={[styles.title, typography.title]}>记一笔</Text>
            <Text style={[styles.subtitle, typography.body]}>手动输入、常用分类和 AI 文本记账都在这里</Text>
          </View>

          <View style={styles.sheetBody}>
            <ScrollView
              style={[styles.contentScroll, { maxHeight: contentMaxHeight }]}
              contentContainerStyle={contentContainerStyle}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={[styles.amountCard, isCompactHeight && styles.amountCardCompact]}>
                <Text style={[styles.amountLabel, typography.caption]}>金额</Text>
                <Text style={[styles.amountValue, typography.amountLarge]}>¥ {displayAmount}</Text>
              </View>

              <View style={styles.typeSwitch}>
                <Pressable style={[styles.typePill, entryType === 'expense' && styles.typePillActive]} onPress={() => setEntryType('expense')}>
                  <Text style={[styles.typePillText, typography.captionStrong, entryType === 'expense' && styles.typePillTextActive]}>支出</Text>
                </Pressable>
                <Pressable style={[styles.typePill, entryType === 'income' && styles.typePillActive]} onPress={() => setEntryType('income')}>
                  <Text style={[styles.typePillText, typography.captionStrong, entryType === 'income' && styles.typePillTextActive]}>收入</Text>
                </Pressable>
              </View>

              {isParsing ? (
                <View style={[styles.statusCard, isCompactHeight && styles.statusCardCompact]}>
                  <ActivityIndicator color={colors.accent} />
                  <Text style={[styles.statusText, typography.body]}>正在识别这条记账内容…</Text>
                </View>
              ) : null}

              <View style={[styles.sectionHeader, isCompactHeight && styles.sectionHeaderCompact]}>
                <Text style={[styles.sectionTitle, typography.cardTitle]}>常用分类</Text>
                <Pressable onPress={() => setIsAddingCategory((current) => !current)}>
                  <Text style={[styles.sectionLink, typography.captionStrong]}>{isAddingCategory ? '收起' : '+ 新增'}</Text>
                </Pressable>
              </View>
              {isAddingCategory ? (
                <View style={styles.inlineCreateRow}>
                  <TextInput
                    placeholder="输入新分类"
                    placeholderTextColor="#94A3B8"
                    style={[styles.inlineInput, typography.body]}
                    value={newCategory}
                    onChangeText={setNewCategory}
                    returnKeyType="done"
                    onSubmitEditing={() => void handleCreateCategory()}
                    blurOnSubmit={false}
                  />
                  <Pressable style={styles.inlineAction} onPress={() => void handleCreateCategory()}>
                    <Text style={[styles.inlineActionText, typography.captionStrong]}>添加</Text>
                  </Pressable>
                </View>
              ) : null}
              <View style={[styles.quickRow, isCompactHeight && styles.quickRowCompact]}>
                {quickCategories.map((item) => (
                  <Pressable key={item} style={[styles.chip, selectedCategory === item && styles.chipActive]} onPress={() => setSelectedCategory(item)}>
                    <Text style={[styles.chipText, typography.captionStrong, selectedCategory === item && styles.chipTextActive]}>{item}</Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                placeholder="备注（可选）"
                placeholderTextColor="#94A3B8"
                style={[styles.input, isCompactHeight && styles.inputCompact, typography.body]}
                value={note}
                onChangeText={setNote}
              />

              <Text style={[styles.aiTitle, isCompactHeight && styles.aiTitleCompact, typography.cardTitle]}>AI 文本记账</Text>
              <TextInput
                placeholder="比如：旅游午饭 20"
                placeholderTextColor="#94A3B8"
                style={[styles.input, isCompactHeight && styles.inputCompact, typography.body]}
                value={textInput}
                onChangeText={setTextInput}
              />

              {moreCategories.length ? (
                <>
                  <Text style={[styles.aiTitle, isCompactHeight && styles.aiTitleCompact, typography.cardTitle]}>更多分类</Text>
                  <View style={styles.grid}>
                    {moreCategories.map((item) => (
                      <Pressable key={item} style={[styles.gridItem, selectedCategory === item && styles.gridItemActive]} onPress={() => setSelectedCategory(item)}>
                        <Text style={[styles.gridText, typography.captionStrong]}>{item}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}

              <View style={[styles.sectionHeader, isCompactHeight && styles.sectionHeaderCompact]}>
                <Text style={[styles.aiTitle, typography.cardTitle]}>最近常用标签</Text>
                <Pressable onPress={() => setIsAddingTag((current) => !current)}>
                  <Text style={[styles.sectionLink, typography.captionStrong]}>{isAddingTag ? '收起' : '+ 新增'}</Text>
                </Pressable>
              </View>
              {isAddingTag ? (
                <View style={styles.inlineCreateRow}>
                  <TextInput
                    placeholder="输入新标签"
                    placeholderTextColor="#94A3B8"
                    style={[styles.inlineInput, typography.body]}
                    value={newTag}
                    onChangeText={setNewTag}
                    returnKeyType="done"
                    onSubmitEditing={() => void handleCreateTag()}
                    blurOnSubmit={false}
                  />
                  <Pressable style={styles.inlineAction} onPress={() => void handleCreateTag()}>
                    <Text style={[styles.inlineActionText, typography.captionStrong]}>添加</Text>
                  </Pressable>
                </View>
              ) : null}
              {quickTags.length ? (
                <View style={[styles.quickRow, isCompactHeight && styles.quickRowCompact]}>
                  {quickTags.slice(0, 6).map((tag) => {
                    const active = selectedTags.includes(tag)
                    return (
                      <Pressable key={tag} style={[styles.chip, active && styles.chipActive]} onPress={() => toggleTag(tag)}>
                        <Text style={[styles.chipText, typography.captionStrong, active && styles.chipTextActive]}>#{tag}</Text>
                      </Pressable>
                    )
                  })}
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
                  <Text style={[styles.draftLine, typography.body]}>标签：{draft.tags.length ? draft.tags.map((tag) => `#${tag}`).join(' ') : '—'}</Text>
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

              {latestPreset ? (
                <Pressable style={[styles.recentCard, isCompactHeight && styles.recentCardCompact]} onPress={applyLatestPreset}>
                  <Text style={[styles.recentTitle, typography.cardTitle]}>复记上一笔</Text>
                  <Text style={[styles.recentText, typography.body]}>
                    {latestPreset.type === 'income' ? '收入' : '支出'} · {latestPreset.category} · ¥{latestPreset.amount}
                  </Text>
                </Pressable>
              ) : null}
            </ScrollView>

            <View style={[styles.footerDock, isCompactHeight && styles.footerDockCompact, { minHeight: footerDockMinHeight }]}>
              <View style={[styles.keypadSummaryCard, isCompactHeight && styles.keypadSummaryCardCompact]}>
                <Text style={[styles.keypadSummaryText, typography.footnote]}>
                  当前输入 · ¥ {displayAmount} · {entryType === 'income' ? `${selectedCategory} · 收入` : `${selectedCategory} · 支出`}
                </Text>
              </View>

              <View style={[styles.keypadGrid, { gap: keypadGap }]}>
                {keypadRows.map((row) => (
                  <View key={row.join('-')} style={[styles.keypadRow, { gap: keypadGap }]}>
                    {row.map((key) => (
                      <Pressable key={key} style={[styles.key, { height: keypadButtonHeight }]} onPress={() => appendKey(key)}>
                        <Text style={[styles.keyText, typography.cardTitle]}>{key}</Text>
                      </Pressable>
                    ))}
                  </View>
                ))}
              </View>

              <View style={styles.footerRow}>
                <View style={styles.voiceHint}>
                  <Text style={[styles.voiceHintText, typography.footnote]}>长按主按钮可语音记账</Text>
                </View>
                <Pressable style={[styles.confirmButton, isCompactHeight && styles.confirmButtonCompact]} onPress={() => void handleSubmit()}>
                  <Text style={[styles.confirmText, typography.captionStrong]}>{draft ? '确认入账' : '确认识别'}</Text>
                </Pressable>
              </View>
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
    backgroundColor: 'rgba(15,23,42,0.16)',
  },
  sheet: {
    flex: 1,
    backgroundColor: 'rgba(248,250,252,0.96)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing.page,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: colors.cardBorder,
    marginTop: 56,
  },
  sheetCompact: {
    marginTop: 36,
  },
  sheetHeader: {
    paddingBottom: 12,
  },
  sheetBody: {
    flex: 1,
    minHeight: 0,
  },
  contentScroll: {
    flex: 1,
    minHeight: 0,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: spacing.gap,
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
    marginTop: 2,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  amountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    padding: spacing.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.card,
  },
  amountCardCompact: {
    padding: spacing.cardCompact,
  },
  statusCardCompact: {
    marginTop: 10,
    paddingVertical: 10,
  },

  amountLabel: {
    color: colors.textSecondary,
  },
  amountValue: {
    marginTop: 10,
    color: colors.textPrimary,
  },
  typeSwitch: {
    marginTop: 12,
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
  recentCard: {
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.cardCompact,
  },
  recentCardCompact: {
    marginTop: 10,
  },
  recentTitle: {
    color: colors.textPrimary,
  },
  recentText: {
    marginTop: 6,
    color: colors.textSecondary,
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
  sectionHeaderCompact: {
    marginTop: 12,
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
  quickRowCompact: {
    marginTop: 10,
    marginBottom: 12,
    gap: 8,
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
  aiTitleCompact: {
    marginTop: 12,
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
  inputCompact: {
    paddingVertical: 12,
  },
  inlineCreateRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inlineInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.textPrimary,
  },
  inlineAction: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  inlineActionText: {
    color: colors.accent,
  },
  keypadSummaryCard: {
    marginTop: 2,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  keypadSummaryCardCompact: {
    paddingVertical: 6,
  },

  keypadSummaryText: {
    color: colors.textSecondary,
  },
  keypadGrid: {
    gap: 8,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 8,
  },
  key: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  keyText: {
    color: colors.textPrimary,
  },
  footerDock: {
    paddingTop: 6,
    paddingBottom: 6,
    gap: 6,
    marginTop: 6,
  },
  footerDockCompact: {
    paddingTop: 4,
    paddingBottom: 4,
    gap: 4,
    marginTop: 4,
  },

  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  voiceHint: {
    flex: 1,
  },
  voiceHintText: {
    color: colors.textSecondary,
  },
  confirmButton: {
    backgroundColor: colors.textPrimary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radii.pill,
  },
  confirmButtonCompact: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  confirmText: {
    color: '#FFFFFF',
  },
})



