import React, { useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useDerivedValue,
} from 'react-native-reanimated';
import { FontAwesome5 } from '@expo/vector-icons';
import { BorderRadius, Spacing, Typography, Spring } from '../../constants';
import { useTheme } from '../../hooks/useTheme';
import { haptics } from '../../utils/haptics';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: string;
  count?: number;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * Tab switcher with a thumb that slides between segments.
 *
 * The previous version swapped each button's background colour on selection,
 * so switching tabs was an instant hard cut with no sense of the two options
 * belonging to one control.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { colors, elevation } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);

  const index = Math.max(0, options.findIndex(o => o.value === value));
  const segmentWidth = trackWidth > 0 ? (trackWidth - PADDING * 2) / options.length : 0;

  const offset = useDerivedValue(() => withSpring(index * segmentWidth, Spring.gentle));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
    width: segmentWidth,
  }));

  const handleLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.track,
        { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
      ]}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          style={[
            styles.thumb,
            elevation.low,
            { backgroundColor: colors.surface },
            thumbStyle,
          ]}
        />
      ) : null}

      {options.map(option => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={styles.segment}
            onPress={() => {
              if (!active) haptics.light();
              onChange(option.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={
              option.count !== undefined
                ? `${option.label}, ${option.count} items`
                : option.label
            }
          >
            {option.icon ? (
              <FontAwesome5
                name={option.icon}
                size={12}
                color={active ? colors.primary : colors.textTertiary}
              />
            ) : null}
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                { color: active ? colors.textPrimary : colors.textSecondary },
              ]}
            >
              {option.label}
            </Text>
            {option.count !== undefined ? (
              <Text
                style={[
                  styles.count,
                  { color: active ? colors.primary : colors.textTertiary },
                ]}
              >
                {option.count}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const PADDING = 4;

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: PADDING,
    position: 'relative',
  },
  thumb: {
    position: 'absolute',
    top: PADDING,
    bottom: PADDING,
    left: PADDING,
    borderRadius: BorderRadius.sm,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm + 1,
  },
  label: {
    ...Typography.labelLarge,
    fontWeight: '600',
  },
  count: {
    ...Typography.labelMedium,
    fontWeight: '700',
  },
});
