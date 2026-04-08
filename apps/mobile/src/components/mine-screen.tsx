import React, { useMemo, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { createOpenAICompatibleClient } from '../../../../packages/ai/src'
import { settingsItems } from '../data/static'
import { useAIConfig } from '../hooks/use-ai-config'
import { fontScaleOptions, useUIPreferences } from '../hooks/use-ui-preferences'
import { hasAIConfig } from '../lib/ai-config'
import { colors, radii, spacing } from '../theme/tokens'

type SettingsSheetType = 'category' | 'tag' | 'import' | 'ai' | null

export function MineScreen({
  categories,
  tags,
  addCategory,
  removeCategory,
  addTag,
  removeTag,
  importBills,
}: {
  categories: string[]
  tags: string[]
  addCategory: (name: string) => Promise<void>
  removeCategory: (name: string) => Promise<void>
  addTag: (name: string) => Promise<void>
  removeTag: (name: string) => Promise<void>
  importBills: (inputs: Array<{
    amount: number
    category: string
    note: string
    type: 'income' | 'expense'
    tags?: string[]
    occurredAt?: string
  }>) => Promise<void>
}) {
  const { config, updateConfig } = useAIConfig()
  const { fontScaleKey, setFontScaleKey, typography } = useUIPreferences()
  const [activeSheet, setActiveSheet] = useState<SettingsSheetType>(null)
  const [draft, setDraft] = useState(config)
  const [newCategory, setNewCategory] = useState('')
  const [newTag, setNewTag] = useState('')
  const [importText, setImportText] = useState('')
  const [importStatus, setImportStatus] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const [testStatus, setTestStatus] = useState<string>('')

  const enabled = useMemo(() => hasAIConfig(config), [config])

  function openAIConfig() {
    setDraft(config)
    setTestStatus('')
    setActiveSheet('ai')
  }

  function openCategorySheet() {
    setNewCategory('')
    setActiveSheet('category')
  }

  function openTagSheet() {
    setNewTag('')
    setActiveSheet('tag')
  }

  function openImportSheet() {
    setImportStatus('')
    setActiveSheet('import')
  }

  function parseImportRows(input: string) {
    return input
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const parts = line.split(',').map((item) => item.trim())
        if (parts.length < 4) {
          throw new Error(`第 ${index + 1} 行格式不对，至少需要：日期,类型,分类,金额`)
        }

        const [occurredAt, typeText, category, amountText, note = '', tagsText = ''] = parts
        const type: 'income' | 'expense' = typeText === '收入' || typeText === 'income' ? 'income' : 'expense'
        const amount = Number(amountText)

        if (!category || Number.isNaN(amount)) {
          throw new Error(`第 ${index + 1} 行缺少有效分类或金额`)
        }

        return {
          occurredAt: occurredAt.includes('T') ? occurredAt : `${occurredAt}T12:00:00.000Z`,
          type,
          category,
          amount: Math.abs(amount),
          note,
          tags: tagsText ? tagsText.split('|').map((item) => item.trim()).filter(Boolean) : [],
        }
      })
  }

  async function handleImportBills() {
    if (!importText.trim()) {
      setImportStatus('先粘贴要导入的账单内容。')
      return
    }

    try {
      const rows = parseImportRows(importText)
      await importBills(rows)
      await Promise.all(rows.map((row) => addCategory(row.category)))
      await Promise.all(rows.flatMap((row) => row.tags ?? []).map((tag) => addTag(tag)))
      setImportStatus(`已导入 ${rows.length} 笔账单。`)
      setImportText('')
    } catch (error) {
      setImportStatus(error instanceof Error ? error.message : '导入失败，请检查格式。')
    }
  }

  async function handleAddCategory() {
    if (!newCategory.trim()) {
      return
    }

    await addCategory(newCategory)
    setNewCategory('')
  }

  async function handleAddTag() {
    if (!newTag.trim()) {
      return
    }

    await addTag(newTag)
    setNewTag('')
  }

  async function handleSave() {
    await updateConfig(draft)
    setActiveSheet(null)
  }

  async function handleTestConnection() {
    if (!hasAIConfig(draft)) {
      setTestStatus('请先填写完整的 Base URL、Model 和 API Key')
      return
    }

    setIsTesting(true)
    setTestStatus('')

    try {
      await createOpenAICompatibleClient(draft, [
        {
          role: 'system',
          content: '你是连接测试助手，只回复 ok。',
        },
        {
          role: 'user',
          content: 'ping',
        },
      ])
      setTestStatus('连接成功，可以开始使用 AI 解析。')
    } catch (error) {
      setTestStatus(error instanceof Error ? `连接失败：${error.message}` : '连接失败，请检查配置。')
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, typography.hero]}>我的</Text>
        <Text style={[styles.subtitle, typography.body]}>分类、导入、AI 与数据设置都放这里</Text>
        <View style={styles.profileCard}>
          <Text style={[styles.profileName, typography.title]}>智能记账</Text>
          <Text style={[styles.profileMeta, typography.body]}>{enabled ? 'OpenAI Compatible · 自定义模型已启用' : 'OpenAI Compatible · 尚未配置模型'}</Text>
        </View>
        <View style={styles.menuCard}>
          <View style={[styles.menuItem, styles.menuBorder, styles.fontScaleRow]}>
            <View style={styles.menuContent}>
              <Text style={[styles.menuText, typography.cardTitle]}>字体大小</Text>
              <Text style={[styles.menuHint, typography.footnote]}>当前：{fontScaleOptions.find((option) => option.key === fontScaleKey)?.label ?? '标准'}</Text>
            </View>
            <View style={styles.fontScaleOptions}>
              {fontScaleOptions.map((option) => {
                const active = option.key === fontScaleKey
                return (
                  <Pressable key={option.key} style={[styles.fontChip, active && styles.fontChipActive]} onPress={() => void setFontScaleKey(option.key)}>
                    <Text style={[styles.fontChipText, typography.footnote, active && styles.fontChipTextActive]}>{option.label}</Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
          {settingsItems.map((item, index) => {
            const isAI = item === 'AI 配置'
            return (
              <Pressable
                key={item}
                style={[styles.menuItem, index !== settingsItems.length - 1 && styles.menuBorder]}
                onPress={
                  item === '分类管理'
                    ? openCategorySheet
                    : item === '标签管理'
                      ? openTagSheet
                      : item === '导入账单'
                        ? openImportSheet
                        : isAI
                          ? openAIConfig
                          : undefined
                }
              >
                <View style={styles.menuContent}>
                  <Text style={[styles.menuText, typography.cardTitle]}>{item}</Text>
                  {item === '分类管理' ? <Text style={[styles.menuHint, typography.footnote]}>当前 {categories.length} 个分类</Text> : null}
                  {item === '标签管理' ? <Text style={[styles.menuHint, typography.footnote]}>当前 {tags.length} 个标签</Text> : null}
                  {isAI ? <Text style={[styles.menuHint, typography.footnote]}>{enabled ? config.model || config.baseURL : '填写 API Key、Base URL、模型名'}</Text> : null}
                </View>
                <Text style={styles.menuArrow}>›</Text>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>

      <Modal visible={activeSheet === 'category'} transparent animationType="slide" onRequestClose={() => setActiveSheet(null)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setActiveSheet(null)} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={[styles.sheetTitle, typography.title]}>分类管理</Text>
            <Text style={[styles.sheetSubtitle, typography.body]}>补常用分类，主记账面板会同步使用。</Text>
            <TextInput
              placeholder="新增分类，比如：零食"
              placeholderTextColor="#94A3B8"
              style={[styles.input, typography.body]}
              value={newCategory}
              onChangeText={setNewCategory}
            />
            <View style={styles.tagList}>
              {categories.map((item) => (
                <View key={item} style={styles.tagChipRow}>
                  <Text style={[styles.tagChipLabel, typography.captionStrong]}>{item}</Text>
                  <Pressable onPress={() => void removeCategory(item)}>
                    <Text style={[styles.tagChipAction, typography.footnote]}>删除</Text>
                  </Pressable>
                </View>
              ))}
            </View>
            <View style={styles.sheetActions}>
              <Pressable style={styles.secondaryButton} onPress={() => setActiveSheet(null)}>
                <Text style={[styles.secondaryButtonText, typography.captionStrong]}>关闭</Text>
              </Pressable>
              <Pressable style={styles.confirmButton} onPress={() => void handleAddCategory()}>
                <Text style={[styles.confirmText, typography.captionStrong]}>新增分类</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={activeSheet === 'tag'} transparent animationType="slide" onRequestClose={() => setActiveSheet(null)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setActiveSheet(null)} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={[styles.sheetTitle, typography.title]}>标签管理</Text>
            <Text style={[styles.sheetSubtitle, typography.body]}>先维护常用标签，后续统计会继续用到。</Text>
            <TextInput
              placeholder="新增标签，比如：出差"
              placeholderTextColor="#94A3B8"
              style={[styles.input, typography.body]}
              value={newTag}
              onChangeText={setNewTag}
            />
            <View style={styles.tagList}>
              {tags.map((item) => (
                <View key={item} style={styles.tagChipRow}>
                  <Text style={[styles.tagChipLabel, typography.captionStrong]}>#{item}</Text>
                  <Pressable onPress={() => void removeTag(item)}>
                    <Text style={[styles.tagChipAction, typography.footnote]}>删除</Text>
                  </Pressable>
                </View>
              ))}
            </View>
            <View style={styles.sheetActions}>
              <Pressable style={styles.secondaryButton} onPress={() => setActiveSheet(null)}>
                <Text style={[styles.secondaryButtonText, typography.captionStrong]}>关闭</Text>
              </Pressable>
              <Pressable style={styles.confirmButton} onPress={() => void handleAddTag()}>
                <Text style={[styles.confirmText, typography.captionStrong]}>新增标签</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={activeSheet === 'import'} transparent animationType="slide" onRequestClose={() => setActiveSheet(null)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setActiveSheet(null)} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={[styles.sheetTitle, typography.title]}>导入账单</Text>
            <Text style={[styles.sheetSubtitle, typography.body]}>按行粘贴 CSV：日期,类型,分类,金额,备注,标签1|标签2</Text>
            <TextInput
              placeholder={"2026-04-01,expense,餐饮,18,午饭,通勤|工作日\n2026-04-02,income,工资,5000,4月工资,"}
              placeholderTextColor="#94A3B8"
              style={[styles.input, styles.importInput, typography.body]}
              value={importText}
              onChangeText={setImportText}
              multiline
              textAlignVertical="top"
            />
            {importStatus ? <Text style={[styles.statusText, typography.caption]}>{importStatus}</Text> : null}
            <View style={styles.sheetActions}>
              <Pressable style={styles.secondaryButton} onPress={() => setActiveSheet(null)}>
                <Text style={[styles.secondaryButtonText, typography.captionStrong]}>关闭</Text>
              </Pressable>
              <Pressable style={styles.confirmButton} onPress={() => void handleImportBills()}>
                <Text style={[styles.confirmText, typography.captionStrong]}>开始导入</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={activeSheet === 'ai'} transparent animationType="slide" onRequestClose={() => setActiveSheet(null)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setActiveSheet(null)} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={[styles.sheetTitle, typography.title]}>AI 配置</Text>
            <Text style={[styles.sheetSubtitle, typography.body]}>填写 OpenAI 兼容接口地址、模型和密钥。</Text>
            <TextInput
              placeholder="Base URL"
              placeholderTextColor="#94A3B8"
              style={[styles.input, typography.body]}
              value={draft.baseURL}
              onChangeText={(baseURL) => setDraft((current) => ({ ...current, baseURL }))}
              autoCapitalize="none"
            />
            <TextInput
              placeholder="Model"
              placeholderTextColor="#94A3B8"
              style={[styles.input, typography.body]}
              value={draft.model}
              onChangeText={(model) => setDraft((current) => ({ ...current, model }))}
              autoCapitalize="none"
            />
            <TextInput
              placeholder="API Key"
              placeholderTextColor="#94A3B8"
              style={[styles.input, typography.body]}
              value={draft.apiKey}
              onChangeText={(apiKey) => setDraft((current) => ({ ...current, apiKey }))}
              autoCapitalize="none"
              secureTextEntry
            />
            {testStatus ? <Text style={[styles.statusText, typography.caption]}>{testStatus}</Text> : null}
            <View style={styles.sheetActions}>
              <Pressable style={styles.secondaryButton} onPress={() => setActiveSheet(null)}>
                <Text style={[styles.secondaryButtonText, typography.captionStrong]}>取消</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => void handleTestConnection()}>
                {isTesting ? <ActivityIndicator color={colors.textPrimary} /> : <Text style={[styles.secondaryButtonText, typography.captionStrong]}>测试连接</Text>}
              </Pressable>
              <Pressable style={styles.confirmButton} onPress={() => void handleSave()}>
                <Text style={[styles.confirmText, typography.captionStrong]}>保存配置</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: spacing.page, paddingTop: spacing.pageTop, paddingBottom: spacing.pageBottom, gap: spacing.gapLoose },
  title: { color: colors.textPrimary },
  subtitle: { color: colors.textSecondary },
  profileCard: {
    backgroundColor: '#111827',
    borderRadius: radii.xl,
    padding: spacing.card,
  },
  profileName: { color: '#FFFFFF' },
  profileMeta: { color: 'rgba(255,255,255,0.72)', marginTop: 8 },
  menuCard: {
    backgroundColor: 'rgba(255,255,255,0.74)',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.card,
    paddingVertical: spacing.card,
    gap: spacing.gap,
  },
  menuContent: {
    flex: 1,
  },
  fontScaleRow: {
    alignItems: 'flex-start',
  },
  fontScaleOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
    maxWidth: '52%',
  },
  fontChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  fontChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  fontChipText: {
    color: colors.textPrimary,
  },
  fontChipTextActive: {
    color: '#FFFFFF',
  },
  menuBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  menuText: { color: colors.textPrimary },
  menuHint: { marginTop: 4, color: colors.textSecondary },
  menuArrow: { fontSize: 22, color: '#94A3B8' },
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
  sheetTitle: { color: colors.textPrimary },
  sheetSubtitle: { marginTop: 6, marginBottom: 16, color: colors.textSecondary },
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
  importInput: {
    minHeight: 160,
  },
  statusText: {
    marginTop: 12,
    color: colors.textSecondary,
  },
  tagList: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tagChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tagChipLabel: {
    color: colors.textPrimary,
  },
  tagChipAction: {
    color: colors.accent,
  },
  sheetActions: {
    marginTop: 20,
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
    minWidth: 88,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.textPrimary,
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

