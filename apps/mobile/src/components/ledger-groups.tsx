import React, { useRef, useState } from 'react'
import { Animated, Dimensions, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native'
import { useUIPreferences } from '../hooks/use-ui-preferences'
import { colors, radii, shadows, spacing } from '../theme/tokens'

type LedgerItem = {
  id: string
  category: string
  note: string
  amount: number
  time: string
  tags: string[]
  source: 'manual' | 'voice' | 'chat' | 'import'
}

type LedgerGroup = {
  key: string
  date: string
  weekday: string
  income: number
  expense: number
  items: LedgerItem[]
}

function formatDateLabel(date: string) {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  if (date === yesterday) {
    return '昨天'
  }

  return date.slice(5).replace('-', '/')
}

function formatSourceLabel(source: 'manual' | 'voice' | 'chat' | 'import') {
  if (source === 'chat') {
    return 'AI'
  }

  if (source === 'voice') {
    return '语音'
  }

  if (source === 'import') {
    return '导入'
  }

  return '手动'
}

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const SWIPE_THRESHOLD = 72
const DELETE_BTN_WIDTH = 80

function SwipeableRow({
  item,
  index,
  totalItems,
  onPress,
  onDelete,
}: {
  item: LedgerItem
  index: number
  totalItems: number
  onPress: () => void
  onDelete: () => void
}) {
  const { typography } = useUIPreferences()
  const translateX = useRef(new Animated.Value(0)).current
  const [swiped, setSwiped] = useState(false)

  function handleSwipe(value: number) {
    if (value < -SWIPE_THRESHOLD) {
      Animated.spring(translateX, {
        toValue: -DELETE_BTN_WIDTH,
        useNativeDriver: true,
      }).start()
      setSwiped(true)
    } else {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start()
      setSwiped(false)
    }
  }

  function resetSwipe() {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start()
    setSwiped(false)
  }

  function handleDelete() {
    resetSwipe()
    onDelete()
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_: any, gestureState: { dx: number; dy: number }) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10
      },
      onPanResponderMove: (_: any, gestureState: { dx: number }) => {
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -DELETE_BTN_WIDTH))
        } else if (swiped && gestureState.dx > 0) {
          translateX.setValue(Math.max(-DELETE_BTN_WIDTH + gestureState.dx, -DELETE_BTN_WIDTH))
        }
      },
      onPanResponderRelease: (_: any, gestureState: { dx: number }) => {
        if (swiped && gestureState.dx > SWIPE_THRESHOLD / 2) {
          resetSwipe()
        } else {
          handleSwipe(gestureState.dx)
        }
      },
    }),
  ).current

  return (
    <View style={styles.swipeContainer}>
      <Animated.View
        style={[
          styles.swipeContent,
          {
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Pressable
          style={[styles.item, index !== totalItems - 1 && styles.itemBorder]}
          onPress={() => {
            if (swiped) {
              resetSwipe()
            } else {
              onPress()
            }
          }}
        >
          <View style={styles.itemLeft}>
            <Text style={[styles.category, typography.cardTitle]} numberOfLines={1}>{item.category}</Text>
            <Text style={[styles.note, typography.caption]} numberOfLines={2}>{item.note}</Text>
            {item.tags.length ? (
              <View style={styles.tagRow}>
                {item.tags.slice(0, 2).map((tag) => (
                  <View key={tag} style={styles.tagChip}>
                    <Text style={[styles.tagText, typography.footnote]}>#{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
          <View style={styles.itemRight}>
            <Text style={[styles.amount, typography.cardTitle, item.amount > 0 && styles.amountIncome]}>
              {item.amount > 0 ? '+' : '-'}¥{Math.abs(item.amount)}
            </Text>
            <Text style={[styles.time, typography.footnote]}>{item.time} · {formatSourceLabel(item.source)}</Text>
          </View>
        </Pressable>
      </Animated.View>
      {swiped ? (
        <Pressable style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteText}>删除</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

export function LedgerGroups({
  groups,
  onItemPress,
  onItemDelete,
}: {
  groups: LedgerGroup[]
  onItemPress?: (item: LedgerItem) => void
  onItemDelete?: (item: LedgerItem) => void
}) {
  const { typography } = useUIPreferences()

  return (
    <View style={styles.container}>
      {groups.map((group) => (
        <View key={group.key} style={styles.groupCard}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={[styles.date, typography.sectionTitle]}>{formatDateLabel(group.date)}</Text>
              <Text style={[styles.weekday, typography.caption]}>{group.weekday}</Text>
            </View>
            <View style={styles.summaryWrap}>
              <Text style={[styles.summaryText, typography.captionStrong]}>收 {group.income ? `¥${group.income}` : '—'}</Text>
              <Text style={[styles.summaryText, typography.captionStrong]}>支 ¥{group.expense}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          {group.items.map((item, index) => (
            <SwipeableRow
              key={item.id}
              item={item}
              index={index}
              totalItems={group.items.length}
              onPress={() => onItemPress?.(item)}
              onDelete={() => onItemDelete?.(item)}
            />
          ))}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.gapLoose,
    paddingBottom: spacing.pageBottom,
  },
  groupCard: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: radii.xl,
    padding: spacing.cardCompact,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.gap,
  },
  headerLeft: {
    flex: 1,
    gap: 4,
  },
  date: {
    color: colors.textPrimary,
  },
  weekday: {
    color: colors.textSecondary,
  },
  summaryWrap: {
    alignItems: 'flex-end',
    gap: 6,
    minWidth: 84,
  },
  summaryText: {
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 14,
  },
  swipeContainer: {
    position: 'relative',
  },
  swipeContent: {
    backgroundColor: 'transparent',
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.gap,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  itemLeft: {
    flex: 1,
    gap: 4,
    paddingRight: 8,
  },
  category: {
    color: colors.textPrimary,
  },
  note: {
    color: colors.textSecondary,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
  },
  tagText: {
    color: colors.accent,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 4,
    minWidth: 88,
  },
  amount: {
    color: colors.textPrimary,
  },
  amountIncome: {
    color: colors.income,
  },
  time: {
    color: colors.textSecondary,
  },
  deleteButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_BTN_WIDTH,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.md,
  },
  deleteText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
})
