import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { FontAwesome5 } from '@expo/vector-icons';
import { BorderRadius, Spacing, Typography, Spring, alpha } from '../../constants';
import { useTheme } from '../../hooks/useTheme';
import { Card } from './Card';

export interface StatTileProps {
  label: string;
  value: number | string;
  /** Appended after the value in a lighter weight, e.g. "days". */
  unit?: string;
  icon?: string;
  /** Drives the icon chip and the numeral. Defaults to brand. */
  accent?: string;
  /** Faint wash behind the icon chip. Derived from `accent` when omitted. */
  accentMuted?: string;
  caption?: string;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A single headline metric.
 *
 * Deliberately quiet: the numeral carries the colour and everything else stays
 * neutral. The previous badges filled the whole tile with a pastel wash, which
 * made two side-by-side stats compete instead of read as a set.
 */
export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  unit,
  icon,
  accent,
  accentMuted,
  caption,
  delay = 0,
  style,
}) => {
  const { colors } = useTheme();
  const tint = accent ?? colors.primary;
  const wash = accentMuted ?? alpha(tint, 0.12);

  const pop = useSharedValue(0.94);
  useEffect(() => {
    pop.value = withDelay(delay, withSpring(1, Spring.bouncy));
  }, [delay]);

  const numeralStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));

  return (
    <Card elevation="low" padding={Spacing.md} style={[styles.card, style]}>
      <View style={styles.head}>
        {icon ? (
          <View style={[styles.iconChip, { backgroundColor: wash }]}>
            <FontAwesome5 name={icon} size={13} color={tint} />
          </View>
        ) : null}
        <Text style={[styles.label, { color: colors.textTertiary }]} numberOfLines={1}>
          {label}
        </Text>
      </View>

      <Animated.View style={[styles.valueRow, numeralStyle]}>
        <Text style={[styles.value, { color: tint }]}>{value}</Text>
        {unit ? <Text style={[styles.unit, { color: colors.textTertiary }]}>{unit}</Text> : null}
      </Animated.View>

      {caption ? (
        <Text style={[styles.caption, { color: colors.textTertiary }]} numberOfLines={1}>
          {caption}
        </Text>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconChip: {
    width: 26,
    height: 26,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...Typography.overline,
    flex: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: Spacing.sm + 2,
    transformOrigin: 'left bottom',
  },
  value: {
    ...Typography.numeralLarge,
  },
  unit: {
    ...Typography.titleMedium,
  },
  caption: {
    ...Typography.caption,
    marginTop: 2,
  },
});
