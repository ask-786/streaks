import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useAttendanceStore } from '../store/attendanceStore';
import { TaskSequenceEditor } from '../components/TaskSequenceEditor';
import { Colors, Spacing, Typography, BorderRadius } from '../constants';
import { useTheme } from '../hooks/useTheme';
import { to12h, to24h, isValidTime12h, todayStr, formatTime12h } from '../utils/dateUtils';

export const ActivitySettingsScreen: React.FC = () => {
  const { colors } = useTheme();
  const {
    selectedActivityId,
    activities,
    editActivity,
    resetActivityData,
    appendNote,
  } = useAttendanceStore();

  const selectedActivity = activities.find(a => a.id === selectedActivityId);

  const [timeBoundStartTime, setTimeBoundStartTime] = useState(() => to12h(selectedActivity?.timeBoundStartTime || '').time);
  const [startAmPm, setStartAmPm] = useState<'AM' | 'PM'>(() => to12h(selectedActivity?.timeBoundStartTime || '').ampm);
  const [timeBoundEndTime, setTimeBoundEndTime] = useState(() => to12h(selectedActivity?.timeBoundEndTime || '').time);
  const [endAmPm, setEndAmPm] = useState<'AM' | 'PM'>(() => to12h(selectedActivity?.timeBoundEndTime || '').ampm);

  const timeBoundType = selectedActivity?.timeBoundType;

  const isTimeOrderValid = !timeBoundType || timeBoundType !== 'between' || (
    isValidTime12h(timeBoundStartTime) && isValidTime12h(timeBoundEndTime) &&
    to24h(timeBoundStartTime, startAmPm) < to24h(timeBoundEndTime, endAmPm)
  );

  const isTimeValid = !timeBoundType || (
    timeBoundType === 'between'
      ? isValidTime12h(timeBoundStartTime) && isValidTime12h(timeBoundEndTime) && isTimeOrderValid
      : isValidTime12h(timeBoundStartTime)
  );

  const timeOrderInvalid = timeBoundType === 'between' && 
    isValidTime12h(timeBoundStartTime) && isValidTime12h(timeBoundEndTime) && 
    to24h(timeBoundStartTime, startAmPm) >= to24h(timeBoundEndTime, endAmPm);

  const startInvalid = (timeBoundStartTime.length > 0 && !isValidTime12h(timeBoundStartTime)) || timeOrderInvalid;
  const endInvalid = (timeBoundType === 'between' && timeBoundEndTime.length > 0 && !isValidTime12h(timeBoundEndTime)) || timeOrderInvalid;

  const hasUnsavedTimeChanges = () => {
    if (!selectedActivity || !timeBoundType) return false;
    if (to24h(timeBoundStartTime, startAmPm) !== (selectedActivity.timeBoundStartTime || '')) return true;
    if (timeBoundType === 'between' && to24h(timeBoundEndTime, endAmPm) !== (selectedActivity.timeBoundEndTime || '')) return true;
    return false;
  };

  const handleSaveTimeBound = async () => {
    if (!selectedActivityId || !selectedActivity || !timeBoundType) return;
    if (!isTimeValid) return;

    const newStart = to24h(timeBoundStartTime, startAmPm);
    const newEnd = timeBoundType === 'between' ? to24h(timeBoundEndTime, endAmPm) : null;

    let oldDesc = '';
    if (timeBoundType === 'between') {
      oldDesc = `${formatTime12h(selectedActivity.timeBoundStartTime || '')} - ${formatTime12h(selectedActivity.timeBoundEndTime || '')}`;
    } else {
      oldDesc = `${formatTime12h(selectedActivity.timeBoundStartTime || '')}`;
    }

    let newDesc = '';
    if (timeBoundType === 'between') {
      newDesc = `${formatTime12h(newStart)} - ${formatTime12h(newEnd || '')}`;
    } else {
      newDesc = `${formatTime12h(newStart)}`;
    }

    const noteText = `Time constraint changed from ${oldDesc} to ${newDesc}`;

    await editActivity(
      selectedActivityId,
      selectedActivity.name,
      selectedActivity.requiresNote,
      selectedActivity.weeklyGoal,
      selectedActivity.taskSequence,
      selectedActivity.sequenceStartDate,
      selectedActivity.sequenceMode,
      timeBoundType,
      newStart,
      newEnd ?? undefined
    );
    await appendNote(selectedActivityId, todayStr(), noteText);
  };

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

      {/* Time Bound Section */}
      {selectedActivity.timeBoundType && (
        <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, { backgroundColor: colors.primaryContainer }]}>
              <FontAwesome5 name="clock" size={14} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Time Constraint
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Log {selectedActivity.timeBoundType} specific time
              </Text>
            </View>
          </View>

          <View style={[styles.editorCard, { backgroundColor: colors.surface }]}>
            {/* Start time row */}
            <View style={styles.timeFieldGroup}>
              <Text style={[styles.timeFieldLabel, { color: colors.textSecondary }]}>
                {timeBoundType === 'between' ? 'Start Time' : 'Time'}
              </Text>
              <View style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.background,
                  borderColor: startInvalid ? Colors.error : colors.surfaceVariant,
                }
              ]}>
                <TextInput
                  style={[styles.input, { flex: 1, color: startInvalid ? Colors.error : colors.textPrimary }]}
                  placeholder="HH:MM"
                  placeholderTextColor={Colors.textDisabled}
                  value={timeBoundStartTime}
                  onChangeText={setTimeBoundStartTime}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
                <TouchableOpacity
                  style={[styles.amPmToggle, {
                    backgroundColor: startAmPm === 'AM' ? colors.surfaceVariant : colors.primaryContainer,
                  }]}
                  onPress={() => setStartAmPm(startAmPm === 'AM' ? 'PM' : 'AM')}
                >
                  <Text style={[styles.amPmText, { color: startAmPm === 'PM' ? Colors.primary : colors.textPrimary }]}>
                    {startAmPm}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* End time row — only for 'between' type */}
            {timeBoundType === 'between' && (
              <View style={[styles.timeFieldGroup, { marginTop: Spacing.md }]}>
                <Text style={[styles.timeFieldLabel, { color: colors.textSecondary }]}>End Time</Text>
                <View style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.background,
                    borderColor: endInvalid ? Colors.error : colors.surfaceVariant,
                  }
                ]}>
                  <TextInput
                    style={[styles.input, { flex: 1, color: endInvalid ? Colors.error : colors.textPrimary }]}
                    placeholder="HH:MM"
                    placeholderTextColor={Colors.textDisabled}
                    value={timeBoundEndTime}
                    onChangeText={setTimeBoundEndTime}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                  <TouchableOpacity
                    style={[styles.amPmToggle, {
                      backgroundColor: endAmPm === 'AM' ? colors.surfaceVariant : colors.primaryContainer,
                    }]}
                    onPress={() => setEndAmPm(endAmPm === 'AM' ? 'PM' : 'AM')}
                  >
                    <Text style={[styles.amPmText, { color: endAmPm === 'PM' ? Colors.primary : colors.textPrimary }]}>
                      {endAmPm}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Validation error hint */}
            {timeOrderInvalid && (
              <Text style={[styles.errorHint, { color: Colors.error }]}>
                End time must be after start time
              </Text>
            )}

            {/* Save button — only appears when there are unsaved changes */}
            {hasUnsavedTimeChanges() && (
              <View style={styles.saveActionRow}>
                <TouchableOpacity
                  style={[styles.btnSave, !isTimeValid && styles.btnSaveDisabled]}
                  onPress={handleSaveTimeBound}
                  disabled={!isTimeValid}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnSaveText}>Save Times</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Animated.View>
      )}

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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  timeFieldGroup: {
    gap: Spacing.xs,
  },
  timeFieldLabel: {
    ...Typography.labelMedium,
    fontWeight: '600',
    marginLeft: 2,
  },
  errorHint: {
    ...Typography.bodySmall,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  input: {
    ...Typography.bodyMedium,
  },
  amPmToggle: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  amPmText: {
    ...Typography.labelMedium,
    fontWeight: '700',
  },
  saveActionRow: {
    marginTop: Spacing.md,
    alignItems: 'flex-end',
  },
  btnSave: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  btnSaveDisabled: {
    backgroundColor: Colors.textDisabled,
  },
  btnSaveText: {
    ...Typography.labelMedium,
    color: '#FFF',
    fontWeight: '700',
  },
});
