import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { FontAwesome5 } from '@expo/vector-icons';
import { BorderRadius, ScreenPadding, Spacing, Typography } from '../../constants';
import { useTheme } from '../../hooks/useTheme';
import { PressableScale } from './PressableScale';

export interface SelectionAction {
  icon: string;
  label: string;
  tone?: 'neutral' | 'brand' | 'danger';
  disabled?: boolean;
  onPress: () => void;
}

export interface SelectionActionBarProps {
  actions: SelectionAction[];
  /** Safe-area bottom inset, so the bar clears the gesture pill. */
  bottomInset?: number;
}

/**
 * Contextual actions for whatever is currently selected.
 *
 * Bulk actions live in one fixed place at the bottom of the screen rather than
 * on the rows themselves: the targets are thumb-height, every action carries a
 * word as well as a glyph, and nothing overlaps the content the user is
 * choosing from.
 */
export const SelectionActionBar: React.FC<SelectionActionBarProps> = ({
  actions,
  bottomInset = 0,
}) => {
  const { colors, elevation } = useTheme();

  return (
    <Animated.View
      entering={SlideInDown.duration(220)}
      exiting={SlideOutDown.duration(160)}
      style={[
        styles.bar,
        elevation.high,
        {
          backgroundColor: colors.surfaceRaised,
          bottom: Spacing.md + bottomInset,
        },
      ]}
    >
      {actions.map((action) => {
        const tint = action.disabled
          ? colors.textDisabled
          : action.tone === 'danger'
            ? colors.danger
            : action.tone === 'brand'
              ? colors.primary
              : colors.textSecondary;

        return (
          <PressableScale
            key={action.label}
            onPress={action.onPress}
            disabled={action.disabled}
            haptic={!action.disabled}
            scaleTo={0.93}
            style={styles.action}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            accessibilityState={{ disabled: !!action.disabled }}
          >
            <FontAwesome5 name={action.icon} size={16} color={tint} />
            <Text style={[styles.label, { color: tint }]}>{action.label}</Text>
          </PressableScale>
        );
      })}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: ScreenPadding,
    right: ScreenPadding,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.xl,
  },
  action: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  label: {
    ...Typography.labelMedium,
    fontWeight: '700',
  },
});
