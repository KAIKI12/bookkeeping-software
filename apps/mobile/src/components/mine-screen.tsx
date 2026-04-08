import React, { useMemo, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { createOpenAICompatibleClient } from '../../../../packages/ai/src'
import { settingsItems } from '../data/static'
import { useAIConfig } from '../hooks/use-ai-config'
import { fontScaleOptions, useUIPreferences } from '../hooks/use-ui-preferences'
import { hasAIConfig } from '../lib/ai-config'
import { colors, radii, spacing } from '../theme/tokens'

export function MineScreen() {
  const { config, updateConfig } = useAIConfig()
  const { fontScaleKey, setFontScaleKey, typography } = useUIPreferences()
  const [configVisible, setConfigVisible] = useState(false)
  const [draft, setDraft] = useState(config)
  const [isTesting, setIsTesting] = useState(false)
  const [testStatus, setTestStatus] = useState<string>('')

  const enabled = useMemo(() => hasAIConfig(config), [config])

  function openAIConfig() {
    setDraft(config)
    setTestStatus('')
    setConfigVisible(true)
  }

  async function handleSave() {
    await updateConfig(draft)
    setConfigVisible(false)
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
                onPress={isAI ? openAIConfig : undefined}
              >
                <View style={styles.menuContent}>
                  <Text style={[styles.menuText, typography.cardTitle]}>{item}</Text>
                  {isAI ? <Text style={[styles.menuHint, typography.footnote]}>{enabled ? config.model || config.baseURL : '填写 API Key、Base URL、模型名'}</Text> : null}
                </View>
                <Text style={styles.menuArrow}>›</Text>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>

      <Modal visible={configVisible} transparent animationType="slide" onRequestClose={() => setConfigVisible(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setConfigVisible(false)} />
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
              <Pressable style={styles.secondaryButton} onPress={() => setConfigVisible(false)}>
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
  statusText: {
    marginTop: 12,
    color: colors.textSecondary,
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

