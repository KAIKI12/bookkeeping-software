import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native'
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
  早饭: '早餐',
  午餐: '午饭',
  晚餐: '晚饭',
  收入: '工资',
}
const categoryGroupPresets: Record<'income' | 'expense', Record<string, string[]>> = {
  expense: {
    餐饮: ['餐饮', '早餐', '午饭', '晚饭', '奶茶', '咖啡', '宵夜'],
    交通: ['交通', '打车', '公交地铁', '停车'],
    购物: ['购物', '服饰', '数码', '家居', '日用品'],
    娱乐: ['娱乐', '电影', '游戏', '演出', '聚会'],
    房租: ['房租', '水电', '物业', '网费'],
    宠物: ['宠物', '宠物粮', '洗护', '宠物医疗'],
    旅行: ['旅行', '机酒', '门票', '景区', '路费'],
    社交: ['社交', '聚餐', '红包', '礼物'],
    医疗: ['医疗', '挂号', '药品', '检查', '牙科'],
    学习: ['学习', '书', '课程', '订阅', '文具'],
    日用: ['日用', '清洁', '厨卫', '家居', '消耗品'],
  },
  income: {
    工资: ['工资', '奖金', '报销', '兼职', '退款'],
  },
}

type CategoryOptionGroup = {
  name: string
  detailCategories: string[]
}

function appendUnique(items: string[], next: string) {
  return items.includes(next) ? items : [...items, next]
}

function mapCategory(category: string) {
  const normalized = category.trim()
  return categoryAlias[normalized] ?? normalized
}

function findPresetParentCategory(category: string, entryType: 'income' | 'expense') {
  const normalized = mapCategory(category)
  const groups = categoryGroupPresets[entryType]

  return Object.keys(groups).find((name) => name === normalized || groups[name].includes(normalized)) ?? normalized
}

function buildCategoryGroups(categories: string[], recentCategories: string[], entryType: 'income' | 'expense') {
  const presets = categoryGroupPresets[entryType]
  const groups = new Map<string, string[]>()

  Object.entries(presets).forEach(([name, detailCategories]) => {
    groups.set(name, [...new Set(detailCategories.map(mapCategory))])
  })

  categories.forEach((category) => {
    const normalized = mapCategory(category)
    const parent = findPresetParentCategory(normalized, entryType)
    groups.set(parent, appendUnique(groups.get(parent) ?? [parent], normalized))
  })

  const orderedNames = [...new Set([
    ...recentCategories.map((category) => findPresetParentCategory(category, entryType)),
    ...categories.map((category) => findPresetParentCategory(category, entryType)),
    ...Object.keys(presets),
  ])]

  return orderedNames
    .map((name) => ({
      name,
      detailCategories: groups.get(name) ?? [name],
    }))
    .filter((group) => group.detailCategories.length > 0)
}

function resolveCategoryForType(
  entryType: 'income' | 'expense',
  categories: string[],
  recentCategories: string[],
  preferredCategory?: string,
) {
  const normalizedPreferred = preferredCategory ? mapCategory(preferredCategory) : null
  const categoryGroups = buildCategoryGroups(categories, recentCategories, entryType)

  if (normalizedPreferred) {
    const matchesCategory = categories.some((item) => mapCategory(item) === normalizedPreferred)
    const matchesGroup = categoryGroups.some((group) => group.detailCategories.includes(normalizedPreferred))

    if (matchesCategory || matchesGroup) {
      return normalizedPreferred
    }
  }

  return categoryGroups[0]?.detailCategories[0] ?? mapCategory(categories[0] ?? (entryType === 'income' ? '工资' : '餐饮'))
}

function isIncomeCategory(category: string) {
  return incomeCategoryHints.some((item) => mapCategory(category).includes(item))
}

export function ComposerScreen({
  onBack,
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
  onBack: () => void
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
  const [activeInputMode, setActiveInputMode] = useState<'custom-keypad' | 'system-keyboard'>('custom-keypad')

  const displayAmount = useMemo(() => {
    const numeric = Number(amount || 0)
    return Number.isNaN(numeric) ? '0.00' : numeric.toFixed(2)
  }, [amount])

  const incomeCategories = useMemo(() => categories.filter((item) => isIncomeCategory(item)), [categories])
  const expenseCategories = useMemo(() => categories.filter((item) => !isIncomeCategory(item)), [categories])
  const activeCategories = entryType === 'income' ? incomeCategories : expenseCategories
  const quickCategories = useMemo(() => {
    const recentMatches = recentCategories.filter((item) => activeCategories.includes(item))
    const fallbackMatches = activeCategories.filter((item) => !recentMatches.includes(item))
    return [...recentMatches, ...fallbackMatches].slice(0, 8)
  }, [activeCategories, recentCategories])
  const categoryGroups = useMemo(
    () => buildCategoryGroups(quickCategories, recentCategories, entryType).slice(0, 4),
    [entryType, quickCategories, recentCategories],
  )
  const selectedParentCategory = useMemo(
    () => findPresetParentCategory(selectedCategory, entryType),
    [entryType, selectedCategory],
  )
  const activeDetailCategories = useMemo(
    () => categoryGroups.find((group) => group.name === selectedParentCategory)?.detailCategories ?? [selectedCategory],
    [categoryGroups, selectedCategory, selectedParentCategory],
  )
  const latestHint = latestPreset ? `${latestPreset.type === 'income' ? '收入' : '支出'} · ${latestPreset.category} · ¥${latestPreset.amount}` : null
  const keyboardSummary = entryType === 'income' ? `${selectedCategory} · 收入` : `${selectedCategory} · 支出`
  const primaryButtonLabel = draft ? '确认入账' : textInput.trim() ? '确认识别' : '保存记账'

  useEffect(() => {
    if (!activeCategories.length) {
      return
    }

    const normalizedSelected = mapCategory(selectedCategory)
    const matchesStoredCategory = activeCategories.map(mapCategory).includes(normalizedSelected)
    const matchesPresetDetail = categoryGroups.some((group) => group.detailCategories.includes(normalizedSelected))

    if (!matchesStoredCategory && !matchesPresetDetail) {
      setSelectedCategory(mapCategory(activeCategories[0]))
    }
  }, [activeCategories, categoryGroups, selectedCategory])

  useEffect(() => {
    if (!categoryGroups.length) {
      return
    }

    const normalizedSelected = mapCategory(selectedCategory)
    const matchedParent = categoryGroups.find((group) => group.detailCategories.includes(normalizedSelected))
    if (!matchedParent) {
      setSelectedCategory(categoryGroups[0].detailCategories[0])
    }
  }, [categoryGroups, selectedCategory])

  function setEntryTypeAndCategory(nextType: 'income' | 'expense') {
    setEntryType(nextType)
    setDraft((currentDraft) => {
      if (!currentDraft || currentDraft.type === nextType) {
        return currentDraft
      }

      return {
        ...currentDraft,
        type: nextType,
        category: resolveCategoryForType(nextType, nextType === 'income' ? incomeCategories : expenseCategories, recentCategories, currentDraft.category),
      }
    })

    const nextCategories = nextType === 'income' ? incomeCategories : expenseCategories
    const currentCategory = mapCategory(selectedCategory)
    const stillMatches = nextCategories.some((item) => mapCategory(item) === currentCategory)

    if (stillMatches) {
      return
    }

    const fallbackCategory = resolveCategoryForType(nextType, nextCategories, recentCategories, selectedCategory)
    setSelectedCategory(fallbackCategory)
  }

  function showCustomKeypad() {
    Keyboard.dismiss()
    setActiveInputMode('custom-keypad')
  }

  function handleSelectCategory(parentCategory: string, detailCategory?: string) {
    showCustomKeypad()
    setSelectedCategory(mapCategory(detailCategory ?? parentCategory))
  }

  function appendKey(key: string) {
    showCustomKeypad()
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
    setNote('')
    setTextInput('')
    setDraft(null)
    setDraftParser(null)
    setIsParsing(false)
    setActiveInputMode('custom-keypad')
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
  }

  function applyLatestPreset() {
    if (!latestPreset) {
      return
    }

    showCustomKeypad()
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
      setSelectedCategory(resolveCategoryForType(parsed.draft.type, parsed.draft.type === 'income' ? incomeCategories : expenseCategories, recentCategories, parsed.draft.category))
      setSelectedTags(parsed.draft.tags)
      showCustomKeypad()
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
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => { Keyboard.dismiss(); onBack() }}>
          <Text style={[styles.backText, typography.captionStrong]}>返回</Text>
        </Pressable>
      </View>

      <View style={styles.topSection}>
        <Pressable style={[styles.amountCard, isCompactHeight && styles.amountCardCompact]} onPress={showCustomKeypad}>
          <View style={styles.amountHeaderRow}>
            <Text style={[styles.amountLabel, typography.caption]}>金额</Text>
            <View style={styles.typeSwitchMini}>
              <Pressable style={[styles.typeMiniPill, entryType === 'expense' && styles.typeMiniPillActive]} onPress={() => setEntryTypeAndCategory('expense')}>
                <Text style={[styles.typeMiniText, typography.footnote, entryType === 'expense' && styles.typeMiniTextActive]}>支出</Text>
              </Pressable>
              <Pressable style={[styles.typeMiniPill, entryType === 'income' && styles.typeMiniPillActive]} onPress={() => setEntryTypeAndCategory('income')}>
                <Text style={[styles.typeMiniText, typography.footnote, entryType === 'income' && styles.typeMiniTextActive]}>收入</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.amountTopRow}>
            <View style={styles.amountMain}>
              <Text style={[styles.amountValueCompact, isCompactHeight && styles.amountValueCompactSmall]}>¥ {displayAmount}</Text>
            </View>
            <View style={styles.amountMetaWrap}>
              <Text style={[styles.amountMeta, typography.footnote]} numberOfLines={1}>{selectedCategory}</Text>
            </View>
          </View>
        </Pressable>
      </View>

      <View style={styles.formSection}>
        <View style={styles.categorySection}>
          <View style={[styles.sectionHeaderRow, styles.categoryHeader]}>
            <Text style={[styles.sectionTitle, typography.cardTitle]}>常用分类</Text>
            <Text style={[styles.sectionMeta, typography.footnote]}>{selectedCategory}</Text>
          </View>
          <View style={styles.categorySingleRow}>
            {categoryGroups.map((group) => {
              const isParentActive = selectedParentCategory === group.name
              return (
                <Pressable
                  key={group.name}
                  style={[styles.categoryChip, isParentActive && styles.categoryChipActive]}
                  onPress={() => handleSelectCategory(group.name, group.detailCategories[0])}
                >
                  <Text style={[styles.categoryChipText, typography.captionStrong, isParentActive && styles.categoryChipTextActive]}>
                    {group.name}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          <View style={styles.detailChipRow}>
            {activeDetailCategories.map((detailCategory) => {
              const isDetailActive = mapCategory(selectedCategory) === detailCategory
              return (
                <Pressable
                  key={detailCategory}
                  style={[styles.detailChip, isDetailActive && styles.detailChipActive]}
                  onPress={() => handleSelectCategory(selectedParentCategory, detailCategory)}
                >
                  <Text style={[styles.detailChipText, typography.captionStrong, isDetailActive && styles.detailChipTextActive]}>
                    {detailCategory}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.sectionTitle, typography.cardTitle]}>备注</Text>
          <TextInput
            placeholder="可选"
            placeholderTextColor="#94A3B8"
            style={[styles.input, isCompactHeight && styles.inputCompact, typography.body]}
            value={note}
            onChangeText={setNote}
            onFocus={() => setActiveInputMode('system-keyboard')}
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, typography.cardTitle]}>AI 文本记账</Text>
            {latestHint ? <Text style={[styles.sectionMeta, typography.footnote]}>可复记上一笔</Text> : null}
          </View>
          <TextInput
            placeholder="比如：旅游午饭 20"
            placeholderTextColor="#94A3B8"
            style={[styles.input, isCompactHeight && styles.inputCompact, typography.body]}
            value={textInput}
            onChangeText={setTextInput}
            onFocus={() => setActiveInputMode('system-keyboard')}
          />
        </View>

        {latestHint ? (
          <Pressable style={styles.presetBar} onPress={applyLatestPreset}>
            <Text style={[styles.presetText, typography.footnote]}>复记上一笔 · {latestHint}</Text>
          </Pressable>
        ) : null}

        {isParsing ? (
          <View style={styles.infoBar}>
            <ActivityIndicator color={colors.accent} size="small" />
            <Text style={[styles.infoText, typography.footnote]}>正在识别这条记账内容…</Text>
          </View>
        ) : null}

        {draft ? (
          <View style={styles.infoCard}>
            <Text style={[styles.infoTitle, typography.captionStrong]}>识别结果 · {draftParser === 'ai' ? 'AI' : '规则'}</Text>
            <Text style={[styles.infoLine, typography.footnote]}>分类：{mapCategory(draft.category)}　金额：¥ {draft.amount.toFixed(2)}</Text>
            <Text style={[styles.infoLine, typography.footnote]}>备注：{note || draft.note}</Text>
          </View>
        ) : null}
      </View>

      {activeInputMode === 'custom-keypad' ? (
        <View style={styles.keyboardSection}>
          <Text style={[styles.keyboardSummary, typography.footnote]}>当前输入 · ¥ {displayAmount} · {keyboardSummary}</Text>
          <View style={styles.keypadGrid}>
            {keypadRows.map((row) => (
              <View key={row.join('-')} style={styles.keypadRow}>
                {row.map((key) => (
                  <Pressable key={key} style={styles.key} onPress={() => appendKey(key)}>
                    <Text style={[styles.keyText, typography.cardTitle]}>{key}</Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.keyboardPlaceholder}>
          <Text style={[styles.placeholderText, typography.footnote]}>系统键盘已接管底部输入区</Text>
        </View>
      )}

      <View style={styles.actionRow}>
        <Pressable style={styles.secondaryButton} onPress={showCustomKeypad}>
          <Text style={[styles.secondaryText, typography.captionStrong]}>数字键盘</Text>
        </Pressable>
        <Pressable style={styles.confirmButton} onPress={() => void handleSubmit()}>
          <Text style={[styles.confirmText, typography.captionStrong]}>{primaryButtonLabel}</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: spacing.page,
    paddingTop: spacing.pageTop,
    paddingBottom: 16,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },

  backButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  backText: {
    color: colors.textPrimary,
  },
  topSection: {
    gap: 8,
  },
  amountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.card,
  },
  amountCardCompact: {
    paddingVertical: 8,
  },
  amountHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },

  amountTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
    marginTop: 4,
  },
  amountMain: {
    gap: 2,
    flexShrink: 1,
  },

  amountLabel: {
    color: colors.textSecondary,
  },
  amountValueCompact: {
    color: colors.textPrimary,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
  },
  amountValueCompactSmall: {
    fontSize: 16,
    lineHeight: 20,
  },
  amountMetaWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
    flexShrink: 1,
  },
  amountMeta: {
    color: colors.textSecondary,
    flexShrink: 1,
    textAlign: 'right',
  },
  typeSwitchMini: {
    flexDirection: 'row',
    gap: 4,
    padding: 2,
    borderRadius: radii.pill,
    backgroundColor: '#F3F4F6',
  },
  typeMiniPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  typeMiniPillActive: {
    backgroundColor: colors.textPrimary,
  },
  typeMiniText: {
    color: colors.textSecondary,
  },
  typeMiniTextActive: {
    color: '#FFFFFF',
  },
  formSection: {
    gap: 8,
  },
  categorySection: {
    gap: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  categoryHeader: {
    marginBottom: 2,
  },
  sectionTitle: {
    color: colors.textPrimary,
  },
  sectionMeta: {
    color: colors.textSecondary,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  categoryCard: {
    width: '48.5%',
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 2,
  },
  categoryCardCompact: {
    paddingVertical: 8,
  },
  categoryCardActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  categoryName: {
    color: colors.textPrimary,
  },
  categoryNameActive: {
    color: '#FFFFFF',
  },
  categoryHint: {
    color: colors.textSecondary,
  },
  categoryHintActive: {
    color: 'rgba(255,255,255,0.78)',
  },
  categorySingleRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  categoryChipActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  categoryChipText: {
    color: colors.textPrimary,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  detailChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  detailChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  detailChipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  detailChipText: {
    color: colors.textSecondary,
  },
  detailChipTextActive: {
    color: colors.accent,
  },
  inputGroup: {
    gap: 4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.textPrimary,
  },
  inputCompact: {
    paddingVertical: 10,
  },
  presetBar: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  presetText: {
    color: colors.textSecondary,
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    color: colors.textSecondary,
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
  },
  infoTitle: {
    color: colors.textPrimary,
  },
  infoLine: {
    color: colors.textSecondary,
  },
  keyboardSection: {
    gap: 6,
    marginTop: 'auto',
  },
  keyboardSummary: {
    color: colors.textSecondary,
  },
  keypadGrid: {
    gap: 6,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 6,
  },
  key: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  keyText: {
    color: colors.textPrimary,
  },
  keyboardPlaceholder: {
    minHeight: 24,
    justifyContent: 'center',
    marginTop: 'auto',
  },
  placeholderText: {
    color: colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: radii.pill,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  secondaryText: {
    color: colors.textPrimary,
  },
  confirmButton: {
    flex: 1.25,
    backgroundColor: colors.textPrimary,
    borderRadius: radii.pill,
    paddingVertical: 11,
    alignItems: 'center',
  },
  confirmText: {
    color: '#FFFFFF',
  },
})
