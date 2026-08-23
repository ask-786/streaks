import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { BorderRadius, Spacing } from '../../constants';
import { useTheme } from '../../hooks/useTheme';

export type CardElevation = 'flat' | 'low' | 'medium' | 'high';
export type CardTone = 'default' | 'sunken' | 'brand' | 'success' | 'warning' | 'danger';

export interface CardProps {
  children: React.ReactNode;
  /** Depth. Defaults to `low` — reserve `medium`+ for the hero surface. */
  elevation?: CardElevation;
  tone?: CardTone;
  padding?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * The single surface primitive. Every card in the app goes through this so
 * radius, ring and shadow stay in lockstep — previously each screen re-declared
 * its own `shadowOpacity: 0.06` block and they drifted apart.
 */
export const Card: React.FC<CardProps> = ({
  children,
  elevation = 'low',
  tone = 'default',
  padding = Spacing.md,
  radius = BorderRadius.lg,
  style,
}) => {
  const { colors, elevation: depth } = useTheme();

  const toneStyle: ViewStyle = (() => {
    switch (tone) {
      case 'sunken':
        return { backgroundColor: colors.surfaceSunken };
      case 'brand':
        return { backgroundColor: colors.primaryMuted, borderColor: colors.primaryBorder };
      case 'success':
        return { backgroundColor: colors.successMuted, borderColor: colors.successBorder };
      case 'warning':
        return { backgroundColor: colors.warningMuted, borderColor: colors.warningBorder };
      case 'danger':
        return { backgroundColor: colors.dangerMuted, borderColor: colors.dangerBorder };
      default:
        return { backgroundColor: colors.surface };
    }
  })();

  return (
    <View style={[depth[elevation], { borderRadius: radius, padding }, toneStyle, style]}>
      {children}
    </View>
  );
};
