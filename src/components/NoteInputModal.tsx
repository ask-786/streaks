import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  BackHandler,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import {
  Typography,
  Spacing,
  BorderRadius,
  Duration,
  Ease,
  HitSlop,
  alpha,
} from '../constants';
import { useTheme } from '../hooks/useTheme';
import { haptics } from '../utils/haptics';
import { PressableScale } from './ui';

const MAX_LENGTH = 280;

export interface NoteInputModalProps {
  visible: boolean;
  activityName?: string;
  /** Override the modal title. Defaults to "Add a Note". */
  title?: string;
  /** Override the subtitle/description text. */
  subtitle?: string;
  /** Override the submit button label. Defaults to "Log & Save Note". */
  submitLabel?: string;
  /** When false, the note is optional and Submit is always enabled. Defaults to true. */
  noteRequired?: boolean;
  onClose: () => void;
  onSubmit: (note: string) => void;
}

export const NoteInputModal: React.FC<NoteInputModalProps> = ({
  visible,
  activityName,
  title,
  subtitle,
  submitLabel,
  noteRequired = true,
  onClose,
  onSubmit,
}) => {
  const { colors, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  const [note, setNote] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Hardware back closes the sheet.
  useEffect(() => {
    if (!visible) return;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => backHandler.remove();
  }, [visible, onClose]);

  useEffect(() => {
    if (visible) {
      setNote('');
      // Focus after the sheet has finished sliding in — focusing immediately
      // fights the entrance animation and the keyboard lands mid-transition.
      const t = setTimeout(() => inputRef.current?.focus(), Duration.normal + 60);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const trimmed = note.trim();
  const canSubmit = noteRequired ? trimmed.length > 0 : true;

  const handleSubmit = () => {
    if (!canSubmit) return;
    haptics.medium();
    onSubmit(trimmed);
  };

  if (!visible) return null;

  const remaining = MAX_LENGTH - note.length;
  const countColor =
    remaining <= 0
      ? colors.danger
      : remaining < 30
        ? colors.warning
        : colors.textTertiary;

  return (
    <View
      style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}
      pointerEvents="box-none"
    >
      {/* Backdrop */}
      <Animated.View
        entering={FadeIn.duration(Duration.fast)}
        style={[styles.backdrop, { backgroundColor: colors.scrim }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss" />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.kav, { zIndex: 1 }]}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        pointerEvents="box-none"
      >
        <View style={styles.kavInner} pointerEvents="box-none">
          <Animated.View
            entering={SlideInDown.duration(Duration.normal).easing(Ease.out)}
            exiting={SlideOutDown.duration(Duration.fast).easing(Ease.in)}
            style={[
              styles.sheet,
              elevation.overlay,
              {
                backgroundColor: colors.surface,
                paddingBottom: Spacing.lg + insets.bottom,
                // The sheet is flush with the screen edge; a ring across the
                // bottom would just be a stray line.
                borderBottomWidth: 0,
              },
            ]}
          >
            {/* Grab handle */}
            <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />

            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.iconWrap, { backgroundColor: alpha(colors.primary, 0.12) }]}>
                <FontAwesome5
                  name={noteRequired ? 'sticky-note' : 'forward'}
                  size={15}
                  color={colors.primary}
                />
              </View>
              <View style={styles.headerText}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  {title ?? 'Add a note'}
                </Text>
                {activityName ? (
                  <Text style={[styles.activity, { color: colors.textTertiary }]} numberOfLines={1}>
                    {activityName}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={HitSlop.md}
                style={({ pressed }) => [
                  styles.close,
                  { backgroundColor: colors.surfaceVariant, opacity: pressed ? 0.6 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={17} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {subtitle ??
                'A line about how it went. Future you will be glad it is here.'}
            </Text>

            {/* Note input */}
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.surfaceSunken,
                  borderColor: colors.border,
                },
              ]}
            >
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="e.g. Read 15 pages of Clean Code"
                placeholderTextColor={colors.textDisabled}
                value={note}
                onChangeText={setNote}
                multiline
                maxLength={MAX_LENGTH}
                selectionColor={colors.primary}
                textAlignVertical="top"
                accessibilityLabel="Note text"
              />
            </View>

            <View style={styles.metaRow}>
              {noteRequired && trimmed.length === 0 ? (
                <Text style={[styles.requiredHint, { color: colors.textTertiary }]}>
                  A note is required for this habit
                </Text>
              ) : (
                <View style={{ flex: 1 }} />
              )}
              <Text style={[styles.charCount, { color: countColor }]}>
                {note.length}/{MAX_LENGTH}
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <PressableScale
                onPress={onClose}
                scaleTo={0.96}
                style={[styles.btnCancel, { backgroundColor: colors.surfaceVariant }]}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={[styles.btnCancelText, { color: colors.textSecondary }]}>
                  Cancel
                </Text>
              </PressableScale>

              <PressableScale
                onPress={handleSubmit}
                disabled={!canSubmit}
                haptic={false}
                scaleTo={0.97}
                style={[
                  styles.btnSubmit,
                  canSubmit
                    ? { backgroundColor: colors.primary }
                    : { backgroundColor: colors.surfaceVariant },
                ]}
                accessibilityRole="button"
                accessibilityLabel={submitLabel ?? 'Log and save note'}
                accessibilityState={{ disabled: !canSubmit }}
              >
                <FontAwesome5
                  name="check"
                  size={13}
                  color={canSubmit ? colors.onPrimary : colors.textDisabled}
                />
                <Text
                  style={[
                    styles.btnSubmitText,
                    { color: canSubmit ? colors.onPrimary : colors.textDisabled },
                  ]}
                >
                  {submitLabel ?? 'Log & save'}
                </Text>
              </PressableScale>
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  kav: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  kavInner: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    borderBottomWidth: 0,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.md + 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    marginBottom: Spacing.sm,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...Typography.headlineMedium,
  },
  activity: {
    ...Typography.caption,
    marginTop: 2,
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    ...Typography.bodyMedium,
    marginBottom: Spacing.md,
  },
  inputWrapper: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md - 2,
    paddingVertical: Spacing.sm + 2,
    minHeight: 112,
  },
  input: {
    ...Typography.bodyLarge,
    minHeight: 88,
    padding: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md + 2,
  },
  requiredHint: {
    ...Typography.caption,
    flex: 1,
  },
  charCount: {
    ...Typography.caption,
    fontVariant: ['tabular-nums'],
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm + 2,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: Spacing.md - 2,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelText: {
    ...Typography.labelLarge,
    fontWeight: '600',
  },
  btnSubmit: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: Spacing.md - 2,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  btnSubmitText: {
    ...Typography.labelLarge,
    fontWeight: '700',
  },
});
