import React from 'react';
import { StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { BorderRadius, HitSlop, MinTouchTarget } from '../../constants';
import { useTheme } from '../../hooks/useTheme';
import { PressableScale } from './PressableScale';

export interface IconButtonProps {
  icon: string;
  iconLib?: 'fa5' | 'ionicons';
  onPress: () => void;
  size?: number;
  color?: string;
  /** `plain` has no chrome; `soft` sits on a tinted circle. */
  variant?: 'plain' | 'soft' | 'outline';
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Round icon affordance sized to a real touch target. The header cog was
 * previously a 19pt glyph with 4pt of padding — technically tappable, actually
 * a coin toss.
 */
export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  iconLib = 'fa5',
  onPress,
  size = 18,
  color,
  variant = 'soft',
  accessibilityLabel,
  style,
}) => {
  const { colors } = useTheme();
  const Glyph = iconLib === 'ionicons' ? Ionicons : FontAwesome5;
  const fg = color ?? colors.textSecondary;

  const chrome: ViewStyle =
    variant === 'soft'
      ? { backgroundColor: colors.surfaceVariant }
      : variant === 'outline'
        ? { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }
        : {};

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.9}
      hitSlop={HitSlop.md}
      style={[styles.button, chrome, style]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Glyph name={icon as any} size={size} color={fg} />
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  button: {
    width: MinTouchTarget,
    height: MinTouchTarget,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
