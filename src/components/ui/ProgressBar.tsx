import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { BorderRadius, Spring, alpha } from '../../constants';
import { useTheme } from '../../hooks/useTheme';

export interface ProgressBarProps {
  /** 0–1. Values outside the range are clamped. */
  value: number;
  color?: string;
  trackColor?: string;
  height?: number;
  /** Ticks marking each segment — reads as "3 of 5" without a label. */
  segments?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Progress bar that animates to its value instead of snapping. The optional
 * segment ticks turn an abstract percentage into countable units, which is what
 * a weekly goal actually is.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  color,
  trackColor,
  height = 8,
  segments,
  delay = 120,
  style,
}) => {
  const { colors } = useTheme();
  const fillColor = color ?? colors.primary;
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(delay, withSpring(clamped, Spring.gentle));
  }, [clamped, delay]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View
      style={[
        styles.track,
        {
          height,
          borderRadius: height / 2,
          backgroundColor: trackColor ?? colors.surfaceVariant,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          fillStyle,
          { backgroundColor: fillColor, borderRadius: height / 2 },
        ]}
      />
      {segments && segments > 1 ? (
        <View style={styles.ticks} pointerEvents="none">
          {Array.from({ length: segments - 1 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.tick,
                {
                  left: `${((i + 1) / segments) * 100}%`,
                  backgroundColor: alpha(colors.background, 0.9),
                },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  ticks: {
    ...StyleSheet.absoluteFillObject,
  },
  tick: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
  },
});
