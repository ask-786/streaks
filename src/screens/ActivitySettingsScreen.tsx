import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useAttendanceStore } from '../store/attendanceStore';
import { TaskSequenceEditor } from '../components/TaskSequenceEditor';
import { Colors, Spacing, Typography, BorderRadius } from '../constants';
import { useTheme } from '../hooks/useTheme';

export const ActivitySettingsScreen: React.FC = () => {
  const { colors } = useTheme();
  const {
    selectedActivityId,
    activities,
    editActivity,
    resetActivityData,
  } = useAttendanceStore();

  const selectedActivity = activities.find(a => a.id === selectedActivityId);

  const handleTaskSequenceChange = (newTasks: string[]) => {
    if (selectedActivityId && selectedActivity) {
      editActivity(
        selectedActivityId,
        selectedActivity.name,
        selectedActivity.requiresNote,
        selectedActivity.weeklyGoal,
        newTasks,
        selectedActivity.sequenceStartDate,
        selectedActivity.sequenceMode || 'calendar'
      );
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Activity Data',
      'This will permanently delete all your logged days and streak history for this activity. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            if (selectedActivityId) resetActivityData(selectedActivityId);
          },
        },
      ]
    );
  };

  if (!selectedActivity) {
    return (
      <View style={[styles.emptyState, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No activity selected
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Task Sequence Section */}
      <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.section}>
        {/* Section header */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconWrap, { backgroundColor: colors.primaryContainer }]}>
            <FontAwesome5 name="list-ol" size={14} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Task Sequence
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Add, reorder, or edit tasks for this activity
            </Text>
          </View>
        </View>

        {/* Editor card */}
        <View style={[styles.editorCard, { backgroundColor: colors.surface }]}>
          <TaskSequenceEditor
            tasks={selectedActivity.taskSequence || []}
            onChange={handleTaskSequenceChange}
          />
        </View>
      </Animated.View>

      {/* Danger Zone */}
      <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconWrap, { backgroundColor: Colors.errorLight }]}>
            <FontAwesome5 name="exclamation-triangle" size={13} color={Colors.error} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Danger Zone
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Destructive actions — cannot be undone
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.dangerCard, { backgroundColor: colors.surface }]}
          onPress={handleReset}
          activeOpacity={0.75}
        >
          <View style={[styles.dangerIconWrap, { backgroundColor: Colors.errorLight }]}>
            <FontAwesome5 name="trash-alt" size={16} color={Colors.error} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.dangerLabel, { color: Colors.error }]}>
              Reset Activity Data
            </Text>
            <Text style={[styles.dangerSublabel, { color: colors.textSecondary }]}>
              Delete all logged days and streak history
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.error} style={{ opacity: 0.6 }} />
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  emptyText: {
    ...Typography.bodyMedium,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  sectionTitle: {
    ...Typography.titleMedium,
    fontWeight: '700',
  },
  sectionSubtitle: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  editorCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  dangerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  dangerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerLabel: {
    ...Typography.bodyLarge,
    fontWeight: '700',
  },
  dangerSublabel: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
});
