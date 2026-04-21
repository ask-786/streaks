import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableWithoutFeedback,
  TouchableOpacity,
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Activities'>;

export const ActivitiesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark, toggleTheme } = useTheme();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState<string>('');

  const { activities, createActivity, editActivity, deleteActivity, selectActivity, getActivityStats } = useAttendanceStore();
  const [editingRequiresNote, setEditingRequiresNote] = useState<boolean>(false);
  const [editingWeeklyGoal, setEditingWeeklyGoal] = useState<number | undefined>(undefined);

  const handleSaveActivity = (name: string, requiresNote: boolean, weeklyGoal?: number) => {
    if (editingItemId) {
      editActivity(editingItemId, name, requiresNote, weeklyGoal);
    } else {
      createActivity(name, requiresNote, weeklyGoal);
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
    setEditingItemId(id);
    setEditingItemName(currentName);
    setEditingRequiresNote(activity?.requiresNote ?? false);
    setEditingWeeklyGoal(activity?.weeklyGoal);
    setSelectedItemId(null);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setEditingItemId(null);
    setEditingItemName('');
    setEditingRequiresNote(false);
    setEditingWeeklyGoal(undefined);
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

        {/* Habit count pill */}
        {activities.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(50).springify()}
            style={styles.countPillWrapper}
          >
            <View style={[styles.countPill, { backgroundColor: colors.primaryContainer }]}>
              <Text style={[styles.countPillText, { color: Colors.primary }]}>
                {activities.length} habit{activities.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* List Section */}
        <Animated.FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
          ListEmptyComponent={
            <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.emptyContainer}>
              <FontAwesome5 name="seedling" size={48} color={colors.textSecondary} style={{ marginBottom: Spacing.md }} />
              <Text style={[styles.emptyText, { color: colors.textPrimary }]}>No habits yet</Text>
              <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
                Tap the + button to add your first habit and start building your streak!
              </Text>
            </Animated.View>
          }
        />

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
  themeToggleEmoji: {
    fontSize: 20,
  },
  countPillWrapper: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  countPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  countPillText: {
    ...Typography.labelMedium,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: Spacing.xxl * 2,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
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
});
