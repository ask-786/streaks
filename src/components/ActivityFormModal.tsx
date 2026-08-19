import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Platform,
  Pressable,
  Switch,
  ScrollView,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { Typography, Spacing, BorderRadius, HitSlop, alpha } from '../constants';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { TaskSequenceEditor } from './TaskSequenceEditor';
import { SequenceTask } from '../features/attendance/attendanceService';
import { to12h, to24h, isValidTime12h } from '../utils/dateUtils';
import { haptics } from '../utils/haptics';

export interface ActivityFormModalProps {
  visible: boolean;
  editingItemId: string | null;
  initialName: string;
  initialDescription?: string;
  initialRequiresNote?: boolean;
  initialWeeklyGoal?: number;
  initialTaskSequence?: SequenceTask[];
  initialSequenceMode?: 'calendar' | 'log';
  initialTimeBoundType?: 'before' | 'after' | 'between';
  initialTimeBoundStartTime?: string;
  initialTimeBoundEndTime?: string;
  initialActivityType?: 'goal' | 'endless';
  initialStreakGoal?: number;
  onClose: () => void;
  onSave: (
    name: string,
    description: string,
    requiresNote: boolean,
    weeklyGoal?: number,
    taskSequence?: SequenceTask[],
    sequenceMode?: 'calendar' | 'log',
    timeBoundType?: 'before' | 'after' | 'between' | null,
    timeBoundStartTime?: string | null,
    timeBoundEndTime?: string | null,
    activityType?: 'goal' | 'endless',
    streakGoal?: number,
  ) => void;
}

const GOAL_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

export const ActivityFormModal: React.FC<ActivityFormModalProps> = ({
  visible,
  editingItemId,
  initialName,
  initialDescription = '',
  initialRequiresNote = false,
  initialWeeklyGoal,
  initialTaskSequence,
  initialSequenceMode,
  initialTimeBoundType,
  initialTimeBoundStartTime,
  initialTimeBoundEndTime,
  initialActivityType,
  initialStreakGoal,
  onClose,
  onSave,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [requiresNote, setRequiresNote] = useState(false);
  const [weeklyModeEnabled, setWeeklyModeEnabled] = useState(false);
  const [weeklyGoal, setWeeklyGoal] = useState(3);
  const [taskSeqEnabled, setTaskSeqEnabled] = useState(false);
  const [tasks, setTasks] = useState<SequenceTask[]>([]);
  const [sequenceMode, setSequenceMode] = useState<'calendar' | 'log'>('calendar');
  const [activityType, setActivityType] = useState<'goal' | 'endless'>('endless');
  const [streakGoal, setStreakGoal] = useState(30);
  const [streakGoalText, setStreakGoalText] = useState('30');

  const [timeBoundEnabled, setTimeBoundEnabled] = useState(false);
  const [timeBoundType, setTimeBoundType] = useState<'before' | 'after' | 'between'>('before');
  const [timeBoundStartTime, setTimeBoundStartTime] = useState('');
  const [startAmPm, setStartAmPm] = useState<'AM' | 'PM'>('AM');
  const [timeBoundEndTime, setTimeBoundEndTime] = useState('');
  const [endAmPm, setEndAmPm] = useState<'AM' | 'PM'>('AM');

  const inputRef = useRef<TextInput>(null);

  const pickerHeight = useSharedValue(0);
  const pickerOpacity = useSharedValue(0);
  const taskSeqHeight = useSharedValue(0);
  const taskSeqOpacity = useSharedValue(0);
  const timeBoundHeight = useSharedValue(0);
  const timeBoundOpacity = useSharedValue(0);

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

  const timeBoundStyle = useAnimatedStyle(() => ({
    maxHeight: timeBoundHeight.value,
    opacity: timeBoundOpacity.value,
    overflow: 'hidden',
  }));

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setDescription(initialDescription);
      setRequiresNote(initialRequiresNote);
      const hasGoal = !!initialWeeklyGoal && initialWeeklyGoal > 0;
      setWeeklyModeEnabled(hasGoal);
      setWeeklyGoal(initialWeeklyGoal && initialWeeklyGoal > 0 ? initialWeeklyGoal : 3);
      // Task sequence
      const hasTasks = !!initialTaskSequence && initialTaskSequence.length > 0;
      setTaskSeqEnabled(hasTasks);
      setTasks(initialTaskSequence ?? []);
      setSequenceMode(initialSequenceMode ?? 'calendar');
      // Activity type & streak goal
      setActivityType(initialActivityType ?? 'endless');
      const sg = initialStreakGoal && initialStreakGoal > 0 ? initialStreakGoal : 30;
      setStreakGoal(sg);
      setStreakGoalText(sg.toString());

      const hasTimeBound = !!initialTimeBoundType;
      setTimeBoundEnabled(hasTimeBound);
      setTimeBoundType(initialTimeBoundType ?? 'before');

      const start12 = to12h(initialTimeBoundStartTime ?? '');
      setTimeBoundStartTime(start12.time);
      setStartAmPm(start12.ampm);

      const end12 = to12h(initialTimeBoundEndTime ?? '');
      setTimeBoundEndTime(end12.time);
      setEndAmPm(end12.ampm);

      // Animate pickers to correct state immediately (no animation on open)
      pickerHeight.value = hasGoal ? 60 : 0;
      pickerOpacity.value = hasGoal ? 1 : 0;
      taskSeqHeight.value = hasTasks ? 1200 : 0;
      taskSeqOpacity.value = hasTasks ? 1 : 0;
      timeBoundHeight.value = hasTimeBound ? 320 : 0;
      timeBoundOpacity.value = hasTimeBound ? 1 : 0;
    }
  }, [visible, initialName, initialDescription, initialRequiresNote, initialWeeklyGoal, initialTaskSequence, initialSequenceMode, initialTimeBoundType, initialTimeBoundStartTime, initialTimeBoundEndTime, initialActivityType, initialStreakGoal]);

  const handleWeeklyToggle = (val: boolean) => {
    haptics.toggle(val);
    setWeeklyModeEnabled(val);
    pickerHeight.value = withTiming(val ? 60 : 0, { duration: 250 });
    pickerOpacity.value = withTiming(val ? 1 : 0, { duration: 200 });
  };

  const handleTaskSeqToggle = (val: boolean) => {
    haptics.toggle(val);
    setTaskSeqEnabled(val);
    taskSeqHeight.value = withTiming(val ? 1200 : 0, { duration: 300 });
    taskSeqOpacity.value = withTiming(val ? 1 : 0, { duration: 250 });
    if (!val) setTasks([]);
  };

  const handleTimeBoundToggle = (val: boolean) => {
    haptics.toggle(val);
    setTimeBoundEnabled(val);
    timeBoundHeight.value = withTiming(val ? 320 : 0, { duration: 300 });
    timeBoundOpacity.value = withTiming(val ? 1 : 0, { duration: 250 });
  };

  /**
   * Keyboard lift, measured rather than derived from view frames.
   *
   * KeyboardAvoidingView cannot work here. It computes the lift as
   * `frame.y + frame.height - keyboardFrame.screenY`, but on Android
   * `keyboardDidHide` reports `screenY` as the *visible* area height — system
   * bars excluded — while this overlay's frame spans the full screen edge to
   * edge. Subtracting one from the other leaves a positive remainder instead of
   * zero once the keyboard closes, and that remainder is a permanent gap under
   * the sheet. (With `behavior="height"` it also accumulates, since that branch
   * adds the previous value back in.) It never showed before because nothing
   * focused an input on open, so the keyboard never appeared to begin with.
   *
   * `endCoordinates.height` is just the keyboard's height, with no frame to
   * disagree with. On Android it excludes the navigation bar, which this overlay
   * does cover, so that inset is added back to land flush on the keyboard.
   */
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, e =>
      setKeyboardHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Hardware back — previously handled by Modal.onRequestClose.
  useEffect(() => {
    if (!visible) return;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => backHandler.remove();
  }, [visible, onClose]);

  const handleSave = () => {
    // Guards double as the validity check, so anything past them is a real save.
    if (!name.trim()) return haptics.warning();
    if (activityType === 'goal' && (!streakGoal || streakGoal < 1)) return haptics.warning();
    haptics.success();
    onSave(
      name.trim(),
      description.trim(),
      requiresNote,
      weeklyModeEnabled ? weeklyGoal : undefined,
      taskSeqEnabled && tasks.length > 0 ? tasks : [],
      taskSeqEnabled && tasks.length > 0 ? sequenceMode : undefined,
      timeBoundEnabled ? timeBoundType : null,
      timeBoundEnabled ? to24h(timeBoundStartTime, startAmPm) : null,
      timeBoundEnabled && timeBoundType === 'between' ? to24h(timeBoundEndTime, endAmPm) : null,
      activityType,
      activityType === 'goal' ? streakGoal : undefined,
    );
  };

  const isEditing = !!editingItemId;

  const isTimeOrderValid = !timeBoundEnabled || timeBoundType !== 'between' || (
    isValidTime12h(timeBoundStartTime) && isValidTime12h(timeBoundEndTime) &&
    to24h(timeBoundStartTime, startAmPm) < to24h(timeBoundEndTime, endAmPm)
  );

  const isTimeValid = !timeBoundEnabled || (
    timeBoundType === 'between'
      ? isValidTime12h(timeBoundStartTime) && isValidTime12h(timeBoundEndTime) && isTimeOrderValid
      : isValidTime12h(timeBoundStartTime)
  );

  const isStreakGoalValid = activityType !== 'goal' || (streakGoal >= 1);
  const canSave = name.trim().length > 0 && isTimeValid && isStreakGoalValid;

  const timeOrderInvalid = timeBoundEnabled && timeBoundType === 'between' &&
    isValidTime12h(timeBoundStartTime) && isValidTime12h(timeBoundEndTime) &&
    to24h(timeBoundStartTime, startAmPm) >= to24h(timeBoundEndTime, endAmPm);

  const startInvalid = (timeBoundEnabled && timeBoundStartTime.length > 0 && !isValidTime12h(timeBoundStartTime)) || timeOrderInvalid;
  const endInvalid = (timeBoundEnabled && timeBoundType === 'between' && timeBoundEndTime.length > 0 && !isValidTime12h(timeBoundEndTime)) || timeOrderInvalid;

  if (!visible) return null;

  return (
    /**
     * An in-tree overlay rather than a Modal.
     *
     * A Modal is its own Android Dialog window, and a Dialog will not extend
     * under the navigation bar — so the sheet and its scrim both stopped short
     * and left a live, undimmed strip of the screen behind showing through.
     * The screen underneath is edge-to-edge, so an absoluteFill here covers the
     * whole display. Same mechanism as NoteInputModal and LogDetailsModal.
     */
    <View
      style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}
      pointerEvents="box-none"
    >
      {/* Backdrop */}
      <Animated.View entering={FadeIn.duration(120)} style={[styles.backdrop, { backgroundColor: colors.scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <View
        style={[
          styles.kavWrapper,
          {
            paddingBottom:
              keyboardHeight > 0
                ? keyboardHeight + (Platform.OS === 'android' ? insets.bottom : 0)
                : 0,
          },
        ]}
        pointerEvents="box-none"
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
          <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="e.g., Read 10 pages"
              placeholderTextColor={colors.textDisabled}
              value={name}
              onChangeText={setName}
              onSubmitEditing={handleSave}
              autoFocus
              maxLength={40}
              returnKeyType="done"
              selectionColor={colors.primary}
            />
            {name.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  haptics.light();
                  setName('');
                }}
                style={styles.clearBtn}
                hitSlop={8}
              >
                <FontAwesome5 name="times" size={14} color={colors.textDisabled} />
              </TouchableOpacity>
            )}
          </View>

          {/* Character count */}
          <Text style={[styles.charCount, { color: colors.textSecondary }]}>
            {name.length}/40
          </Text>

          {/* ── Description ────────────────────────────────────────── */}
          <View
            style={[
              styles.descriptionWrapper,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            <TextInput
              style={[styles.descriptionInput, { color: colors.textPrimary }]}
              placeholder="Add a description (optional)"
              placeholderTextColor={colors.textDisabled}
              value={description}
              onChangeText={setDescription}
              maxLength={280}
              multiline
              selectionColor={colors.primary}
            />
          </View>

          <Text style={[styles.charCount, { color: colors.textSecondary }]}>
            {description.length}/280
          </Text>

          {/* ── Activity Type Selector ─────────────────────────────── */}
          {!isEditing && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                Activity Type
              </Text>
              <View style={styles.typeRow}>
                {/* Goal-Based card */}
                <TouchableOpacity
                  style={[
                    styles.typeCard,
                    {
                      backgroundColor: activityType === 'goal'
                        ? colors.successMuted
                        : colors.background,
                      borderColor: activityType === 'goal' ? colors.success : colors.border,
                    },
                  ]}
                  onPress={() => {
                    if (activityType !== 'goal') haptics.selection();
                    setActivityType('goal');
                  }}
                  activeOpacity={0.75}
                >
                  <View style={[styles.typeIconWrap, {
                    backgroundColor: activityType === 'goal'
                      ? colors.successMuted
                      : colors.surfaceVariant,
                  }]}>
                    <FontAwesome5
                      name="bullseye"
                      size={16}
                      color={activityType === 'goal' ? colors.success : colors.textSecondary}
                    />
                  </View>
                  <Text style={[styles.typeCardTitle, {
                    color: activityType === 'goal' ? colors.success : colors.textPrimary,
                  }]}>
                    Goal-Based
                  </Text>
                  <Text style={[styles.typeCardSub, { color: colors.textSecondary }]}>
                    Completes when streak goal is hit
                  </Text>
                  {activityType === 'goal' && (
                    <View style={[styles.typeCheckDot, { backgroundColor: colors.success }]}>
                      <FontAwesome5 name="check" size={9} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Endless card */}
                <TouchableOpacity
                  style={[
                    styles.typeCard,
                    {
                      backgroundColor: activityType === 'endless'
                        ? colors.primarySubtle
                        : colors.background,
                      borderColor: activityType === 'endless' ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => {
                    if (activityType !== 'endless') haptics.selection();
                    setActivityType('endless');
                  }}
                  activeOpacity={0.75}
                >
                  <View style={[styles.typeIconWrap, {
                    backgroundColor: activityType === 'endless'
                      ? colors.primaryMuted
                      : colors.surfaceVariant,
                  }]}>
                    <FontAwesome5
                      name="infinity"
                      size={14}
                      color={activityType === 'endless' ? colors.primary : colors.textSecondary}
                    />
                  </View>
                  <Text style={[styles.typeCardTitle, {
                    color: activityType === 'endless' ? colors.primary : colors.textPrimary,
                  }]}>
                    Endless
                  </Text>
                  <Text style={[styles.typeCardSub, { color: colors.textSecondary }]}>
                    No target — track forever
                  </Text>
                  {activityType === 'endless' && (
                    <View style={[styles.typeCheckDot, { backgroundColor: colors.primary }]}>
                      <FontAwesome5 name="check" size={9} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Streak Goal input — only for goal-based */}
              {activityType === 'goal' && (
                <View style={[styles.streakGoalRow, {
                  backgroundColor: colors.successMuted,
                  borderColor: colors.success,
                }]}>
                  <FontAwesome5 name="trophy" size={14} color={colors.success} />
                  <Text style={[styles.streakGoalLabel, { color: colors.textPrimary }]}>
                    Streak Goal
                  </Text>
                  <View style={[styles.streakGoalInputWrap, {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  }]}>
                    <TextInput
                      style={[styles.streakGoalInput, { color: colors.textPrimary }]}
                      value={streakGoalText}
                      onChangeText={(val) => {
                        setStreakGoalText(val);
                        const n = parseInt(val, 10);
                        if (!isNaN(n) && n > 0) setStreakGoal(n);
                      }}
                      keyboardType="number-pad"
                      maxLength={4}
                      selectTextOnFocus
                    />
                  </View>
                  <Text style={[styles.streakGoalUnit, { color: colors.textSecondary }]}>
                    days
                  </Text>
                </View>
              )}
            </>
          )}

          {/* ── Weekly Goal Mode toggle ────────────────────────── */}
          <View style={[styles.toggleRow, {
            backgroundColor: weeklyModeEnabled
              ? colors.primarySubtle
              : colors.background,
            borderColor: weeklyModeEnabled ? colors.primary : colors.border,
          }]}>
            <View style={[styles.toggleIconWrap, {
              backgroundColor: weeklyModeEnabled
                ? colors.primaryMuted
                : colors.surfaceVariant,
            }]}>
              <FontAwesome5
                name="calendar-check"
                size={14}
                color={weeklyModeEnabled ? colors.primary : colors.textSecondary}
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
              trackColor={{ false: colors.surfaceVariant, true: colors.primaryMuted }}
              thumbColor={weeklyModeEnabled ? colors.primary : colors.textSecondary}
            />
          </View>

          {/* Goal picker — animates in/out */}
          <Animated.View style={pickerStyle}>
            <View style={[styles.goalPicker, { backgroundColor: colors.background, borderColor: colors.border }]}>
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
                          ? colors.primary
                          : colors.surfaceVariant,
                      },
                    ]}
                    onPress={() => {
                      if (weeklyGoal !== n) haptics.selection();
                      setWeeklyGoal(n);
                    }}
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
          <View style={[styles.toggleRow, { backgroundColor: colors.background, borderColor: colors.border, marginBottom: Spacing.sm }]}>
            <View style={[styles.toggleIconWrap, { backgroundColor: requiresNote ? colors.primaryMuted : colors.surfaceVariant }]}>
              <FontAwesome5
                name="sticky-note"
                size={14}
                color={requiresNote ? colors.primary : colors.textSecondary}
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
              onValueChange={val => {
                haptics.toggle(val);
                setRequiresNote(val);
              }}
              trackColor={{ false: colors.surfaceVariant, true: colors.primaryMuted }}
              thumbColor={requiresNote ? colors.primary : colors.textSecondary}
            />
          </View>

          {/* ── Task Sequence toggle ───────────────────────────────────────── */}
          <View style={[styles.toggleRow, {
            backgroundColor: taskSeqEnabled
              ? colors.primarySubtle
              : colors.background,
            borderColor: taskSeqEnabled ? colors.primary : colors.border,
            marginBottom: Spacing.sm,
          }]}>
            <View style={[styles.toggleIconWrap, {
              backgroundColor: taskSeqEnabled
                ? colors.primaryMuted
                : colors.surfaceVariant,
            }]}>
              <FontAwesome5
                name="list-ol"
                size={13}
                color={taskSeqEnabled ? colors.primary : colors.textSecondary}
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
              trackColor={{ false: colors.surfaceVariant, true: colors.primaryMuted }}
              thumbColor={taskSeqEnabled ? colors.primary : colors.textSecondary}
            />
          </View>

          {/* Task sequence editor — animates open */}
          <Animated.View style={taskSeqStyle}>
            {/* Advancement mode picker */}
            <View style={[styles.modePickerRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.modePickerLabel, { color: colors.textSecondary }]}>Advance by</Text>
              <View style={styles.modePills}>
                {(['calendar', 'log'] as const).map(mode => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.modePill,
                      { backgroundColor: sequenceMode === mode ? colors.primary : colors.surfaceVariant },
                    ]}
                    onPress={() => {
                      if (sequenceMode !== mode) haptics.selection();
                      setSequenceMode(mode);
                    }}
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

          {/* ── Time Bound toggle ───────────────────────────────────────── */}
          <View style={[styles.toggleRow, {
            backgroundColor: timeBoundEnabled
              ? colors.primarySubtle
              : colors.background,
            borderColor: timeBoundEnabled ? colors.primary : colors.border,
            marginBottom: Spacing.sm,
          }]}>
            <View style={[styles.toggleIconWrap, {
              backgroundColor: timeBoundEnabled
                ? colors.primaryMuted
                : colors.surfaceVariant,
            }]}>
              <FontAwesome5
                name="clock"
                size={13}
                color={timeBoundEnabled ? colors.primary : colors.textSecondary}
              />
            </View>
            <View style={styles.toggleTextWrap}>
              <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                Time Bound
              </Text>
              <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>
                {timeBoundEnabled
                  ? `Log ${timeBoundType} specific time`
                  : 'Log at any time'}
              </Text>
            </View>
            <Switch
              value={timeBoundEnabled}
              onValueChange={handleTimeBoundToggle}
              trackColor={{ false: colors.surfaceVariant, true: colors.primaryMuted }}
              thumbColor={timeBoundEnabled ? colors.primary : colors.textSecondary}
            />
          </View>

          {/* Time Bound picker — animates open */}
          <Animated.View style={timeBoundStyle}>
            <View style={[styles.modePickerRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.modePickerLabel, { color: colors.textSecondary }]}>Type</Text>
              <View style={styles.modePills}>
                {(['before', 'after', 'between'] as const).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.modePill,
                      { backgroundColor: timeBoundType === type ? colors.primary : colors.surfaceVariant },
                    ]}
                    onPress={() => {
                      if (timeBoundType !== type) haptics.selection();
                      setTimeBoundType(type);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={[
                      styles.modePillText,
                      { color: timeBoundType === type ? '#fff' : colors.textSecondary },
                    ]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Start time */}
            <View style={styles.timeFieldGroup}>
              <Text style={[styles.timeFieldLabel, { color: colors.textSecondary }]}>
                {timeBoundType === 'between' ? 'Start Time' : 'Time'}
              </Text>
              <View style={[styles.inputWrapper, {
                backgroundColor: colors.background,
                borderColor: startInvalid ? colors.danger : colors.border,
                marginBottom: 0,
              }]}>
                <TextInput
                  style={[styles.input, { flex: 1, color: startInvalid ? colors.danger : colors.textPrimary }]}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textDisabled}
                  value={timeBoundStartTime}
                  onChangeText={setTimeBoundStartTime}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
                <TouchableOpacity
                  style={[styles.amPmToggle, {
                    backgroundColor: startAmPm === 'AM' ? colors.surfaceVariant : colors.primaryContainer,
                  }]}
                  onPress={() => {
                    haptics.selection();
                    setStartAmPm(startAmPm === 'AM' ? 'PM' : 'AM');
                  }}
                >
                  <Text style={[styles.amPmText, { color: startAmPm === 'PM' ? colors.primary : colors.textPrimary }]}>
                    {startAmPm}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* End time — only for 'between' */}
            {timeBoundType === 'between' && (
              <View style={[styles.timeFieldGroup, { marginTop: Spacing.sm }]}>
                <Text style={[styles.timeFieldLabel, { color: colors.textSecondary }]}>End Time</Text>
                <View style={[styles.inputWrapper, {
                  backgroundColor: colors.background,
                  borderColor: endInvalid ? colors.danger : colors.border,
                  marginBottom: 0,
                }]}>
                  <TextInput
                    style={[styles.input, { flex: 1, color: endInvalid ? colors.danger : colors.textPrimary }]}
                    placeholder="HH:MM"
                    placeholderTextColor={colors.textDisabled}
                    value={timeBoundEndTime}
                    onChangeText={setTimeBoundEndTime}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                  <TouchableOpacity
                    style={[styles.amPmToggle, {
                      backgroundColor: endAmPm === 'AM' ? colors.surfaceVariant : colors.primaryContainer,
                    }]}
                    onPress={() => {
                      haptics.selection();
                      setEndAmPm(endAmPm === 'AM' ? 'PM' : 'AM');
                    }}
                  >
                    <Text style={[styles.amPmText, { color: endAmPm === 'PM' ? colors.primary : colors.textPrimary }]}>
                      {endAmPm}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Validation error hint */}
            {timeOrderInvalid && (
              <Text style={[styles.timeErrorHint, { color: colors.danger }]}>
                End time must be after start time
              </Text>
            )}
            <View style={{ height: Spacing.md }} />
          </Animated.View>

          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btnCancel, { backgroundColor: colors.surfaceVariant }]}
              onPress={() => {
                haptics.light();
                onClose();
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.btnCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btnSave,
                { backgroundColor: canSave ? colors.primary : colors.surfaceVariant },
              ]}
              onPress={handleSave}
              disabled={!canSave}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSave }}
              accessibilityLabel={isEditing ? 'Save changes' : 'Create habit'}
            >
              <Text
                style={[
                  styles.btnSaveText,
                  { color: canSave ? colors.onPrimary : colors.textDisabled },
                ]}
              >
                {isEditing ? 'Save changes' : 'Create habit'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  kavWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
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
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
  input: {
    flex: 1,
    ...Typography.bodyLarge,
    paddingVertical: Spacing.md,
  },
  descriptionWrapper: {
    // Not `inputWrapper`: that is a centred row sized around a single-line
    // field and its trailing clear button. This one has neither, and has to
    // grow downward as the text wraps.
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  descriptionInput: {
    ...Typography.bodyMedium,
    paddingVertical: Spacing.md,
    minHeight: 44,
    maxHeight: 120,
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
    borderWidth: StyleSheet.hairlineWidth,
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
    borderWidth: StyleSheet.hairlineWidth,
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
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelText: {
    ...Typography.labelLarge,
    fontWeight: '600',
  },
  btnSave: {
    flex: 2,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSaveText: {
    ...Typography.labelLarge,
    fontWeight: '700',
  },
  // ── Task sequence mode picker ───────────────────────────────────────────────
  modePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
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
    borderRadius: BorderRadius.sm,
  },
  modePillText: {
    ...Typography.labelMedium,
    fontWeight: '600',
  },
  modeHint: {
    ...Typography.bodySmall,
    marginBottom: Spacing.sm,
  },
  amPmToggle: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  amPmText: {
    ...Typography.labelMedium,
    fontWeight: '700',
  },
  timeFieldGroup: {
    gap: Spacing.xs,
  },
  timeFieldLabel: {
    ...Typography.labelMedium,
    fontWeight: '600',
    marginLeft: 2,
  },
  timeErrorHint: {
    ...Typography.bodySmall,
    marginTop: Spacing.sm,
  },
  // ── Activity type selector ──────────────────────────────────────────────────
  sectionLabel: {
    ...Typography.labelMedium,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  typeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  typeCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    gap: 6,
    position: 'relative',
  },
  typeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  typeCardTitle: {
    ...Typography.bodyMedium,
    fontWeight: '700',
  },
  typeCardSub: {
    ...Typography.bodySmall,
    lineHeight: 16,
  },
  typeCheckDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakGoalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  streakGoalLabel: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    flex: 1,
  },
  streakGoalInputWrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    minWidth: 60,
    alignItems: 'center',
  },
  streakGoalInput: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 44,
  },
  streakGoalUnit: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
});
