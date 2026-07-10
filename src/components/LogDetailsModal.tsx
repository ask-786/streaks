import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  BackHandler,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Text } from 'react-native-paper';
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInDown,
  SlideOutDown,
  Easing,
} from 'react-native-reanimated';
import dayjs from 'dayjs';
import { Colors, Typography, Spacing, BorderRadius } from '../constants';
import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { NoteEntry } from '../features/attendance/attendanceService';
import { formatTimeWithTz } from '../utils/dateUtils';

export interface LogDetailsModalProps {
  visible: boolean;
  dateStr: string;
  timeStr: string | null;
  notes?: NoteEntry[];
  activityName?: string;
  dateKey?: string;
  isToday?: boolean;
  /** Whether this day has an actual log entry. False = tapped on an un-logged day. */
  isLogged?: boolean;
  /** Whether this activity has notes enabled (requiresNote). */
  requiresNote?: boolean;
  /** The task that was active on this logged day (computed by caller). */
  taskForDay?: string | null;
  /** Whether the sequence was skipped on this logged day. */
  isSequenceSkipped?: boolean;
  /** If today is unlogged and time-bound, whether the window is already passed or not yet open. */
  timeBoundKind?: 'too_early' | 'too_late';
  /** Appends a new note entry for today. */
  onNoteAppend?: (text: string) => Promise<void>;
  /** Edits an existing note entry by index. */
  onNoteEdit?: (index: number, text: string) => Promise<void>;
  onClose: () => void;
}

export const LogDetailsModal: React.FC<LogDetailsModalProps> = ({
  visible,
  dateStr,
  timeStr,
  notes,
  activityName,
  isToday = false,
  isLogged = true,
  requiresNote = false,
  taskForDay,
  isSequenceSkipped = false,
  timeBoundKind,
  onNoteAppend,
  onNoteEdit,
  onClose,
}) => {
  const { colors, isDark } = useTheme();

  /** null = adding a new note; number = editing note at that index */
  const [noteModalVisible, setNoteModalVisible] = React.useState(false);
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [draftNote, setDraftNote] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);
  const inputRef = React.useRef<TextInput>(null);
  const copyTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const isEditMode = editingIndex !== null;

  // Close note modal state when the main modal closes
  React.useEffect(() => {
    if (!visible) {
      setNoteModalVisible(false);
      setEditingIndex(null);
      setDraftNote('');
    }
  }, [visible]);

  // Handle hardware back button since we removed Modal
  React.useEffect(() => {
    if (visible || noteModalVisible) {
      const backAction = () => {
        if (noteModalVisible) {
          handleCloseNoteModal();
        } else {
          onClose();
        }
        return true; // prevent default behavior
      };
      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => backHandler.remove();
    }
  }, [visible, noteModalVisible, onClose]);

  const openAdd = () => {
    setEditingIndex(null);
    setDraftNote('');
    setNoteModalVisible(true);
  };

  const openEdit = (index: number) => {
    setEditingIndex(index);
    setDraftNote(notes?.[index]?.text ?? '');
    setNoteModalVisible(true);
  };

  const handleSave = async () => {
    const trimmed = draftNote.trim();
    if (!trimmed) return;
    setIsSaving(true);
    try {
      if (isEditMode) {
        await onNoteEdit?.(editingIndex!, trimmed);
      } else {
        await onNoteAppend?.(trimmed);
      }
      Keyboard.dismiss();
      setNoteModalVisible(false);
      setEditingIndex(null);
      setDraftNote('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseNoteModal = () => {
    Keyboard.dismiss();
    setNoteModalVisible(false);
    setEditingIndex(null);
    setDraftNote('');
  };

  const handleCopy = async (text: string, index: number) => {
    await Clipboard.setStringAsync(text);
    setCopiedIndex(index);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopiedIndex(null), 1500);
  };

  // Only allow adding notes on today — past days are read-only
  const canAddNote = isToday && !!onNoteAppend;
  const hasNotes = notes && notes.length > 0;
  // Always show the notes section so users can annotate any logged day
  const showNotesSection = true;

  return (
    <>
      {/* ── Main log-details sheet ─────────────────────────────────────────── */}
      {(visible || noteModalVisible) && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]} pointerEvents="box-none">
          <Animated.View entering={FadeIn.duration(120)} style={[styles.backdrop, { zIndex: 0 }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          </Animated.View>

          <View style={[styles.kvWrapper, { zIndex: 1 }]} pointerEvents="box-none">
            <View style={styles.wrapper} pointerEvents="box-none">
              <Animated.View
                entering={SlideInDown.duration(220).easing(Easing.out(Easing.cubic))}
                exiting={SlideOutDown.duration(160).easing(Easing.in(Easing.cubic))}
                style={[styles.sheet, { backgroundColor: colors.surface }]}
              >
                {/* Handle bar */}
                <View style={[styles.handleBar, { backgroundColor: colors.surfaceVariant }]} />

                {/* Main container */}
                <View style={styles.sheetContainer}>
                  {/* Header (Sticky Top) */}
                  <View style={styles.headerRow}>
                    <View
                      style={[
                        styles.iconContainer,
                        {
                          backgroundColor: isDark
                            ? Colors.dark.primaryContainer
                            : Colors.primaryContainer,
                        },
                      ]}
                    >
                      <FontAwesome5 name="calendar-check" size={18} color={Colors.primary} />
                    </View>
                    <View style={styles.headerText}>
                      <Text style={[styles.title, { color: colors.textPrimary }]}>Log Details</Text>
                      {activityName ? (
                        <Text style={[styles.activityBadgeText, { color: Colors.primary }]}>
                          {activityName}
                        </Text>
                      ) : null}
                    </View>
                    {/* Close ×  button */}
                    <Pressable
                      onPress={onClose}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      style={({ pressed }) => [
                        styles.closeIconBtn,
                        {
                          backgroundColor: isDark ? colors.surfaceVariant : colors.background,
                          opacity: pressed ? 0.6 : 1,
                        },
                      ]}
                      android_ripple={{ color: colors.textSecondary + '33', radius: 20, borderless: true }}
                    >
                      <Ionicons name="close" size={18} color={colors.textSecondary} />
                    </Pressable>
                  </View>

                  {/* Scrollable middle */}
                  <ScrollView
                    style={styles.sheetScroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {/* Info card */}
                    <View
                      style={[
                        styles.infoCard,
                        { backgroundColor: colors.background, borderColor: colors.surfaceVariant },
                      ]}
                    >
                      {/* Date row */}
                      <View style={styles.infoRow}>
                        <View
                          style={[
                            styles.infoIconWrap,
                            {
                              backgroundColor: isDark
                                ? Colors.dark.primaryContainer
                                : Colors.primaryContainer,
                            },
                          ]}
                        >
                          <FontAwesome5 name="calendar-day" size={13} color={Colors.primary} />
                        </View>
                        <View style={styles.infoTextWrap}>
                          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Date</Text>
                          <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                            {dateStr}
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.divider, { backgroundColor: colors.surfaceVariant }]} />

                      {/* Time row — hidden for un-logged days */}
                      {isLogged ? (
                        <View style={styles.infoRow}>
                          <View
                            style={[
                              styles.infoIconWrap,
                              {
                                backgroundColor: timeStr
                                  ? isDark
                                    ? '#1B3A35'
                                    : Colors.successLight
                                  : colors.surfaceVariant,
                              },
                            ]}
                          >
                            <FontAwesome5
                              name="clock"
                              size={13}
                              color={timeStr ? Colors.success : colors.textSecondary}
                            />
                          </View>
                          <View style={styles.infoTextWrap}>
                            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                              Time Logged
                            </Text>
                            <Text
                              style={[
                                styles.infoValue,
                                { color: timeStr ? colors.textPrimary : colors.textSecondary },
                              ]}
                            >
                              {timeStr ?? 'No exact time recorded'}
                            </Text>
                          </View>
                          {timeStr ? (
                            <View
                              style={[
                                styles.statusBadge,
                                { backgroundColor: isDark ? '#1B3A35' : Colors.successLight },
                              ]}
                            >
                              <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                              <Text style={[styles.statusBadgeText, { color: Colors.success }]}>
                                Logged
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      ) : (
                        /* Un-logged day banner */
                        <View style={styles.infoRow}>
                          <View
                            style={[
                              styles.infoIconWrap,
                              {
                                backgroundColor: isToday
                                  ? timeBoundKind === 'too_late'
                                    ? isDark ? '#3A1A1A' : '#FFF0F0'
                                    : isDark ? '#2D2510' : '#FFF8E7'
                                  : colors.surfaceVariant,
                              },
                            ]}
                          >
                            <FontAwesome5
                              name={isToday
                                ? timeBoundKind === 'too_late' ? 'calendar-times' : 'clock'
                                : 'calendar-times'}
                              size={13}
                              color={
                                isToday
                                  ? timeBoundKind === 'too_late' ? Colors.error : Colors.warning
                                  : colors.textSecondary
                              }
                            />
                          </View>
                          <View style={styles.infoTextWrap}>
                            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Status</Text>
                            <Text
                              style={[
                                styles.infoValue,
                                {
                                  color: isToday
                                    ? timeBoundKind === 'too_late' ? Colors.error : Colors.warning
                                    : colors.textSecondary,
                                },
                              ]}
                            >
                              {isToday
                                ? timeBoundKind === 'too_late'
                                  ? 'Window passed'
                                  : 'Not yet logged'
                                : 'Not logged'}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor: isToday
                                  ? timeBoundKind === 'too_late'
                                    ? isDark ? '#3A1A1A' : '#FFF0F0'
                                    : isDark ? '#2D2510' : '#FFF8E7'
                                  : colors.surfaceVariant,
                              },
                            ]}
                          >
                            <Ionicons
                              name={
                                isToday
                                  ? timeBoundKind === 'too_late' ? 'close-circle' : 'time-outline'
                                  : 'close-circle'
                              }
                              size={14}
                              color={
                                isToday
                                  ? timeBoundKind === 'too_late' ? Colors.error : Colors.warning
                                  : colors.textSecondary
                              }
                            />
                            <Text
                              style={[
                                styles.statusBadgeText,
                                {
                                  color: isToday
                                    ? timeBoundKind === 'too_late' ? Colors.error : Colors.warning
                                    : colors.textSecondary,
                                },
                              ]}
                            >
                              {isToday
                                ? timeBoundKind === 'too_late' ? 'Missed' : 'Pending'
                                : 'Missed'}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* ── Task that day ── */}
                      {taskForDay ? (
                        <>
                          <View style={[styles.divider, { backgroundColor: colors.surfaceVariant }]} />
                          <View style={styles.infoRow}>
                            <View
                              style={[
                                styles.infoIconWrap,
                                {
                                  backgroundColor: isSequenceSkipped
                                    ? isDark ? '#3A2500' : '#FFF7E6'
                                    : isDark
                                      ? Colors.dark.primaryContainer
                                      : Colors.primaryContainer,
                                },
                              ]}
                            >
                              <FontAwesome5
                                name={isSequenceSkipped ? 'forward' : 'list-ol'}
                                size={13}
                                color={isSequenceSkipped ? Colors.warning : Colors.primary}
                              />
                            </View>
                            <View style={styles.infoTextWrap}>
                              {/* Label row: text left, skipped pill right */}
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                                  {isSequenceSkipped ? 'Sequence Task' : 'Task that day'}
                                </Text>
                                {isSequenceSkipped && (
                                  <View style={[
                                    styles.skippedInlinePill,
                                    { backgroundColor: isDark ? '#3A2500' : '#FFF7E6', borderColor: Colors.warning },
                                  ]}>
                                    <FontAwesome5 name="forward" size={9} color={Colors.warning} />
                                    <Text style={[styles.skippedInlinePillText, { color: Colors.warning }]}>
                                      Skipped
                                    </Text>
                                  </View>
                                )}
                              </View>
                              <Text style={[
                                styles.infoValue,
                                { color: isSequenceSkipped ? colors.textSecondary : colors.textPrimary },
                              ]}>
                                {taskForDay}
                              </Text>
                            </View>
                          </View>
                        </>
                      ) : null}

                      {/* ── Notes section — only shown when requiresNote is true ── */}
                      {showNotesSection ? (
                        <>
                          <View style={[styles.divider, { backgroundColor: colors.surfaceVariant }]} />
                          <View style={styles.notesSection}>
                            {/* Section header */}
                            <View style={styles.notesSectionHeader}>
                              <View
                                style={[
                                  styles.infoIconWrap,
                                  {
                                    backgroundColor: isDark
                                      ? Colors.dark.primaryContainer
                                      : Colors.primaryContainer,
                                  },
                                ]}
                              >
                                <FontAwesome5 name="sticky-note" size={13} color={Colors.primary} />
                              </View>
                              <Text style={[styles.notesSectionTitle, { color: colors.textSecondary }]}>
                                Notes
                              </Text>
                              {hasNotes ? (
                                <View
                                  style={[
                                    styles.countBadge,
                                    {
                                      backgroundColor: isDark
                                        ? Colors.dark.primaryContainer
                                        : Colors.primaryContainer,
                                    },
                                  ]}
                                >
                                  <Text style={[styles.countBadgeText, { color: Colors.primary }]}>
                                    {notes!.length}
                                  </Text>
                                </View>
                              ) : null}
                            </View>

                            {/* ── Notes timeline ── */}
                            {hasNotes ? (
                              <View>
                                {notes!.map((entry, i) => (
                                  <Animated.View
                                    key={i}
                                    entering={FadeInDown.delay(i * 50).duration(220)}
                                    style={styles.timelineRow}
                                  >
                                    {/* Dot + connector */}
                                    <View style={styles.timelineIndicator}>
                                      <View
                                        style={[
                                          styles.dot,
                                          {
                                            backgroundColor: Colors.primary,
                                            borderColor: colors.background,
                                          },
                                        ]}
                                      />
                                      {i < notes!.length - 1 ? (
                                        <View
                                          style={[
                                            styles.connector,
                                            { backgroundColor: colors.surfaceVariant },
                                          ]}
                                        />
                                      ) : null}
                                    </View>

                                    {/* Note card */}
                                    <View
                                      style={[
                                        styles.noteCard,
                                        {
                                          backgroundColor: colors.surface,
                                          borderColor: colors.surfaceVariant,
                                        },
                                      ]}
                                    >
                                      {/* Time pill + action icons row */}
                                      <View style={styles.noteCardTop}>
                                        {entry.time ? (
                                          <View
                                            style={[
                                              styles.timePill,
                                              {
                                                backgroundColor: isDark
                                                  ? Colors.dark.primaryContainer
                                                  : Colors.primaryContainer,
                                              },
                                            ]}
                                          >
                                            <Text
                                              style={[styles.timePillText, { color: Colors.primary }]}
                                            >
                                              {formatTimeWithTz(entry.time!, entry.tz)}
                                            </Text>
                                          </View>
                                        ) : (
                                          <View style={{ flex: 1 }} />
                                        )}

                                        {/* Action buttons — grouped on the right */}
                                        <View style={styles.noteCardActions}>
                                          {/* Copy icon — always visible */}
                                          <Pressable
                                            style={({ pressed }) => [
                                              styles.copyIconBtn,
                                              {
                                                backgroundColor: copiedIndex === i
                                                  ? (isDark ? '#1B3A35' : Colors.successLight)
                                                  : (isDark ? colors.surfaceVariant : colors.background),
                                                opacity: pressed ? 0.55 : 1,
                                              },
                                            ]}
                                            onPress={() => handleCopy(entry.text, i)}
                                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                            android_ripple={{ color: Colors.primary + '33', radius: 16, borderless: true }}
                                          >
                                            <Ionicons
                                              name={copiedIndex === i ? 'checkmark' : 'copy-outline'}
                                              size={13}
                                              color={copiedIndex === i ? Colors.success : colors.textSecondary}
                                            />
                                          </Pressable>

                                          {/* Edit icon — only shown on today */}
                                          {!!onNoteEdit && isToday ? (
                                            <Pressable
                                              style={({ pressed }) => [
                                                styles.editIconBtn,
                                                {
                                                  backgroundColor: isDark
                                                    ? colors.surfaceVariant
                                                    : colors.background,
                                                  opacity: pressed ? 0.55 : 1,
                                                },
                                              ]}
                                              onPress={() => openEdit(i)}
                                              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                              android_ripple={{ color: Colors.primary + '33', radius: 16, borderless: true }}
                                            >
                                              <MaterialIcons
                                                name="edit"
                                                size={13}
                                                color={colors.textSecondary}
                                              />
                                            </Pressable>
                                          ) : null}
                                        </View>
                                      </View>

                                      <Text style={[styles.noteCardText, { color: colors.textPrimary }]}>
                                        {entry.text}
                                      </Text>
                                    </View>
                                  </Animated.View>
                                ))}
                              </View>
                            ) : (
                              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                No notes yet
                              </Text>
                            )}

                            {/* Add Note button — outside the scroll area */}
                            {canAddNote ? (
                              <Pressable
                                style={({ pressed }) => [
                                  styles.addNoteBtn,
                                  {
                                    backgroundColor: isDark
                                      ? Colors.dark.primaryContainer
                                      : Colors.primaryContainer,
                                    opacity: pressed ? 0.7 : 1,
                                  },
                                ]}
                                onPress={openAdd}
                                android_ripple={{ color: Colors.primary + '33', radius: 80 }}
                              >
                                <Ionicons name="add-circle-outline" size={16} color={Colors.primary} />
                                <Text style={[styles.addNoteBtnText, { color: Colors.primary }]}>
                                  {hasNotes ? 'Add Another Note' : 'Add Note'}
                                </Text>
                              </Pressable>
                            ) : null}
                          </View>
                        </>
                      ) : null}
                    </View>
                  </ScrollView>
                </View>
              </Animated.View>
            </View>
          </View>

          {/* ── Add / Edit note layer (stacked on top inside same Modal) ───────────────────────── */}
          {noteModalVisible && (
            <View style={[StyleSheet.absoluteFill, { zIndex: 100, elevation: 100 }]} pointerEvents="box-none">
              <Animated.View entering={FadeIn.duration(100)} style={[styles.backdrop, { zIndex: 0 }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseNoteModal} />
              </Animated.View>

              <KeyboardAvoidingView
                style={[styles.kavWrapper, { zIndex: 1 }]}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
                pointerEvents="box-none"
              >
                <View style={styles.kavInner} pointerEvents="box-none">
                  <Animated.View
                    entering={SlideInDown.duration(200).easing(Easing.out(Easing.cubic))}
                    exiting={SlideOutDown.duration(150).easing(Easing.in(Easing.cubic))}
                    style={[styles.addNoteSheet, { backgroundColor: colors.surface }]}
                  >
                    {/* Handle */}
                    <View style={[styles.handleBar, { backgroundColor: colors.surfaceVariant }]} />

                    {/* Header */}
                    <View style={styles.addNoteHeader}>
                      <View
                        style={[
                          styles.addNoteIconWrap,
                          {
                            backgroundColor: isDark
                              ? Colors.dark.primaryContainer
                              : Colors.primaryContainer,
                          },
                        ]}
                      >
                        <FontAwesome5
                          name={isEditMode ? 'pen' : 'pen'}
                          size={16}
                          color={Colors.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.addNoteTitle, { color: colors.textPrimary }]}>
                          {isEditMode ? 'Edit Note' : 'Add Note'}
                        </Text>
                        {activityName ? (
                          <Text style={[styles.addNoteSubtitle, { color: Colors.primary }]}>
                            {activityName}
                          </Text>
                        ) : null}
                      </View>
                      <Pressable
                        onPress={handleCloseNoteModal}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        style={({ pressed }) => [
                          styles.closeBtn,
                          {
                            backgroundColor: isDark ? colors.surfaceVariant : colors.background,
                            opacity: pressed ? 0.6 : 1,
                          },
                        ]}
                        android_ripple={{ color: colors.textSecondary + '33', radius: 20, borderless: true }}
                      >
                        <Ionicons name="close" size={18} color={colors.textSecondary} />
                      </Pressable>
                    </View>

                    <Text style={[styles.addNoteHint, { color: colors.textSecondary }]}>
                      {isEditMode
                        ? 'Update the note text below.'
                        : 'Add a note for this day — e.g. reason for missing, what you covered, etc.'}
                    </Text>

                    {/* Input */}
                    <View
                      style={[
                        styles.inputWrapper,
                        { backgroundColor: colors.background, borderColor: Colors.primary },
                      ]}
                    >
                      <TextInput
                        ref={inputRef}
                        style={[styles.noteTextInput, { color: colors.textPrimary }]}
                        value={draftNote}
                        onChangeText={setDraftNote}
                        placeholder="Write your note here…"
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        maxLength={500}
                        scrollEnabled={false}
                        textAlignVertical="top"
                        selectionColor={Colors.primary}
                      />
                    </View>

                    {/* Character count */}
                    <Text
                      style={[
                        styles.charCount,
                        { color: draftNote.length > 450 ? Colors.warning : colors.textSecondary },
                      ]}
                    >
                      {draftNote.length}/500
                    </Text>

                    {/* Actions */}
                    <View style={styles.addNoteActions}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.cancelBtn,
                          { backgroundColor: colors.surfaceVariant, opacity: pressed ? 0.7 : 1 },
                        ]}
                        onPress={handleCloseNoteModal}
                        disabled={isSaving}
                        android_ripple={{ color: colors.textSecondary + '22' }}
                      >
                        <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>
                          Cancel
                        </Text>
                      </Pressable>

                      <Pressable
                        style={({ pressed }) => [
                          styles.saveBtn,
                          {
                            backgroundColor: Colors.primary,
                            opacity: !draftNote.trim() || isSaving ? 0.5 : pressed ? 0.85 : 1,
                          },
                        ]}
                        onPress={handleSave}
                        disabled={isSaving || !draftNote.trim()}
                        android_ripple={{ color: '#ffffff33' }}
                      >
                        {isSaving ? (
                          <ActivityIndicator size={16} color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark" size={16} color="#fff" />
                            <Text style={styles.saveBtnText}>
                              {isEditMode ? 'Update Note' : 'Save Note'}
                            </Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  </Animated.View>
                </View>
              </KeyboardAvoidingView>
            </View>
          )}
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  kvWrapper: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  kavWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  kavInner: {
    justifyContent: 'flex-end',
    flex: 1,
  },
  // Main sheet
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 20,
    maxHeight: '90%',
  },
  sheetContainer: {
    flexShrink: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  sheetScroll: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.md,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    flexShrink: 0,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  closeIconBtn: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.xs,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...Typography.headlineLarge,
  },
  activityBadgeText: {
    ...Typography.labelMedium,
    marginTop: 2,
    fontWeight: '600',
  },
  // Info card
  infoCard: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    marginTop: 2,
  },
  infoTextWrap: {
    flex: 1,
  },
  infoLabel: {
    ...Typography.labelMedium,
    marginBottom: 2,
  },
  infoValue: {
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  statusBadgeText: {
    ...Typography.labelMedium,
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.md,
  },
  // Notes section
  notesSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  notesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 2,
  },
  notesSectionTitle: {
    ...Typography.labelMedium,
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  countBadgeText: {
    ...Typography.labelMedium,
    fontWeight: '700',
    fontSize: 12,
  },
  emptyText: {
    ...Typography.bodyMedium,
    fontStyle: 'italic',
    paddingVertical: Spacing.xs,
  },

  // Timeline
  timelineRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  timelineIndicator: {
    width: 20,
    alignItems: 'center',
    paddingTop: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  connector: {
    width: 2,
    flex: 1,
    marginTop: 3,
    minHeight: 10,
  },
  noteCard: {
    flex: 1,
    marginLeft: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: 4,
  },
  noteCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  timePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  timePillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  noteCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copyIconBtn: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIconBtn: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteCardText: {
    ...Typography.bodyMedium,
    lineHeight: 20,
  },
  // Add Note button
  addNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.xs,
  },
  addNoteBtnText: {
    ...Typography.labelMedium,
    fontWeight: '700',
  },

  // ── Add / Edit note modal sheet ────────────────────────────────────────────
  addNoteSheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 20,
  },
  addNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  addNoteIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addNoteTitle: {
    ...Typography.headlineLarge,
  },
  addNoteSubtitle: {
    ...Typography.labelMedium,
    fontWeight: '600',
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addNoteHint: {
    ...Typography.bodyMedium,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  inputWrapper: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
    minHeight: 110,
  },
  noteTextInput: {
    ...Typography.bodyLarge,
    lineHeight: 22,
    minHeight: 90,
  },
  charCount: {
    ...Typography.bodySmall,
    textAlign: 'right',
    marginBottom: Spacing.lg,
  },
  addNoteActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    ...Typography.labelLarge,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  saveBtnText: {
    ...Typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  skippedInlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  skippedInlinePillText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    fontSize: 10,
  },
});
