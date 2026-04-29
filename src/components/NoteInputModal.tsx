import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  BackHandler,
} from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { FadeIn, SlideInDown, SlideOutDown, Easing } from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius } from '../constants';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

export interface NoteInputModalProps {
  visible: boolean;
  activityName?: string;
  onClose: () => void;
  onSubmit: (note: string) => void;
}

export const NoteInputModal: React.FC<NoteInputModalProps> = ({
  visible,
  activityName,
  onClose,
  onSubmit,
}) => {
  const { colors, isDark } = useTheme();
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible) setNote('');
  }, [visible]);

  // Handle hardware back button
  useEffect(() => {
    if (visible) {
      const backAction = () => {
        onClose();
        return true;
      };
      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => backHandler.remove();
    }
  }, [visible, onClose]);

  const handleSubmit = () => {
    const trimmed = note.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  const canSubmit = note.trim().length > 0;

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View entering={FadeIn.duration(120)} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.kavWrapper, { zIndex: 1 }]}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        pointerEvents="box-none"
      >
        <View style={styles.kavInner} pointerEvents="box-none">
          <Animated.View
            entering={SlideInDown.duration(220).easing(Easing.out(Easing.cubic))}
            exiting={SlideOutDown.duration(160).easing(Easing.in(Easing.cubic))}
            style={[styles.sheet, { backgroundColor: colors.surface }]}
          >
            {/* Handle bar */}
            <View style={[styles.handleBar, { backgroundColor: colors.surfaceVariant }]} />

            {/* Header */}
            <View style={styles.headerRow}>
              <View style={[styles.iconWrap, { backgroundColor: isDark ? Colors.dark.primaryContainer : Colors.primaryContainer }]}>
                <FontAwesome5 name="sticky-note" size={16} color={Colors.primary} />
              </View>
              <View style={styles.headerText}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>Add a Note</Text>
                {activityName ? (
                  <Text style={[styles.activityLabel, { color: Colors.primary }]}>{activityName}</Text>
                ) : null}
              </View>
              {/* Close button */}
              <Pressable
                onPress={onClose}
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

            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Write a short note about today's log — what did you do, how did it go?
            </Text>

            {/* Note input */}
            <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: Colors.primary }]}>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="e.g., Read 15 pages of Clean Code"
                placeholderTextColor={Colors.textDisabled}
                value={note}
                onChangeText={setNote}
                multiline
                maxLength={280}
                selectionColor={Colors.primary}
                textAlignVertical="top"
              />
            </View>

            {/* Character count */}
            <Text style={[styles.charCount, { color: note.length > 250 ? Colors.warning : colors.textSecondary }]}>
              {note.length}/280
            </Text>

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
                style={[styles.btnSubmit, !canSubmit && styles.btnSubmitDisabled]}
                onPress={handleSubmit}
                disabled={!canSubmit}
                activeOpacity={0.8}
              >
                <FontAwesome5 name="check" size={14} color="#FFFFFF" style={styles.submitIcon} />
                <Text style={styles.btnSubmitText}>Log & Save Note</Text>
              </TouchableOpacity>
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
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  kavWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  kavInner: {
    justifyContent: 'flex-end',
    flex: 1,
  },
  sheet: {
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
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...Typography.headlineLarge,
  },
  activityLabel: {
    ...Typography.labelMedium,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
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
  input: {
    ...Typography.bodyLarge,
    lineHeight: 22,
    minHeight: 90,
  },
  charCount: {
    ...Typography.bodySmall,
    textAlign: 'right',
    marginBottom: Spacing.lg,
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
  btnSubmit: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  btnSubmitDisabled: {
    backgroundColor: Colors.textDisabled,
  },
  submitIcon: {
    marginRight: 4,
  },
  btnSubmitText: {
    ...Typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
