import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { StatTile } from './ui';

interface StreakBadgeProps {
  label: string;
  count: number;
  icon?: string;
  accent?: string;
  accentLight?: string;
  unit?: string;
  caption?: string;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * StreakBadge — kept as a named concept because streaks are the app's headline
 * metric, but it now renders through the shared StatTile so it matches every
 * other number on screen.
 */
export const StreakBadge: React.FC<StreakBadgeProps> = ({
  label,
  count,
  icon = 'fire',
  accent,
  accentLight,
  unit,
  caption,
  delay = 0,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <StatTile
      label={label}
      value={count}
      unit={unit}
      icon={icon}
      accent={accent ?? colors.primary}
      accentMuted={accentLight}
      caption={caption}
      delay={delay}
      style={style}
    />
  );
};
