import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { FontAwesome5 } from '@expo/vector-icons';
import { BorderRadius, Spacing, Typography, alpha } from '../../constants';
import { useTheme } from '../../hooks/useTheme';

export type ChipTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'accent';

export interface ChipProps {
  label: string;
  icon?: string;
  tone?: ChipTone;
  /** Filled reads louder; outline is for secondary metadata. */
  variant?: 'soft' | 'outline';
  trailing?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Compact status pill. Replaces the six near-identical chip styles that were
 * copy-pasted across the dashboard and modals.
 */
export const Chip: React.FC<ChipProps> = ({
  label,
  icon,
  tone = 'neutral',
  variant = 'soft',
  trailing,
  style,
}) => {
  const { colors } = useTheme();

  const { fg, bg, border } = (() => {
    switch (tone) {
      case 'brand':
        return { fg: colors.primary, bg: colors.primaryMuted, border: colors.primaryBorder };
      case 'success':
        return { fg: colors.success, bg: colors.successMuted, border: colors.successBorder };
      case 'warning':
        return { fg: colors.warning, bg: colors.warningMuted, border: colors.warningBorder };
      case 'danger':
        return { fg: colors.danger, bg: colors.dangerMuted, border: colors.dangerBorder };
      case 'accent':
        return { fg: colors.accent, bg: colors.accentMuted, border: alpha(colors.accent, 0.3) };
      default:
        return {
          fg: colors.textSecondary,
          bg: colors.surfaceVariant,
          border: colors.border,
        };
    }
  })();

  return (
    <View
      style={[
        styles.chip,
        variant === 'soft'
          ? { backgroundColor: bg, borderColor: 'transparent' }
          : { backgroundColor: 'transparent', borderColor: border },
        style,
      ]}
    >
      {icon ? <FontAwesome5 name={icon} size={10} color={fg} /> : null}
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
      {trailing ? (
        <Text style={[styles.trailing, { color: fg }]}>{trailing}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
  },
  label: {
    ...Typography.labelMedium,
    fontWeight: '600',
  },
  trailing: {
    ...Typography.labelMedium,
    fontWeight: '700',
    opacity: 0.65,
    marginLeft: 1,
  },
});
