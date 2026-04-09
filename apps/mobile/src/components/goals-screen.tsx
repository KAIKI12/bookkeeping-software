import React, { useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useUIPreferences } from '../hooks/use-ui-preferences'
import { colors, radii, spacing } from '../theme/tokens'

type GoalSummary = {
  id: string
  name: string
  current: number
  target: number
  eta: string
}

type GoalSuggestion = {
  title: string
  hint: string
}

type GoalFormState = {
  id?: string
  name: string
  target: string
}

const emptyForm: GoalFormState = {
  name: '',
  target: '',
}

export function GoalsScreen({
  goals,
  suggestion,
  addGoal,
  updateGoal,
  removeGoal,
}: {
  goals: GoalSummary[]
  suggestion: GoalSuggestion
  addGoal: (input: { name: string; target: number }) => Promise<void>
  updateGoal: (goalId: string, input: { name: string; target: number }) => Promise<void>
  removeGoal: (goalId: string) => Promise<void>
}) {
  const { typography } = useUIPreferences()
  const [editorVisible, setEditorVisible] = useState(false)
  const [form, setForm] = useState<GoalFormState>(emptyForm)
  const [status, setStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const isEditing = useMemo(() => Boolean(form.id), [form.id])

  function openCreate() {
    setForm(emptyForm)
    setStatus('')
    setEditorVisible(true)
  }

  function openEdit(goal: GoalSummary) {
    setForm({
      id: goal.id,
      name: goal.name,
      target: String(goal.target),
    })
    setStatus('')
    setEditorVisible(true)
  }

  function closeEditor() {
    setEditorVisible(false)
    setForm(emptyForm)
    setStatus('')
  }

  async function handleSubmit() {
    const name = form.name.trim()
    const target = Number(form.target)

    if (!name) {
      setStatus('请先填写目标名称。')
      return
    }

    if (name.length > 12) {
      setStatus('目标名称控制在 12 个字以内会更清楚。')
      return
    }

    if (!/^\d+(\.\d{1,2})?$/.test(form.target.trim())) {
      setStatus('目标金额最多保留两位小数。')
      return
    }

    if (!Number.isFinite(target) || target <= 0) {
      setStatus('请输入有效的目标金额。')
      return
    }

    try {
      setSubmitting(true)
      if (form.id) {
        await updateGoal(form.id, { name, target })
      } else {
        await addGoal({ name, target })
      }
      closeEditor()
    } finally {
      setSubmitting(false)
    }
  }

  function handleRemove(goal: GoalSummary) {
    Alert.alert('删除目标', `确定删除“${goal.name}”吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              setRemovingId(goal.id)
              await removeGoal(goal.id)
            } finally {
              setRemovingId(null)
            }
          })()
        },
      },
    ])
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={[styles.title, typography.hero]}>目标</Text>
            <Text style={[styles.subtitle, typography.body]}>把攒钱这件事看得更具体一点</Text>
          </View>
          <Pressable style={styles.addButton} onPress={openCreate}>
            <Text style={[styles.addButtonText, typography.captionStrong]}>新增目标</Text>
          </Pressable>
        </View>
        {goals.length ? (
          goals.map((goal) => {
            const progress = Math.min(goal.current / goal.target, 1)
            const progressPercent = Math.round(progress * 100)
            const completed = progress >= 1
            return (
              <View key={goal.id} style={[styles.card, completed && styles.cardCompleted]}>
                <View style={styles.goalRow}>
                  <View style={styles.goalCopy}>
                    <View style={styles.goalTitleRow}>
                      <Text style={[styles.goalName, typography.sectionTitle]}>{goal.name}</Text>
                      <View style={[styles.goalBadge, completed && styles.goalBadgeCompleted]}>
                        <Text style={[styles.goalBadgeText, typography.captionStrong, completed && styles.goalBadgeTextCompleted]}>
                          {completed ? '已完成' : `${progressPercent}%`}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.goalAmount, typography.body]}>{`¥${goal.current} / ¥${goal.target}`}</Text>
                  </View>
                  <View style={styles.goalActions}>
                    <Pressable onPress={() => openEdit(goal)} disabled={removingId === goal.id}>
                      <Text style={[styles.goalAction, typography.captionStrong, removingId === goal.id && styles.actionDisabled]}>编辑</Text>
                    </Pressable>
                    <Pressable onPress={() => handleRemove(goal)} disabled={removingId === goal.id}>
                      <Text style={[styles.goalDelete, typography.captionStrong, removingId === goal.id && styles.actionDisabled]}>
                        {removingId === goal.id ? '删除中…' : '删除'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, completed && styles.fillCompleted, { width: `${progress * 100}%` }]} />
                </View>
                <Text style={[styles.goalEta, typography.caption, completed && styles.goalEtaCompleted]}>{completed ? '这个目标已经攒够了。' : goal.eta}</Text>
              </View>
            )
          })
        ) : (
          <View style={styles.card}>
            <Text style={[styles.goalName, typography.sectionTitle]}>还没有目标</Text>
            <Text style={[styles.goalHint, typography.body]}>先加一个想攒的钱，再慢慢把它存满。</Text>
            <Pressable style={styles.emptyAction} onPress={openCreate}>
              <Text style={[styles.emptyActionText, typography.captionStrong]}>创建第一个目标</Text>
            </Pressable>
          </View>
        )}
        <View style={styles.card}>
          <Text style={[styles.goalName, typography.sectionTitle]}>{suggestion.title}</Text>
          <Text style={[styles.goalHint, typography.body]}>{suggestion.hint}</Text>
        </View>
      </ScrollView>

      <Modal visible={editorVisible} transparent animationType="slide" onRequestClose={closeEditor}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeEditor} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={[styles.sheetTitle, typography.title]}>{isEditing ? '编辑目标' : '新增目标'}</Text>
            <Text style={[styles.sheetSubtitle, typography.body]}>先填名字和目标金额，当前进度会按现有结余估算。</Text>
            <TextInput
              placeholder="比如：旅行基金"
              placeholderTextColor="#94A3B8"
              style={[styles.input, typography.body]}
              value={form.name}
              onChangeText={(name) => setForm((current) => ({ ...current, name }))}
              editable={!submitting}
              maxLength={12}
            />
            <TextInput
              placeholder="目标金额，比如：5000"
              placeholderTextColor="#94A3B8"
              style={[styles.input, typography.body]}
              value={form.target}
              onChangeText={(target) => setForm((current) => ({ ...current, target: target.replace(/[^0-9.]/g, '') }))}
              keyboardType="decimal-pad"
              editable={!submitting}
            />
            {status ? <Text style={[styles.statusText, typography.caption]}>{status}</Text> : null}
            <View style={styles.sheetActions}>
              <Pressable style={styles.secondaryButton} onPress={closeEditor} disabled={submitting}>
                <Text style={[styles.secondaryButtonText, typography.captionStrong]}>取消</Text>
              </Pressable>
              <Pressable style={[styles.confirmButton, submitting && styles.confirmButtonDisabled]} onPress={() => void handleSubmit()} disabled={submitting}>
                {submitting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={[styles.confirmText, typography.captionStrong]}>{isEditing ? '保存' : '新增'}</Text>}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.gap,
  },
  headerCopy: { flex: 1 },
  title: { color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, marginTop: 4 },
  addButton: {
    backgroundColor: colors.textPrimary,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addButtonText: { color: '#FFFFFF' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.74)',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.card,
  },
  cardCompleted: {
    borderColor: 'rgba(34,197,94,0.24)',
    backgroundColor: 'rgba(240,253,244,0.9)',
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.gap,
  },
  goalCopy: { flex: 1 },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  goalActions: {
    flexDirection: 'row',
    gap: 14,
  },
  goalName: { color: colors.textPrimary },
  goalAmount: { marginTop: 8, color: colors.textSecondary },
  goalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
  },
  goalBadgeCompleted: {
    backgroundColor: 'rgba(34,197,94,0.14)',
  },
  goalBadgeText: {
    color: colors.accent,
  },
  goalBadgeTextCompleted: {
    color: '#15803D',
  },
  goalAction: { color: colors.accent },
  goalDelete: { color: '#DC2626' },
  actionDisabled: { opacity: 0.45 },
  track: {
    height: 10,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    marginTop: 14,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
  },
  fillCompleted: {
    backgroundColor: '#22C55E',
  },
  goalEta: { marginTop: 12, color: colors.textSecondary },
  goalEtaCompleted: {
    color: '#15803D',
  },
  goalHint: { marginTop: 10, color: colors.textSecondary },
  emptyAction: {
    marginTop: 14,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.textPrimary,
  },
  emptyActionText: {
    color: '#FFFFFF',
  },
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
    paddingBottom: 28,
    gap: spacing.gap,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(148,163,184,0.5)',
    alignSelf: 'center',
    marginBottom: 6,
  },
  sheetTitle: { color: colors.textPrimary },
  sheetSubtitle: { color: colors.textSecondary },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.textPrimary,
  },
  statusText: { color: colors.textSecondary },
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 6,
  },
  secondaryButton: {
    minWidth: 88,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  secondaryButtonText: { color: colors.textPrimary },
  confirmButton: {
    minWidth: 88,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.72,
  },
  confirmText: { color: '#FFFFFF' },
})
