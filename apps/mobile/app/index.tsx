import React, { useMemo, useState } from 'react'
import { SafeAreaView, StatusBar, StyleSheet, View } from 'react-native'
import { AnalyticsScreen } from '../src/components/analytics-screen'
import { ComposerScreen } from '../src/components/composer-screen'
import { GoalsScreen } from '../src/components/goals-screen'
import { LedgerScreen } from '../src/components/ledger-screen'
import { MineScreen } from '../src/components/mine-screen'
import { TabBar } from '../src/components/tab-bar'
import { useAIConfig } from '../src/hooks/use-ai-config'
import { useLedgerSettings } from '../src/hooks/use-ledger-settings'
import { UIPreferencesProvider } from '../src/hooks/use-ui-preferences'
import { useLedgerData } from '../src/hooks/use-ledger-data'
import { colors } from '../src/theme/tokens'

type TabKey = 'ledger' | 'analytics' | 'goals' | 'mine'
type SurfaceKey = 'tabs' | 'composer'

function getCurrentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function AppShell() {
  const [activeTab, setActiveTab] = useState<TabKey>('ledger')
  const [activeSurface, setActiveSurface] = useState<SurfaceKey>('tabs')
  const [composeEntryTab, setComposeEntryTab] = useState<TabKey>('ledger')
  const [ledgerDateFilter, setLedgerDateFilter] = useState<string | null>(null)
  const [analyticsMonth, setAnalyticsMonth] = useState<string | null>(null)
  const ledger = useLedgerData()
  const { config: aiConfig } = useAIConfig()
  const ledgerSettings = useLedgerSettings()

  const effectiveAnalyticsMonth = analyticsMonth ?? getCurrentMonthKey()
  const analyticsMonthData = useMemo(
    () => ledger.getMonthAnalytics(effectiveAnalyticsMonth),
    [ledger, effectiveAnalyticsMonth],
  )

  const filteredLedgerGroups = useMemo(() => {
    if (!ledgerDateFilter) {
      return ledger.groups
    }

    if (ledgerDateFilter.length === 7) {
      return ledger.groups.filter((group) => group.date.startsWith(ledgerDateFilter))
    }

    return ledger.groups.filter((group) => group.date === ledgerDateFilter)
  }, [ledger.groups, ledgerDateFilter])

  const filteredLedgerSummary = useMemo(() => {
    return filteredLedgerGroups.reduce(
      (accumulator, group) => ({
        income: accumulator.income + group.income,
        expense: accumulator.expense + group.expense,
        balance: accumulator.income + group.income - (accumulator.expense + group.expense),
      }),
      { income: 0, expense: 0, balance: 0 },
    )
  }, [filteredLedgerGroups])

  const ledgerMonthLabel = ledgerDateFilter?.length === 7 ? `${ledgerDateFilter.replace('-', '年')}月` : null
  const ledgerDayLabel = ledgerDateFilter?.length === 10 ? ledgerDateFilter.replace(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/, '$1年$2月$3日') : null

  const content = useMemo(() => {
    if (activeSurface === 'composer') {
      return (
        <ComposerScreen
          onBack={() => {
            setActiveTab(composeEntryTab)
            setActiveSurface('tabs')
          }}
          onSubmit={async (input) => {
            await ledger.addManualBill(input)
            setActiveTab('ledger')
            setActiveSurface('tabs')
          }}
          aiConfig={aiConfig}
          categories={ledgerSettings.categories}
          tags={ledgerSettings.tags}
          addCategory={ledgerSettings.addCategory}
          addTag={ledgerSettings.addTag}
          recentCategories={ledger.recentCategoryChoices}
          recentTags={ledger.recentTagChoices}
          latestPreset={ledger.latestBillPreset}
        />
      )
    }

    switch (activeTab) {
      case 'analytics':
        return (
          <AnalyticsScreen
            analytics={analyticsMonthData.analytics}
            dayGroups={analyticsMonthData.dayGroups}
            viewMonth={effectiveAnalyticsMonth}
            onViewMonthChange={setAnalyticsMonth}
          />
        )
      case 'goals':
        return (
          <GoalsScreen
            goals={ledger.goals}
            suggestion={ledger.goalSuggestion}
            addGoal={ledger.addGoal}
            updateGoal={ledger.updateGoal}
            removeGoal={ledger.removeGoal}
          />
        )
      case 'mine':
        return <MineScreen {...ledgerSettings} importBills={ledger.importBills} />
      case 'ledger':
      default:
        return (
          <LedgerScreen
            summary={filteredLedgerSummary}
            groups={filteredLedgerGroups}
            monthLabel={ledgerMonthLabel}
            dayLabel={ledgerDayLabel}
            categories={ledgerSettings.categories}
            updateBill={ledger.updateBill}
            removeBill={ledger.removeBill}
          />
        )
    }
  }, [
    activeSurface,
    activeTab,
    aiConfig,
    analyticsMonthData.analytics,
    analyticsMonthData.dayGroups,
    composeEntryTab,
    effectiveAnalyticsMonth,
    filteredLedgerGroups,
    filteredLedgerSummary,
    ledger.addGoal,
    ledger.addManualBill,
    ledger.goalSuggestion,
    ledger.goals,
    ledger.importBills,
    ledger.latestBillPreset,
    ledger.recentCategoryChoices,
    ledger.recentTagChoices,
    ledger.updateBill,
    ledger.removeBill,
    ledgerMonthLabel,
    ledgerDayLabel,
    ledgerSettings,
  ])

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.backgroundGlowTop} />
      <View style={styles.backgroundGlowBottom} />
      <View style={styles.container}>{content}</View>
      {activeSurface === 'tabs' ? (
        <TabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onOpenComposer={() => {
            setComposeEntryTab(activeTab)
            setActiveSurface('composer')
          }}
        />
      ) : null}
    </SafeAreaView>
  )
}

export default function App() {
  return (
    <UIPreferencesProvider>
      <AppShell />
    </UIPreferencesProvider>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  backgroundGlowTop: {
    position: 'absolute',
    top: -80,
    right: -30,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(99,102,241,0.10)',
  },
  backgroundGlowBottom: {
    position: 'absolute',
    bottom: 120,
    left: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(34,197,94,0.08)',
  },
})

