import React, { useEffect } from 'react';
import { StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Text } from 'react-native-paper';
import { FontAwesome5 } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing, Typography } from '../constants';

interface LogButtonProps {
  onPress: () => void;
  isLogged: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  disabledKind?: 'too_early' | 'too_late';
  isCompleted?: boolean;
}

/**
 * LogButton — The primary CTA button.
 * Animates with a "pop" spring on press and transitions to a "Done" state
 * once the user has logged today. Supports a disabled state for time-bound habits.
 */
export const LogButton: React.FC<LogButtonProps> = ({
  onPress,
  isLogged,
  isLoading = false,
  disabled = false,
  disabledReason,
  disabledKind,
  isCompleted = false,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Transition animation when isLogged changes to true
  useEffect(() => {
    if (isLogged || isCompleted) {
      scale.value = withSequence(
        withSpring(1.15, { damping: 4, stiffness: 200 }),
        withSpring(1, { damping: 8, stiffness: 150 })
      );
    }
  }, [isLogged, isCompleted]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePress = () => {
    if (isCompleted || isLogged || isLoading || disabled) return;

    // Quick bounce on press
    scale.value = withSequence(
      withSpring(0.92, { damping: 5, stiffness: 300 }),
      withSpring(1, { damping: 6, stiffness: 200 })
    );
    opacity.value = withSequence(
      withTiming(0.8, { duration: 80 }),
      withTiming(1, { duration: 120 })
    );

    onPress();
  };

  const isDisabled = isCompleted || isLogged || disabled;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={[
          styles.button,
          isCompleted
            ? styles.buttonCompleted
            : isLogged
            ? styles.buttonLogged
            : disabled
            ? styles.buttonDisabled
            : styles.buttonActive,
        ]}
        onPress={handlePress}
        disabled={isDisabled}
      >
        <Text
          style={[
            styles.buttonText,
            isCompleted && styles.buttonTextCompleted,
            isLogged && !isCompleted && styles.buttonTextLogged,
            disabled && !isLogged && !isCompleted && styles.buttonTextDisabled,
          ]}
        >
          {isCompleted ? (
            <><FontAwesome5 name="trophy" size={20} />{'  '}Goal Achieved</>
          ) : isLogged ? (
            <><FontAwesome5 name="check-circle" size={20} />{'  '}Logged Today!</>
          ) : isLoading ? (
            'Logging...'
          ) : disabled ? (
            disabledKind === 'too_late'
              ? <><FontAwesome5 name="clock" size={18} />{'  '}Window Passed</>
              : <><FontAwesome5 name="clock" size={18} />{'  '}Not Yet Time</>
          ) : (
            <><FontAwesome5 name="fire" size={20} />{'  '}Log Today</>
          )}
        </Text>
        {disabled && disabledReason ? (
          <Text style={styles.disabledHint}>{disabledReason}</Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 220,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    shadowOpacity: 0.25,
    elevation: 8,
  },
  buttonActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
  },
  buttonLogged: {
    backgroundColor: Colors.successLight,
    shadowColor: Colors.success,
    elevation: 2,
  },
  buttonCompleted: {
    backgroundColor: Colors.warningLight,
    shadowColor: Colors.warning,
    elevation: 2,
  },
  buttonDisabled: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.textDisabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    ...Typography.titleLarge,
    color: Colors.textOnPrimary,
    textAlign: 'center',
    paddingVertical: Spacing.xs,
  },
  buttonTextLogged: {
    color: Colors.success,
  },
  buttonTextCompleted: {
    color: Colors.warning,
  },
  buttonTextDisabled: {
    color: Colors.textDisabled,
  },
  disabledHint: {
    ...Typography.bodySmall,
    color: Colors.textDisabled,
    textAlign: 'center',
    marginTop: 2,
    paddingBottom: 2,
  },
});
