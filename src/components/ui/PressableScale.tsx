import React, { useCallback } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { PressInDelay, Spring } from '../../constants';
import { haptics } from '../../utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** How far it sinks. Large targets want less travel than small ones. */
  scaleTo?: number;
  /** Fires a light tick on press-in. Off for anything that repeats rapidly. */
  haptic?: boolean;
  /**
   * How long the touch must hold still before it reads as a press. Defaults to
   * `PressInDelay`, which is what keeps a scrolling finger from triggering
   * press-in feedback. Pass 0 for a control outside any scrollable area that
   * wants its feedback on contact.
   */
  pressDelay?: number;
}

/**
 * Press feedback that actually responds to the finger.
 *
 * `activeOpacity` — which this app used everywhere — only fades the element and
 * reads as unresponsive on modern hardware. A spring-driven scale gives the
 * touch somewhere to go, and it settles rather than snapping back.
 */
export const PressableScale: React.FC<PressableScaleProps> = ({
  children,
  style,
  scaleTo = 0.97,
  haptic = true,
  pressDelay = PressInDelay,
  onPressIn,
  onLongPress,
  disabled,
  ...rest
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (e: any) => {
      scale.value = withSpring(scaleTo, Spring.snappy);
      if (haptic && !disabled) haptics.light();
      onPressIn?.(e);
    },
    [scaleTo, haptic, disabled, onPressIn],
  );

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, Spring.snappy);
  }, []);

  const handleLongPress = useCallback(
    (e: any) => {
      if (onLongPress) {
        haptics.longPress();
        onLongPress(e);
      }
    },
    [onLongPress],
  );

  return (
    <AnimatedPressable
      style={[animatedStyle, style]}
      unstable_pressDelay={pressDelay}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={onLongPress ? handleLongPress : undefined}
      disabled={disabled}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
};
