import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableWithoutFeedback,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Text, FAB } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAttendanceStore } from '../store/attendanceStore';
import { Colors, Typography, Spacing, BorderRadius } from '../constants';
import { ActivityCard } from '../components/ActivityCard';
import { ActivityFormModal } from '../components/ActivityFormModal';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import dayjs from 'dayjs';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Activities'>;

export const ActivitiesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState<string>('');

  const { activities, createActivity, editActivity, deleteActivity, selectActivity, getActivityStats } = useAttendanceStore();
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
    if (selectedItemId === id) {
      setSelectedItemId(null);
      return;
    }
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

  const confirmDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete Habit',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteActivity(id);
            setSelectedItemId(null);
          },
        },
      ]
    );
  };

  return (
    <TouchableWithoutFeedback onPress={() => setSelectedItemId(null)}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>

        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Your Habits</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {activities.length === 0
                ? 'Tap + to add your first habit'
                : 'Hold a card to edit or delete'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={[styles.themeToggle, { backgroundColor: colors.surfaceVariant }]}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="cog" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Tabs */}
        <Animated.View entering={FadeInDown.delay(20).springify()} style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              { backgroundColor: activeTab === 'active' ? colors.primaryContainer : 'transparent' }
            ]}
            onPress={() => setActiveTab('active')}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="fire" size={14} color={activeTab === 'active' ? Colors.primary : colors.textSecondary} />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'active' ? Colors.primary : colors.textSecondary, fontWeight: activeTab === 'active' ? '700' : '600' }
            ]}>
              Active ({activeActivities.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.tabButton,
              { backgroundColor: activeTab === 'completed' ? (isDark ? '#1A2A1A' : Colors.successLight) : 'transparent' }
            ]}
            onPress={() => setActiveTab('completed')}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="trophy" size={14} color={activeTab === 'completed' ? Colors.success : colors.textSecondary} />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'completed' ? Colors.success : colors.textSecondary, fontWeight: activeTab === 'completed' ? '700' : '600' }
            ]}>
              Completed ({completedActivities.length})
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Active Activities Section */}
          {activeTab === 'active' && (
            <>

              <Animated.FlatList
                data={activeActivities}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                itemLayoutAnimation={LinearTransition.springify()}
                renderItem={({ item, index }) => {
                  const stats = getActivityStats(item.id);
                  const isSelectedForAction = selectedItemId === item.id;
                  return (
                    <ActivityCard
                      id={item.id}
                      name={item.name}
                      stats={stats}
                      index={index}
                      isSelectedForAction={isSelectedForAction}
                      onSelect={handleSelectActivity}
                      onLongPress={handleLongPress}
                      onEdit={openEditModal}
                      onDelete={confirmDelete}
                    />
                  );
                }}
              />
            </>
          )}

          {/* Empty state when no active activities */}
          {activeTab === 'active' && activeActivities.length === 0 && (
            <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.emptyContainer}>
              <FontAwesome5 name="seedling" size={48} color={colors.textSecondary} style={{ marginBottom: Spacing.md }} />
              <Text style={[styles.emptyText, { color: colors.textPrimary }]}>No active habits</Text>
              <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
                Tap the + button to add your first habit and start building your streak!
              </Text>
            </Animated.View>
          )}

          {/* Completed Activities Section */}
          {activeTab === 'completed' && completedActivities.length > 0 && (
            <>
              {completedActivities.map((item, index) => {
                const stats = getActivityStats(item.id);
                return (
                  <Animated.View
                    key={item.id}
                    entering={FadeInDown.delay(120 + index * 40).springify()}
                  >
                    <TouchableOpacity
                      style={[styles.completedCard, { backgroundColor: colors.surface }]}
                      onPress={() => {
                        selectActivity(item.id);
                        navigation.navigate('ActivityDetail');
                      }}
                      activeOpacity={0.75}
                    >
                      {/* Trophy badge */}
                      <View style={[styles.completedBadgeWrap, { backgroundColor: isDark ? '#1A2A1A' : Colors.successLight }]}>
                        <FontAwesome5 name="trophy" size={18} color={Colors.success} />
                      </View>

                      <View style={styles.completedInfo}>
                        <Text style={[styles.completedName, { color: colors.textPrimary }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <View style={styles.completedMeta}>
                          <FontAwesome5 name="fire" size={10} color={colors.textSecondary} style={{ marginRight: 2 }} />
                          <Text style={[styles.completedMetaText, { color: colors.textSecondary }]} numberOfLines={1}>
                            Best: {stats.longestStreak} {stats.unit === 'week' ? 'wks' : 'days'}
                          </Text>
                          <View style={[styles.completedDot, { backgroundColor: colors.textSecondary }]} />
                          <Text style={[styles.completedMetaText, { color: colors.textSecondary, flex: 1 }]} numberOfLines={1}>
                            Completed {dayjs(item.completedAt).format('MMM D, YYYY')}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </>
          )}
          
          {/* Empty state when no completed activities */}
          {activeTab === 'completed' && completedActivities.length === 0 && (
            <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.emptyContainer}>
              <FontAwesome5 name="trophy" size={48} color={colors.surfaceVariant} style={{ marginBottom: Spacing.md }} />
              <Text style={[styles.emptyText, { color: colors.textPrimary }]}>No completed habits</Text>
              <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
                You haven't completed any habits yet. Keep working towards your goals!
              </Text>
            </Animated.View>
          )}

          <View style={{ height: Spacing.xxl * 3 }} />
        </ScrollView>

        {/* Floating Action Button */}
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: Colors.primary }]}
          onPress={openAddModal}
          color="#FFFFFF"
          customSize={58}
        />

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
    paddingTop: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    ...Typography.headlineLarge,
  },
  subtitle: {
    ...Typography.bodyMedium,
    marginTop: 4,
  },
  themeToggle: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.md,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: 'transparent', // Added for potential future borders if needed
  },
  tabText: {
    ...Typography.bodyMedium,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyText: {
    ...Typography.titleLarge,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptySubText: {
    ...Typography.bodyMedium,
    textAlign: 'center',
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.xl,
    borderRadius: BorderRadius.full,
  },
  // Completed card
  completedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  completedBadgeWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedInfo: {
    flex: 1,
    gap: 3,
  },
  completedName: {
    ...Typography.bodyLarge,
    fontWeight: '700',
  },
  completedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    flexWrap: 'nowrap',
  },
  completedMetaText: {
    ...Typography.bodySmall,
  },
  completedDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    opacity: 0.5,
  },
});
