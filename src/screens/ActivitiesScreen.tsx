import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableWithoutFeedback,
  ScrollView,
  StatusBar,
  BackHandler,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FontAwesome5 } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAttendanceStore } from '../store/attendanceStore';
import {
  Typography,
  Spacing,
  BorderRadius,
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
} from '../components/ui';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Activities'>;

const TRAIL_DAYS = 7;

export const ActivitiesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark, elevation } = useTheme();
  const insets = useSafeAreaInsets();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState<string>('');

  const {
    activities,
    logs,
    createActivity,
    editActivity,
    deleteActivity,
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
    setSelectedItemId(null);
    setIsModalVisible(true);
  };

  const openEditModal = (id: string, currentName: string) => {
    const activity = activities.find(a => a.id === id);
    if (activity?.completedAt) return; // Don't allow editing completed activities
    setEditingItemId(id);
    setEditingItemName(currentName);
    setEditingRequiresNote(activity?.requiresNote ?? false);
    setEditingWeeklyGoal(activity?.weeklyGoal);
    setEditingTaskSequence(activity?.taskSequence ?? []);
    setEditingSequenceMode(activity?.sequenceMode);
    setEditingTimeBoundType(activity?.timeBoundType);
    setEditingTimeBoundStartTime(activity?.timeBoundStartTime);
    setEditingTimeBoundEndTime(activity?.timeBoundEndTime);
    setEditingActivityType(activity?.activityType);
    setEditingStreakGoal(activity?.streakGoal);
    setSelectedItemId(null);
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

  const handleSelectActivity = (id: string) => {
    // A revealed action rail swallows the next tap — that tap dismisses it.
    if (selectedItemId) {
      setSelectedItemId(null);
      return;
    }
    selectActivity(id);
    navigation.navigate('ActivityDetail');
  };

  const handleLongPress = (id: string) => {
    const activity = activities.find(a => a.id === id);
    if (activity?.completedAt) return; // No action menu for completed
    setSelectedItemId(id);
  };

  /**
   * Android back on the Completed tab returns to Active rather than leaving the
   * app. Active is the home state of this screen, so backing out of a tab should
   * undo that switch first — exiting straight to the launcher loses the user's
   * place for no reason.
   *
   * Scoped to focus so it stops applying once a habit is opened, and registered
   * before any sheet's handler so an open sheet still wins.
   */
  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (activeTab === 'completed') {
          setActiveTab('active');
          return true;
        }
        return false; // fall through to the default (leave the app)
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [activeTab]),
  );

  const confirmDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete habit',
      `"${name}" and all of its logged days will be permanently removed. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            haptics.error(); // permanent removal — distinct from an ordinary tap
            deleteActivity(id);
            setSelectedItemId(null);
          },
        },
      ],
    );
  };

  // Today's completion count across active habits — a one-glance daily summary.
  const doneToday = activeActivities.filter(a => {
    const s = getActivityStats(a.id);
    return s.unit === 'week' ? s.isThisWeekGoalMet : s.isTodayLogged;
  }).length;

  return (
    <TouchableWithoutFeedback onPress={() => setSelectedItemId(null)} accessible={false}>
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + Spacing.md }]}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />

        <View style={styles.gutter}>
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
        </View>

        {/* Tabs */}
        <Animated.View
          entering={FadeInDown.delay(40).springify()}
          style={[styles.gutter, styles.tabs]}
        >
          <SegmentedControl
            value={activeTab}
            onChange={setActiveTab}
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
            { paddingBottom: Spacing.xxxl + insets.bottom + 40 },
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
                    isSelectedForAction={selectedItemId === item.id}
                    onSelect={handleSelectActivity}
                    onLongPress={handleLongPress}
                    onEdit={openEditModal}
                    onDelete={confirmDelete}
                  />
                ))}
                <Text style={[styles.hint, { color: colors.textDisabled }]}>
                  Press and hold a habit to edit or delete it
                </Text>
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
            completedActivities.map((item, index) => {
              const stats = getActivityStats(item.id);
              return (
                <Animated.View
                  key={item.id}
                  entering={FadeInDown.delay(stagger(index)).springify()}
                  style={styles.completedWrapper}
                >
                  <PressableScale
                    onPress={() => {
                      selectActivity(item.id);
                      navigation.navigate('ActivityDetail');
                    }}
                    scaleTo={0.985}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.name}, completed`}
                  >
                    <Card elevation="low" padding={Spacing.md}>
                      <View style={styles.completedRow}>
                        <View
                          style={[
                            styles.trophy,
                            { backgroundColor: colors.warningMuted },
                          ]}
                        >
                          <FontAwesome5 name="trophy" size={16} color={colors.warning} />
                        </View>

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

                        <FontAwesome5
                          name="chevron-right"
                          size={12}
                          color={colors.textDisabled}
                        />
                      </View>
                    </Card>
                  </PressableScale>
                </Animated.View>
              );
            })
          ) : (
            <EmptyState
              icon="trophy"
              title="Nothing finished yet"
              description="Habits you complete will be archived here with their final numbers intact."
            />
          )}
        </ScrollView>

        {/* Extended FAB — a labelled action is far clearer than a bare plus */}
        <PressableScale
          onPress={openAddModal}
          haptic={false}
          scaleTo={0.94}
          style={[
            styles.fab,
            elevation.brandGlow(colors.primary),
            {
              backgroundColor: colors.primary,
              bottom: Spacing.lg + insets.bottom,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Add a new habit"
        >
          <FontAwesome5 name="plus" size={14} color={colors.onPrimary} />
          <Text style={[styles.fabLabel, { color: colors.onPrimary }]}>New habit</Text>
        </PressableScale>

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
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gutter: {
    paddingHorizontal: ScreenPadding,
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
  fab: {
    position: 'absolute',
    right: ScreenPadding,
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
