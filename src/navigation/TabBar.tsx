import React, { useState } from 'react';
import { View, StyleSheet, Pressable, LayoutChangeEvent } from 'react-native';
import { Text } from 'react-native-paper';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, withSpring, useDerivedValue } from 'react-native-reanimated';
import { FontAwesome5 } from '@expo/vector-icons';
import { BorderRadius, Spacing, Typography, Spring, ScreenPadding } from '../constants';
import { useTheme } from '../hooks/useTheme';
import { haptics } from '../utils/haptics';

const ICONS: Record<string, string> = {
  Dashboard: 'home',
  Calendar: 'calendar-alt',
  Stats: 'chart-bar',
};

/**
 * Floating tab bar with a thumb that tracks the active route.
 *
 * The stock bar is a full-bleed strip whose only active cue is a tint change.
 * Detaching it from the edge and giving the selection a physical object to move
 * makes the app's primary navigation feel deliberate rather than default.
 */
export const TabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const { colors, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);

  const count = state.routes.length;
  const tabWidth = barWidth > 0 ? (barWidth - PAD * 2) / count : 0;

  const offset = useDerivedValue(() => withSpring(state.index * tabWidth, Spring.gentle));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
    width: tabWidth,
  }));

  const handleLayout = (e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width);

  return (
    <View
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}
      pointerEvents="box-none"
    >
      <View
        onLayout={handleLayout}
        style={[styles.bar, elevation.high, { backgroundColor: colors.surface }]}
      >
        {tabWidth > 0 ? (
          <Animated.View
            style={[styles.thumb, thumbStyle, { backgroundColor: colors.primaryMuted }]}
          />
        ) : null}

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : (options.title ?? route.name);

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              haptics.light();
              navigation.navigate(route.name as never);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
            >
              <FontAwesome5
                name={ICONS[route.name] ?? 'circle'}
                size={17}
                color={focused ? colors.primary : colors.textTertiary}
                solid={focused}
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  {
                    color: focused ? colors.primary : colors.textTertiary,
                    fontWeight: focused ? '700' : '600',
                  },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const PAD = 6;

const styles = StyleSheet.create({
  container: {
    /**
     * Deliberately in normal flow, NOT `position: absolute`.
     *
     * Absolute positioning makes the bar overlay the screen, which means a
     * screen's scene extends the full height behind it — and every bottom sheet
     * in the app is an `absoluteFill` overlay inside its scene, so its action row
     * ends up underneath the bar with no z-index that can save it (the bar is a
     * sibling of the whole scene). Occupying real layout space keeps the scene
     * ending at the bar's top edge, which is what makes those sheets land
     * correctly. The margins below still give it a floating look.
     */
    paddingHorizontal: ScreenPadding,
    paddingTop: Spacing.sm,
  },
  bar: {
    flexDirection: 'row',
    borderRadius: BorderRadius.xxl,
    padding: PAD,
    position: 'relative',
  },
  thumb: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: BorderRadius.xl,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.sm + 2,
  },
  label: {
    ...Typography.labelMedium,
    fontSize: 11,
  },
});
