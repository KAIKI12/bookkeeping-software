import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useUIPreferences } from '../hooks/use-ui-preferences'
import { colors, radii, shadows, spacing } from '../theme/tokens'

type TabKey = 'ledger' | 'analytics' | 'goals' | 'mine'

const tabs: { key: TabKey; label: string; icon: string }[] = [
  { key: 'ledger', label: '记账', icon: '⌂' },
  { key: 'analytics', label: '统计', icon: '◔' },
  { key: 'goals', label: '目标', icon: '◉' },
  { key: 'mine', label: '我的', icon: '☻' },
]

export function TabBar({ activeTab, onTabChange, onOpenComposer }: {
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
  onOpenComposer: () => void
}) {
  const { typography } = useUIPreferences()

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {tabs.slice(0, 2).map((tab) => (
          <Pressable key={tab.key} style={styles.tab} onPress={() => onTabChange(tab.key)}>
            <Text style={[styles.icon, activeTab === tab.key && styles.iconActive]}>{tab.icon}</Text>
            <Text style={[styles.label, typography.tabLabel, activeTab === tab.key && styles.labelActive]} numberOfLines={1}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
        <View style={styles.centerSpace} />
        {tabs.slice(2).map((tab) => (
          <Pressable key={tab.key} style={styles.tab} onPress={() => onTabChange(tab.key)}>
            <Text style={[styles.icon, activeTab === tab.key && styles.iconActive]}>{tab.icon}</Text>
            <Text style={[styles.label, typography.tabLabel, activeTab === tab.key && styles.labelActive]} numberOfLines={1}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Pressable style={styles.fab} onPress={onOpenComposer}>
        <Text style={styles.fabPlus}>＋</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: spacing.page,
    right: spacing.page,
    bottom: 24,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: radii.xl,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.floating,
  },
  tab: {
    width: 58,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  centerSpace: {
    width: 84,
  },
  icon: {
    fontSize: 18,
    color: '#94A3B8',
  },
  iconActive: {
    color: colors.textPrimary,
  },
  label: {
    color: '#94A3B8',
  },
  labelActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.fab,
  },
  fabPlus: {
    color: '#FFFFFF',
    fontSize: 30,
    marginTop: -2,
  },
})
