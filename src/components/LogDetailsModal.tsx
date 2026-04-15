import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { FadeIn, SlideInDown, SlideOutDown, Easing } from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius } from '../constants';
import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

export interface LogDetailsModalProps {
  visible: boolean;
  dateStr: string;
  timeStr: string | null;
  note?: string;
  activityName?: string;
  /** YYYY-MM-DD key used for note storage. When provided, edit is enabled. */
  dateKey?: string;
  /** Whether this log belongs to today (edit button visible only today). */
  isToday?: boolean;
  /** Called after a note is saved/cleared so the parent can refresh. */
  onNoteUpdate?: (newNote: string) => Promise<void>;
  onClose: () => void;
}

export const LogDetailsModal: React.FC<LogDetailsModalProps> = ({
  visible,
  dateStr,
  timeStr,
  note,
  activityName,
  isToday = false,
  onNoteUpdate,
  onClose,
}) => {
  const { colors, isDark } = useTheme();

  const [isEditing, setIsEditing] = React.useState(false);
  const [draftNote, setDraftNote] = React.useState(note ?? '');
  const [isSaving, setIsSaving] = React.useState(false);

  // Sync draft when modal opens or note changes from outside
  React.useEffect(() => {
    setDraftNote(note ?? '');
    setIsEditing(false);
  }, [note, visible]);

  const handleSave = async () => {
    if (!onNoteUpdate) return;
    setIsSaving(true);
    try {
      await onNoteUpdate(draftNote);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDraftNote(note ?? '');
    setIsEditing(false);
  };

  const canEdit = isToday && !!onNoteUpdate;

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
        style={styles.kvWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.wrapper}>
          <Animated.View
            entering={SlideInDown.duration(220).easing(Easing.out(Easing.cubic))}
            exiting={SlideOutDown.duration(160).easing(Easing.in(Easing.cubic))}
            style={[styles.sheet, { backgroundColor: colors.surface }]}
          >
            {/* Handle bar */}
            <View style={[styles.handleBar, { backgroundColor: colors.surfaceVariant }]} />

            {/* Header */}
            <View style={styles.headerRow}>
              <View style={[styles.iconContainer, { backgroundColor: isDark ? Colors.dark.primaryContainer : Colors.primaryContainer }]}>
                <FontAwesome5 name="calendar-check" size={22} color={Colors.primary} />
              </View>
              <View style={styles.headerText}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>Log Details</Text>
                {activityName ? (
                  <Text style={[styles.activityBadgeText, { color: Colors.primary }]}>
                    {activityName}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Info card */}
            <View style={[styles.infoCard, { backgroundColor: colors.background, borderColor: colors.surfaceVariant }]}>
              {/* Date row */}
              <View style={styles.infoRow}>
                <View style={[styles.infoIconWrap, { backgroundColor: isDark ? Colors.dark.primaryContainer : Colors.primaryContainer }]}>
                  <FontAwesome5 name="calendar-day" size={13} color={Colors.primary} />
                </View>
                <View style={styles.infoTextWrap}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Date</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{dateStr}</Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.surfaceVariant }]} />

              {/* Time row */}
              <View style={styles.infoRow}>
                <View style={[
                  styles.infoIconWrap,
                  { backgroundColor: timeStr
                      ? (isDark ? '#1B3A35' : Colors.successLight)
                      : colors.surfaceVariant
                  }
                ]}>
                  <FontAwesome5
                    name="clock"
                    size={13}
                    color={timeStr ? Colors.success : colors.textSecondary}
                  />
                </View>
                <View style={styles.infoTextWrap}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Time Logged</Text>
                  <Text style={[
                    styles.infoValue,
                    { color: timeStr ? colors.textPrimary : colors.textSecondary }
                  ]}>
                    {timeStr ?? 'No exact time recorded'}
                  </Text>
                </View>
                {timeStr ? (
                  <View style={[styles.statusBadge, { backgroundColor: isDark ? '#1B3A35' : Colors.successLight }]}>
                    <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                    <Text style={[styles.statusBadgeText, { color: Colors.success }]}>Logged</Text>
                  </View>
                ) : null}
              </View>

              {/* Note row */}
              <View style={[styles.divider, { backgroundColor: colors.surfaceVariant }]} />
              <View style={[styles.infoRow, styles.noteRow]}>
                <View style={[styles.infoIconWrap, { backgroundColor: isDark ? Colors.dark.primaryContainer : Colors.primaryContainer }]}>
                  <FontAwesome5 name="sticky-note" size={13} color={Colors.primary} />
                </View>

                <View style={styles.infoTextWrap}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Note</Text>

                  {isEditing ? (
                    <>
                      <TextInput
                        style={[
                          styles.noteInput,
                          {
                            color: colors.textPrimary,
                            backgroundColor: colors.background,
                            borderColor: Colors.primary,
                          },
                        ]}
                        value={draftNote}
                        onChangeText={setDraftNote}
                        placeholder="Add a note…"
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        autoFocus
                        maxLength={500}
                        scrollEnabled={false}
                      />
                      <View style={styles.editActions}>
                        <TouchableOpacity
                          style={[styles.editBtn, styles.cancelBtn, { borderColor: colors.surfaceVariant }]}
                          onPress={handleCancel}
                          disabled={isSaving}
                        >
                          <Text style={[styles.editBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.editBtn, styles.saveBtn, { backgroundColor: Colors.primary }]}
                          onPress={handleSave}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <ActivityIndicator size={14} color="#fff" />
                          ) : (
                            <Text style={[styles.editBtnText, { color: '#fff' }]}>Save</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <Text style={[
                      styles.infoValue,
                      styles.noteValue,
                      { color: note ? colors.textPrimary : colors.textSecondary },
                    ]}>
                      {note || 'No note added'}
                    </Text>
                  )}
                </View>

                {/* Edit pencil — only visible today, not while editing */}
                {canEdit && !isEditing ? (
                  <TouchableOpacity
                    style={[styles.editPencilBtn, { backgroundColor: isDark ? Colors.dark.primaryContainer : Colors.primaryContainer }]}
                    onPress={() => setIsEditing(true)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialIcons name="edit" size={15} color={Colors.primary} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Done button */}
            {!isEditing ? (
              <TouchableOpacity
                style={[styles.btnDone, { backgroundColor: Colors.primary }]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.btnDoneText}>Done</Text>
              </TouchableOpacity>
            ) : null}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  kvWrapper: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 20,
  },
  handleBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.xs,
  },
  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
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
    marginBottom: Spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  noteRow: {
    flexWrap: 'nowrap',
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
  noteValue: {
    fontWeight: '400',
    lineHeight: 22,
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
  // Note editing
  noteInput: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  editBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  saveBtn: {},
  editBtnText: {
    ...Typography.labelMedium,
    fontWeight: '700',
    fontSize: 14,
  },
  editPencilBtn: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginLeft: Spacing.xs,
  },
  // Button
  btnDone: {
    width: '100%',
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDoneText: {
    ...Typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
