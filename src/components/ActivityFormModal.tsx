import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Switch,
  ScrollView,
} from 'react-native';
import { Text } from 'react-native-paper';
import Animated, {
  FadeIn,
  SlideInDown,
  SlideOutDown,
  Easing,
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius } from '../constants';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { TaskSequenceEditor } from './TaskSequenceEditor';

export interface ActivityFormModalProps {
  visible: boolean;
  editingItemId: string | null;
  initialName: string;
  initialRequiresNote?: boolean;
  initialWeeklyGoal?: number;
  initialTaskSequence?: string[];
  initialSequenceMode?: 'calendar' | 'log';
  onClose: () => void;
  onSave: (
    name: string,
    requiresNote: boolean,
    weeklyGoal?: number,
    taskSequence?: string[],
    sequenceMode?: 'calendar' | 'log',
  ) => void;
}

const GOAL_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

export const ActivityFormModal: React.FC<ActivityFormModalProps> = ({
  visible,
  editingItemId,
  initialName,
  initialRequiresNote = false,
  initialWeeklyGoal,
  initialTaskSequence,
  initialSequenceMode,
  onClose,
  onSave,
}) => {
  const { colors, isDark } = useTheme();
  const [name, setName] = useState('');
  const [requiresNote, setRequiresNote] = useState(false);
  const [weeklyModeEnabled, setWeeklyModeEnabled] = useState(false);
  const [weeklyGoal, setWeeklyGoal] = useState(3);
  const [taskSeqEnabled, setTaskSeqEnabled] = useState(false);
  const [tasks, setTasks] = useState<string[]>([]);
  const [sequenceMode, setSequenceMode] = useState<'calendar' | 'log'>('calendar');
  const inputRef = useRef<TextInput>(null);

  const pickerHeight = useSharedValue(0);
  const pickerOpacity = useSharedValue(0);
  const taskSeqHeight = useSharedValue(0);
  const taskSeqOpacity = useSharedValue(0);

  const pickerStyle = useAnimatedStyle(() => ({
    height: pickerHeight.value,
    opacity: pickerOpacity.value,
    overflow: 'hidden',
  }));

  const taskSeqStyle = useAnimatedStyle(() => ({
    maxHeight: taskSeqHeight.value,
    opacity: taskSeqOpacity.value,
    overflow: 'hidden',
  }));

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setRequiresNote(initialRequiresNote);
      const hasGoal = !!initialWeeklyGoal && initialWeeklyGoal > 0;
      setWeeklyModeEnabled(hasGoal);
      setWeeklyGoal(initialWeeklyGoal && initialWeeklyGoal > 0 ? initialWeeklyGoal : 3);
      // Task sequence
      const hasTasks = !!initialTaskSequence && initialTaskSequence.length > 0;
      setTaskSeqEnabled(hasTasks);
      setTasks(initialTaskSequence ?? []);
      setSequenceMode(initialSequenceMode ?? 'calendar');
      // Animate pickers to correct state immediately (no animation on open)
      pickerHeight.value = hasGoal ? 60 : 0;
      pickerOpacity.value = hasGoal ? 1 : 0;
      taskSeqHeight.value = hasTasks ? 1200 : 0;
      taskSeqOpacity.value = hasTasks ? 1 : 0;
    }
  }, [visible, initialName, initialRequiresNote, initialWeeklyGoal, initialTaskSequence, initialSequenceMode]);

  const handleWeeklyToggle = (val: boolean) => {
    setWeeklyModeEnabled(val);
    pickerHeight.value = withTiming(val ? 60 : 0, { duration: 250 });
    pickerOpacity.value = withTiming(val ? 1 : 0, { duration: 200 });
  };

  const handleTaskSeqToggle = (val: boolean) => {
    setTaskSeqEnabled(val);
    taskSeqHeight.value = withTiming(val ? 1200 : 0, { duration: 300 });
    taskSeqOpacity.value = withTiming(val ? 1 : 0, { duration: 250 });
    if (!val) setTasks([]);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(
      name.trim(),
      requiresNote,
      weeklyModeEnabled ? weeklyGoal : undefined,
      taskSeqEnabled && tasks.length > 0 ? tasks : [],
      taskSeqEnabled && tasks.length > 0 ? sequenceMode : undefined,
    );
  };

  const isEditing = !!editingItemId;
  const canSave = name.trim().length > 0;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View entering={FadeIn.duration(120)} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kavWrapper}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <Animated.View
          entering={SlideInDown.duration(200).easing(Easing.out(Easing.cubic))}
          exiting={SlideOutDown.duration(150).easing(Easing.in(Easing.cubic))}
          style={[styles.sheet, { backgroundColor: colors.surface }]}
        >
          {/* Handle bar */}
          <View style={[styles.handleBar, { backgroundColor: colors.surfaceVariant }]} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
          {/* Title */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {isEditing ? 'Edit Habit' : 'New Habit'}
          </Text>

          {/* Subtitle */}
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isEditing
              ? 'Update the settings of your habit'
              : 'Give your habit a clear, motivating name'}
          </Text>

          {/* Input */}
          <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.surfaceVariant }]}>
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="e.g., Read 10 pages"
              placeholderTextColor={Colors.textDisabled}
              value={name}
              onChangeText={setName}
              onSubmitEditing={handleSave}
              autoFocus
              maxLength={40}
              returnKeyType="done"
              selectionColor={Colors.primary}
            />
            {name.length > 0 && (
              <TouchableOpacity onPress={() => setName('')} style={styles.clearBtn} hitSlop={8}>
                <FontAwesome5 name="times" size={14} color={Colors.textDisabled} />
              </TouchableOpacity>
            )}
          </View>

          {/* Character count */}
          <Text style={[styles.charCount, { color: colors.textSecondary }]}>
            {name.length}/40
          </Text>

          {/* ── Weekly Goal Mode toggle ────────────────────────── */}
          <View style={[styles.toggleRow, {
            backgroundColor: weeklyModeEnabled
              ? (isDark ? Colors.dark?.primaryContainer ?? '#1E1B4B' : '#EEF2FF')
              : colors.background,
            borderColor: weeklyModeEnabled ? Colors.primary : colors.surfaceVariant,
          }]}>
            <View style={[styles.toggleIconWrap, {
              backgroundColor: weeklyModeEnabled
                ? (isDark ? Colors.dark?.primaryContainer ?? '#1E1B4B' : Colors.primaryContainer)
                : colors.surfaceVariant,
            }]}>
              <FontAwesome5
                name="calendar-check"
                size={14}
                color={weeklyModeEnabled ? Colors.primary : colors.textSecondary}
              />
            </View>
            <View style={styles.toggleTextWrap}>
              <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                Weekly Goal Mode
              </Text>
              <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>
                {weeklyModeEnabled
                  ? `Streak counts weeks you hit ${weeklyGoal}x`
                  : 'Track streaks by consecutive days'}
              </Text>
            </View>
            <Switch
              value={weeklyModeEnabled}
              onValueChange={handleWeeklyToggle}
              trackColor={{ false: colors.surfaceVariant, true: Colors.primaryContainer }}
              thumbColor={weeklyModeEnabled ? Colors.primary : colors.textSecondary}
            />
          </View>

          {/* Goal picker — animates in/out */}
          <Animated.View style={pickerStyle}>
            <View style={[styles.goalPicker, { backgroundColor: colors.background, borderColor: colors.surfaceVariant }]}>
              <Text style={[styles.goalPickerLabel, { color: colors.textSecondary }]}>
                Sessions per week
              </Text>
              <View style={styles.goalOptions}>
                {GOAL_OPTIONS.map(n => (
                  <TouchableOpacity
                    key={n}
                    style={[
                      styles.goalOption,
                      {
                        backgroundColor: weeklyGoal === n
                          ? Colors.primary
                          : colors.surfaceVariant,
                      },
                    ]}
                    onPress={() => setWeeklyGoal(n)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.goalOptionText,
                      { color: weeklyGoal === n ? '#FFFFFF' : colors.textSecondary },
                    ]}>
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Animated.View>

          {/* Require note toggle */}
          <View style={[styles.toggleRow, { backgroundColor: colors.background, borderColor: colors.surfaceVariant, marginBottom: Spacing.sm }]}>
            <View style={[styles.toggleIconWrap, { backgroundColor: requiresNote ? (isDark ? Colors.dark?.primaryContainer ?? '#1E1B4B' : Colors.primaryContainer) : colors.surfaceVariant }]}>
              <FontAwesome5
                name="sticky-note"
                size={14}
                color={requiresNote ? Colors.primary : colors.textSecondary}
              />
            </View>
            <View style={styles.toggleTextWrap}>
              <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                Require a note when logging
              </Text>
              <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>
                You'll need to add a note each time you log
              </Text>
            </View>
            <Switch
              value={requiresNote}
              onValueChange={setRequiresNote}
              trackColor={{ false: colors.surfaceVariant, true: Colors.primaryContainer }}
              thumbColor={requiresNote ? Colors.primary : colors.textSecondary}
            />
          </View>

          {/* ── Task Sequence toggle ───────────────────────────────────────── */}
          <View style={[styles.toggleRow, {
            backgroundColor: taskSeqEnabled
              ? (isDark ? Colors.dark?.primaryContainer ?? '#1E1B4B' : '#EEF2FF')
              : colors.background,
            borderColor: taskSeqEnabled ? Colors.primary : colors.surfaceVariant,
            marginBottom: Spacing.sm,
          }]}>
            <View style={[styles.toggleIconWrap, {
              backgroundColor: taskSeqEnabled
                ? (isDark ? Colors.dark?.primaryContainer ?? '#1E1B4B' : Colors.primaryContainer)
                : colors.surfaceVariant,
            }]}>
              <FontAwesome5
                name="list-ol"
                size={13}
                color={taskSeqEnabled ? Colors.primary : colors.textSecondary}
              />
            </View>
            <View style={styles.toggleTextWrap}>
              <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                Task Sequence
              </Text>
              <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>
                {taskSeqEnabled
                  ? `${tasks.length} task${tasks.length !== 1 ? 's' : ''} · rotates daily`
                  : 'Show a different task each day'}
              </Text>
            </View>
            <Switch
              value={taskSeqEnabled}
              onValueChange={handleTaskSeqToggle}
              trackColor={{ false: colors.surfaceVariant, true: Colors.primaryContainer }}
              thumbColor={taskSeqEnabled ? Colors.primary : colors.textSecondary}
            />
          </View>

          {/* Task sequence editor — animates open */}
          <Animated.View style={taskSeqStyle}>
            {/* Advancement mode picker */}
            <View style={[styles.modePickerRow, { backgroundColor: colors.background, borderColor: colors.surfaceVariant }]}>
              <Text style={[styles.modePickerLabel, { color: colors.textSecondary }]}>Advance by</Text>
              <View style={styles.modePills}>
                {(['calendar', 'log'] as const).map(mode => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.modePill,
                      { backgroundColor: sequenceMode === mode ? Colors.primary : colors.surfaceVariant },
                    ]}
                    onPress={() => setSequenceMode(mode)}
                    activeOpacity={0.75}
                  >
                    <FontAwesome5
                      name={mode === 'calendar' ? 'calendar-day' : 'check-square'}
                      size={11}
                      color={sequenceMode === mode ? '#fff' : colors.textSecondary}
                    />
                    <Text style={[
                      styles.modePillText,
                      { color: sequenceMode === mode ? '#fff' : colors.textSecondary },
                    ]}>
                      {mode === 'calendar' ? 'Calendar day' : 'Log count'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <Text style={[styles.modeHint, { color: colors.textSecondary }]}>
              {sequenceMode === 'calendar'
                ? 'Task advances every day, even if you skip.'
                : 'Task advances only after you log.'}
            </Text>

            {/* Editor */}
            <TaskSequenceEditor tasks={tasks} onChange={setTasks} />
            <View style={{ height: Spacing.md }} />
          </Animated.View>

          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btnCancel, { backgroundColor: colors.surfaceVariant }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.btnCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnSave, !canSave && styles.btnSaveDisabled]}
              onPress={handleSave}
              disabled={!canSave}
              activeOpacity={0.8}
            >
              <Text style={styles.btnSaveText}>{isEditing ? 'Save Changes' : 'Create Habit'}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  kavWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 16,
  },
  scrollContent: {
    paddingBottom: Spacing.sm,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
    marginTop: Spacing.xs,
  },
  title: {
    ...Typography.headlineLarge,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.bodyMedium,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
  input: {
    flex: 1,
    ...Typography.bodyLarge,
    paddingVertical: Spacing.md,
  },
  clearBtn: {
    paddingLeft: Spacing.sm,
  },
  charCount: {
    ...Typography.bodySmall,
    textAlign: 'right',
    marginBottom: Spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  toggleIconWrap: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTextWrap: {
    flex: 1,
  },
  toggleLabel: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  toggleSub: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  goalPicker: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  goalPickerLabel: {
    ...Typography.bodySmall,
    fontWeight: '600',
    flex: 1,
  },
  goalOptions: {
    flexDirection: 'row',
    gap: 4,
  },
  goalOption: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalOptionText: {
    ...Typography.labelMedium,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelText: {
    ...Typography.labelLarge,
    fontWeight: '600',
  },
  btnSave: {
    flex: 2,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSaveDisabled: {
    backgroundColor: Colors.textDisabled,
  },
  btnSaveText: {
    ...Typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // ── Task sequence mode picker ───────────────────────────────────────────────
  modePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  modePickerLabel: {
    ...Typography.bodySmall,
    fontWeight: '600',
    flex: 1,
  },
  modePills: {
    flexDirection: 'row',
    gap: 6,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  modePillText: {
    ...Typography.labelMedium,
    fontWeight: '600',
  },
  modeHint: {
    ...Typography.bodySmall,
    marginBottom: Spacing.sm,
    fontStyle: 'italic',
  },
});
