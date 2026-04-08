import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
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

export function GoalsScreen({
  goals,
  suggestion,
}: {
  goals: GoalSummary[]
  suggestion: GoalSuggestion
}) {
  const { typography } = useUIPreferences()

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, typography.hero]}>目标</Text>
      <Text style={[styles.subtitle, typography.body]}>把攒钱这件事看得更具体一点</Text>
      {goals.map((goal) => {
        const progress = Math.min(goal.current / goal.target, 1)
        return (
          <View key={goal.id} style={styles.card}>
            <Text style={[styles.goalName, typography.sectionTitle]}>{goal.name}</Text>
            <Text style={[styles.goalAmount, typography.body]}>{`¥${goal.current} / ¥${goal.target}`}</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={[styles.goalEta, typography.caption]}>{goal.eta}</Text>
          </View>
        )
      })}
      <View style={styles.card}>
        <Text style={[styles.goalName, typography.sectionTitle]}>{suggestion.title}</Text>
        <Text style={[styles.goalHint, typography.body]}>{suggestion.hint}</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: spacing.page, paddingTop: spacing.pageTop, paddingBottom: spacing.pageBottom, gap: spacing.gapLoose },
  title: { color: colors.textPrimary },
  subtitle: { color: colors.textSecondary },
  card: {
    backgroundColor: 'rgba(255,255,255,0.74)',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.card,
  },
  goalName: { color: colors.textPrimary },
  goalAmount: { marginTop: 8, color: colors.textSecondary },
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
  goalEta: { marginTop: 12, color: colors.textSecondary },
  goalHint: { marginTop: 10, color: colors.textSecondary },
})
