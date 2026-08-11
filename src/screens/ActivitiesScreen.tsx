import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  StatusBar,
  BackHandler,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { FontAwesome5 } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAttendanceStore } from '../store/attendanceStore';
import {
  Typography,
  Spacing,
  BorderRadius,
  LongPressDelay,
  ScreenPadding,
  stagger,
} from '../constants';
import { ActivityCard } from '../components/ActivityCard';
import { ActivityFormModal } from '../components/ActivityFormModal';
import { useTheme } from '../hooks/useTheme';
import { todayStr } from '../utils/dateUtils';
import { haptics } from '../utils/haptics';
import {
  Card,
  EmptyState,
  IconButton,
  PressableScale,
  ScreenHeader,
  SegmentedControl,
  SelectionAction,
  SelectionActionBar,
  SelectionCheck,
} from '../components/ui';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Activities'>;

const TRAIL_DAYS = 7;

export const ActivitiesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark, elevation } = useTheme();
  const insets = useSafeAreaInsets();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  /** Ids picked in multi-select mode. Non-empty ⇒ the list is in that mode. */
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState<string>('');

  const {
    activities,
    logs,
    createActivity,
    editActivity,
    deleteActivities,
    completeActivities,
    selectActivity,
    getActivityStats,
  } = useAttendanceStore();

  const [editingRequiresNote, setEditingRequiresNote] = useState<boolean>(false);
  const [editingWeeklyGoal, setEditingWeeklyGoal] = useState<number | undefined>(undefined);
  const [editingTaskSequence, setEditingTaskSequence] = useState<string[]>([]);
  const [editingSequenceMode, setEditingSequenceMode] = useState<'calendar' | 'log' | undefined>(undefined);
  const [editingTimeBoundType, setEditingTimeBoundType] = useState<'before' | 'after' | 'between' | undefined>(undefined);
  const [editingTimeBoundStartTime, setEditingTimeBoundStartTime] = useState<string | undefined>(undefined);
  const [editingTimeBoundEndTime, setEditingTimeBoundEndTime] = useState<string | undefined>(undefined);
  const [editingActivityType, setEditingActivityType] = useState<'goal' | 'endless' | undefined>(undefined);
  const [editingStreakGoal, setEditingStreakGoal] = useState<number | undefined>(undefined);

  // Split active vs completed
  const activeActivities = activities.filter(a => !a.completedAt);
  const completedActivities = activities.filter(a => !!a.completedAt);

  // Selection never spans the two tabs — the actions that apply to a finished
  // habit are not the ones that apply to a running one.
  const visibleActivities = activeTab === 'active' ? activeActivities : completedActivities;
  const isSelecting = selectedIds.length > 0;
  const allSelected =
    visibleActivities.length > 0 && selectedIds.length === visibleActivities.length;

  /**
   * Last N days per activity, oldest → newest. Drives the trail on each card so
   * recent consistency is legible without opening the habit.
   */
  const trails = useMemo(() => {
    const today = dayjs(todayStr());
    const window = Array.from({ length: TRAIL_DAYS }, (_, i) =>
      today.subtract(TRAIL_DAYS - 1 - i, 'day').format('YYYY-MM-DD'),
    );
    const map: Record<string, boolean[]> = {};
    for (const activity of activities) {
      const dates = new Set((logs[activity.id] ?? []).map(e => e.date));
      map[activity.id] = window.map(d => dates.has(d));
    }
    return map;
  }, [activities, logs]);

  const handleSaveActivity = (
    name: string,
    requiresNote: boolean,
    weeklyGoal?: number,
    taskSequence?: string[],
    sequenceMode?: 'calendar' | 'log',
    timeBoundType?: 'before' | 'after' | 'between' | null,
    timeBoundStartTime?: string | null,
    timeBoundEndTime?: string | null,
    activityType?: 'goal' | 'endless',
    streakGoal?: number,
  ) => {
    if (editingItemId) {
      editActivity(editingItemId, name, requiresNote, weeklyGoal, taskSequence, undefined, sequenceMode, timeBoundType, timeBoundStartTime, timeBoundEndTime);
    } else {
      createActivity(name, requiresNote, weeklyGoal, taskSequence, undefined, sequenceMode, timeBoundType, timeBoundStartTime, timeBoundEndTime, activityType, streakGoal);
    }
    closeModal();
  };

  const openAddModal = () => {
    haptics.medium();
    setEditingItemId(null);
    setEditingItemName('');
    setSelectedIds([]);
    setIsModalVisible(true);
  };

  const openEditModal = (id: string) => {
    const activity = activities.find(a => a.id === id);
    if (!activity || activity.completedAt) return; // Completed habits are read-only
    setEditingItemId(id);
    setEditingItemName(activity.name);
    setEditingRequiresNote(activity?.requiresNote ?? false);
    setEditingWeeklyGoal(activity?.weeklyGoal);
    setEditingTaskSequence(activity?.taskSequence ?? []);
    setEditingSequenceMode(activity?.sequenceMode);
    setEditingTimeBoundType(activity?.timeBoundType);
    setEditingTimeBoundStartTime(activity?.timeBoundStartTime);
    setEditingTimeBoundEndTime(activity?.timeBoundEndTime);
    setEditingActivityType(activity?.activityType);
    setEditingStreakGoal(activity?.streakGoal);
    setSelectedIds([]);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setEditingItemId(null);
    setEditingItemName('');
    setEditingRequiresNote(false);
    setEditingWeeklyGoal(undefined);
    setEditingTaskSequence([]);
    setEditingSequenceMode(undefined);
    setEditingTimeBoundType(undefined);
    setEditingTimeBoundStartTime(undefined);
    setEditingTimeBoundEndTime(undefined);
    setEditingActivityType(undefined);
    setEditingStreakGoal(undefined);
  };

  const clearSelection = () => setSelectedIds([]);

  const toggleSelection = (id: string) => {
    haptics.selection();
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(existing => existing !== id) : [...prev, id],
    );
  };

  /**
   * One tap does one thing, and which thing depends on the mode the list is
   * already in: open the habit normally, pick it while selecting. Nothing is
   * ever swallowed to dismiss a hidden control.
   */
  const handleSelectActivity = (id: string) => {
    if (isSelecting) {
      toggleSelection(id);
      return;
    }
    selectActivity(id);
    navigation.navigate('ActivityDetail');
  };

  /** Long press is the way in to selection mode, from either tab. */
  const handleLongPress = (id: string) => {
    if (selectedIds.includes(id)) return; // already picked — leave it picked
    setSelectedIds(prev => [...prev, id]);
  };

  const handleTabChange = (tab: 'active' | 'completed') => {
    clearSelection();
    setActiveTab(tab);
  };

  const selectAll = () => setSelectedIds(visibleActivities.map(a => a.id));

  /**
   * Android back unwinds the screen's states in the order the user entered
   * them: selection first, then the Completed tab, and only then out of the app.
   *
   * Scoped to focus so it stops applying once a habit is opened, and registered
   * before any sheet's handler so an open sheet still wins.
   */
  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (isSelecting) {
          clearSelection();
          return true;
        }
        if (activeTab === 'completed') {
          setActiveTab('active');
          return true;
        }
        return false; // fall through to the default (leave the app)
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [activeTab, isSelecting]),
  );

  /** Names the current selection the way a sentence would. */
  const describeSelection = () => {
    if (selectedIds.length === 1) {
      const only = activities.find(a => a.id === selectedIds[0]);
      return `"${only?.name ?? 'This habit'}"`;
    }
    return `${selectedIds.length} habits`;
  };

  const confirmDelete = () => {
    const ids = [...selectedIds];
    const many = ids.length > 1;
    Alert.alert(
      many ? `Delete ${ids.length} habits` : 'Delete habit',
      `${describeSelection()} and all of ${many ? 'their' : 'its'} logged days will be permanently removed. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            haptics.error(); // permanent removal — distinct from an ordinary tap
            deleteActivities(ids);
            clearSelection();
          },
        },
      ],
    );
  };

  const confirmComplete = () => {
    const ids = [...selectedIds];
    const many = ids.length > 1;
    Alert.alert(
      many ? `Complete ${ids.length} habits` : 'Mark as completed',
      `${describeSelection()} will move to your completed list. You won't be able to log new check-ins, but every day you logged is preserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          style: 'default',
          onPress: () => {
            haptics.success();
            completeActivities(ids);
            clearSelection();
          },
        },
      ],
    );
  };

  /**
   * Edit stays a single-habit action — the form is one habit's settings — so it
   * is offered but disabled while more than one is picked, rather than
   * disappearing and leaving the user wondering where it went.
   */
  const selectionActions: SelectionAction[] =
    activeTab === 'active'
      ? [
          {
            icon: 'pen',
            label: 'Edit',
            tone: 'brand',
            disabled: selectedIds.length !== 1,
            onPress: () => openEditModal(selectedIds[0]),
          },
          { icon: 'trophy', label: 'Complete', onPress: confirmComplete },
          { icon: 'trash-alt', label: 'Delete', tone: 'danger', onPress: confirmDelete },
        ]
      : [{ icon: 'trash-alt', label: 'Delete', tone: 'danger', onPress: confirmDelete }];

  // Today's completion count across active habits — a one-glance daily summary.
  const doneToday = activeActivities.filter(a => {
    const s = getActivityStats(a.id);
    return s.unit === 'week' ? s.isThisWeekGoalMet : s.isTodayLogged;
  }).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + Spacing.md }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <View style={[styles.gutter, styles.header]}>
        {isSelecting ? (
          /* Selection takes over the masthead, so the count and the way out are
             the first things in the user's eye line. */
          <Animated.View
            entering={FadeIn.duration(160)}
            exiting={FadeOut.duration(120)}
            style={styles.selectionHeader}
          >
            <IconButton
              icon="times"
              onPress={clearSelection}
              accessibilityLabel="Cancel selection"
            />

            <View style={styles.selectionText}>
              <Text style={[styles.selectionCount, { color: colors.textPrimary }]}>
                {selectedIds.length} selected
              </Text>
              <Text style={[styles.selectionHint, { color: colors.textTertiary }]}>
                Tap habits to add or remove
              </Text>
            </View>

            <PressableScale
              onPress={allSelected ? clearSelection : selectAll}
              scaleTo={0.94}
              style={[styles.selectAll, { backgroundColor: colors.primaryMuted }]}
              accessibilityRole="button"
              accessibilityLabel={allSelected ? 'Deselect all habits' : 'Select all habits'}
            >
              <Text style={[styles.selectAllLabel, { color: colors.primary }]}>
                {allSelected ? 'Clear' : 'Select all'}
              </Text>
            </PressableScale>
          </Animated.View>
        ) : (
          <ScreenHeader
            eyebrow="Streaks"
            title="Your habits"
            subtitle={
              activeActivities.length === 0
                ? 'Add your first habit to get started'
                : `${doneToday} of ${activeActivities.length} done today`
            }
            action={
              <IconButton
                icon="cog"
                onPress={() => navigation.navigate('Settings')}
                accessibilityLabel="Open settings"
              />
            }
          />
        )}
      </View>

      {/* Tabs */}
      <Animated.View
        entering={FadeInDown.delay(40).springify()}
        style={[styles.gutter, styles.tabs]}
      >
        <SegmentedControl
          value={activeTab}
          onChange={handleTabChange}
          options={[
            { value: 'active', label: 'Active', icon: 'fire', count: activeActivities.length },
            { value: 'completed', label: 'Completed', icon: 'trophy', count: completedActivities.length },
          ]}
        />
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            // Leave room for whichever floating control is on screen.
            paddingBottom: Spacing.xxxl + insets.bottom + (isSelecting ? 80 : 40),
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 'active' ? (
          activeActivities.length > 0 ? (
            <>
              {/*
                A plain map, not a FlatList. A FlatList is a ScrollView
                internally and clips its children to its own bounds — which sit
                inside the screen gutter, exactly flush with the card edges — so
                every card's shadow was sliced off down both sides. (Nesting a
                VirtualizedList inside a ScrollView also disables virtualization
                and warns, so it was buying nothing here.)
              */}
              {activeActivities.map((item, index) => (
                <ActivityCard
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  stats={getActivityStats(item.id)}
                  index={index}
                  recentDays={trails[item.id]}
                  selectionMode={isSelecting}
                  isSelected={selectedIds.includes(item.id)}
                  onSelect={handleSelectActivity}
                  onLongPress={handleLongPress}
                />
              ))}
              {!isSelecting ? (
                <Text style={[styles.hint, { color: colors.textDisabled }]}>
                  Press and hold to select · tap to open
                </Text>
              ) : null}
            </>
          ) : (
            <EmptyState
              icon="seedling"
              title="No habits yet"
              description="Start with one small thing you can do every day. Consistency beats intensity."
              actionLabel="Add your first habit"
              onAction={openAddModal}
            />
          )
        ) : completedActivities.length > 0 ? (
          <>
            {completedActivities.map((item, index) => {
              const stats = getActivityStats(item.id);
              const isSelected = selectedIds.includes(item.id);
              return (
                <Animated.View
                  key={item.id}
                  entering={FadeInDown.delay(stagger(index)).springify()}
                  style={styles.completedWrapper}
                >
                  <PressableScale
                    onPress={() => {
                      if (isSelecting) {
                        toggleSelection(item.id);
                        return;
                      }
                      selectActivity(item.id);
                      navigation.navigate('ActivityDetail');
                    }}
                    onLongPress={() => handleLongPress(item.id)}
                    delayLongPress={LongPressDelay}
                    scaleTo={0.985}
                    haptic={!isSelecting}
                    accessibilityRole={isSelecting ? 'checkbox' : 'button'}
                    accessibilityState={isSelecting ? { checked: isSelected } : undefined}
                    accessibilityLabel={`${item.name}, completed`}
                    accessibilityHint={
                      isSelecting
                        ? 'Double tap to select or deselect this habit.'
                        : 'Opens this habit. Long press to select habits for deleting.'
                    }
                  >
                    <Card
                      elevation="low"
                      padding={Spacing.md}
                      style={
                        isSelected
                          ? {
                              borderColor: colors.primary,
                              borderWidth: 1.5,
                              backgroundColor: colors.primarySubtle,
                            }
                          : undefined
                      }
                    >
                      <View style={styles.completedRow}>
                        {isSelecting ? (
                          <SelectionCheck selected={isSelected} />
                        ) : (
                          <View
                            style={[
                              styles.trophy,
                              { backgroundColor: colors.warningMuted },
                            ]}
                          >
                            <FontAwesome5 name="trophy" size={16} color={colors.warning} />
                          </View>
                        )}

                        <View style={styles.completedInfo}>
                          <Text
                            style={[styles.completedName, { color: colors.textPrimary }]}
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                          <Text
                            style={[styles.completedMeta, { color: colors.textTertiary }]}
                            numberOfLines={1}
                          >
                            Best {stats.longestStreak}{' '}
                            {stats.unit === 'week' ? 'wks' : 'days'} · Finished{' '}
                            {dayjs(item.completedAt).format('MMM D, YYYY')}
                          </Text>
                        </View>

                        {!isSelecting ? (
                          <FontAwesome5
                            name="chevron-right"
                            size={12}
                            color={colors.textDisabled}
                          />
                        ) : null}
                      </View>
                    </Card>
                  </PressableScale>
                </Animated.View>
              );
            })}
            {!isSelecting ? (
              <Text style={[styles.hint, { color: colors.textDisabled }]}>
                Press and hold to select · tap to open
              </Text>
            ) : null}
          </>
        ) : (
          <EmptyState
            icon="trophy"
            title="Nothing finished yet"
            description="Habits you complete will be archived here with their final numbers intact."
          />
        )}
      </ScrollView>

      {isSelecting ? (
        <SelectionActionBar actions={selectionActions} bottomInset={insets.bottom} />
      ) : (
        /* Extended FAB — a labelled action is far clearer than a bare plus */
        <Animated.View
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(120)}
          style={[styles.fabWrapper, { bottom: Spacing.lg + insets.bottom }]}
        >
          <PressableScale
            onPress={openAddModal}
            haptic={false}
            scaleTo={0.94}
            style={[
              styles.fab,
              elevation.brandGlow(colors.primary),
              { backgroundColor: colors.primary },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Add a new habit"
          >
            <FontAwesome5 name="plus" size={14} color={colors.onPrimary} />
            <Text style={[styles.fabLabel, { color: colors.onPrimary }]}>New habit</Text>
          </PressableScale>
        </Animated.View>
      )}

      {/* Add/Edit Modal */}
      <ActivityFormModal
        visible={isModalVisible}
        editingItemId={editingItemId}
        initialName={editingItemName}
        initialRequiresNote={editingRequiresNote}
        initialWeeklyGoal={editingWeeklyGoal}
        initialTaskSequence={editingTaskSequence}
        initialSequenceMode={editingSequenceMode}
        initialTimeBoundType={editingTimeBoundType}
        initialTimeBoundStartTime={editingTimeBoundStartTime}
        initialTimeBoundEndTime={editingTimeBoundEndTime}
        initialActivityType={editingActivityType}
        initialStreakGoal={editingStreakGoal}
        onClose={closeModal}
        onSave={handleSaveActivity}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gutter: {
    paddingHorizontal: ScreenPadding,
  },
  header: {
    // Both mastheads reserve the same block, so entering selection mode swaps
    // the content without shunting the list up and down.
    minHeight: 72,
    justifyContent: 'center',
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  selectionText: {
    flex: 1,
  },
  selectionCount: {
    ...Typography.titleLarge,
    fontWeight: '700',
  },
  selectionHint: {
    ...Typography.caption,
    marginTop: 2,
  },
  selectAll: {
    paddingHorizontal: Spacing.md - 2,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
  },
  selectAllLabel: {
    ...Typography.labelMedium,
    fontWeight: '700',
  },
  tabs: {
    marginTop: Spacing.md + 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: ScreenPadding,
    paddingTop: Spacing.md,
  },
  hint: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  completedWrapper: {
    marginBottom: Spacing.sm + 2,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md - 2,
  },
  trophy: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedInfo: {
    flex: 1,
    gap: 3,
  },
  completedName: {
    ...Typography.titleLarge,
    fontWeight: '700',
  },
  completedMeta: {
    ...Typography.caption,
  },
  fabWrapper: {
    position: 'absolute',
    right: ScreenPadding,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.md - 2,
    borderRadius: BorderRadius.full,
  },
  fabLabel: {
    ...Typography.labelLarge,
    fontWeight: '700',
  },
});
