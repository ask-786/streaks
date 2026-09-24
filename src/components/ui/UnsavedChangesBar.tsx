import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { FadeIn } from 'react-native-reanimated';
import { BorderRadius, Spacing, Typography } from '../../constants';
import { useTheme } from '../../hooks/useTheme';
import { PressableScale } from './PressableScale';

export interface UnsavedChangesBarProps {
  onSave: () => void;
  onDiscard: () => void;
  canSave: boolean;
  /** Spoken label for the save button, e.g. "Save reminder". */
  saveAccessibilityLabel: string;
}

/**
 * Footer for a settings card with pending edits: a quiet status on the left,
 * Discard and Save on the right. Separated from the fields by a divider so it
 * reads as the card's actions, not as another field.
 */
export const UnsavedChangesBar: React.FC<UnsavedChangesBarProps> = ({
  onSave,
  onDiscard,
  canSave,
  saveAccessibilityLabel,
}) => {
  const { colors } = useTheme();

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      style={[styles.bar, { borderTopColor: colors.border }]}
    >
      <View style={styles.status}>
        <View style={[styles.dot, { backgroundColor: colors.warning }]} />
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>Unsaved changes</Text>
      </View>

      <PressableScale
        onPress={onDiscard}
        scaleTo={0.95}
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel="Discard changes"
      >
        <Text style={[styles.buttonText, { color: colors.textSecondary }]}>Discard</Text>
      </PressableScale>

      <PressableScale
        onPress={onSave}
        disabled={!canSave}
        haptic={false}
        scaleTo={0.95}
        style={[
          styles.button,
          styles.saveButton,
          { backgroundColor: canSave ? colors.primary : colors.surfaceVariant },
        ]}
        accessibilityRole="button"
        accessibilityLabel={saveAccessibilityLabel}
        accessibilityState={{ disabled: !canSave }}
      >
        <Text
          style={[styles.buttonText, { color: canSave ? colors.onPrimary : colors.textDisabled }]}
        >
          Save
        </Text>
      </PressableScale>
    </Animated.View>
  );
};

const BUTTON_HEIGHT = 40;

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  status: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...Typography.labelMedium,
  },
  button: {
    height: BUTTON_HEIGHT,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    minWidth: 88,
    paddingHorizontal: Spacing.lg,
  },
  buttonText: {
    ...Typography.labelLarge,
    fontWeight: '700',
  },
});
