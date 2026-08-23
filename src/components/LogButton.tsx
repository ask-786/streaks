import React, { useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { Text } from 'react-native-paper';
import { FontAwesome5 } from '@expo/vector-icons';
import { BorderRadius, Spacing, Typography, Spring, alpha } from '../constants';
import { useTheme } from '../hooks/useTheme';
import { haptics } from '../utils/haptics';
import { PressableScale } from './ui';

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
 * LogButton — the primary CTA.
 *
 * Four terminal states, each with its own colour language rather than the same
 * pill in three tints: actionable (filled brand with a coloured glow), done
 * (success, quiet), goal reached (amber, quiet), locked (sunken with a lock and
 * the reason inline, so the user never has to guess why it won't respond).
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
  const { colors, elevation } = useTheme();

  const celebrate = useSharedValue(0);

  // Celebration pop when the day flips to logged.
  useEffect(() => {
    if (isLogged || isCompleted) {
      celebrate.value = 0;
      celebrate.value = withSequence(withSpring(1, Spring.bouncy), withSpring(0, Spring.gentle));
    }
  }, [isLogged, isCompleted]);

  const isActionable = !isLogged && !isCompleted && !disabled && !isLoading;

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + celebrate.value * 0.06 }],
  }));

  const handlePress = () => {
    if (isCompleted || isLogged || isLoading) return;
    if (disabled) {
      haptics.warning();
      return;
    }
    // No success pulse here: the press may only open a note prompt. The screen
    // owning the flow fires it once the streak is actually logged.
    onPress();
  };

  const state = isCompleted ? 'completed' : isLogged ? 'logged' : disabled ? 'locked' : 'ready';

  const visuals = {
    ready: {
      bg: colors.primary,
      fg: colors.onPrimary,
      border: 'transparent',
      icon: 'fire' as const,
      label: isLoading ? 'Logging…' : 'Log Today',
    },
    logged: {
      bg: colors.successMuted,
      fg: colors.success,
      border: colors.successBorder,
      icon: 'check' as const,
      label: 'Logged Today',
    },
    completed: {
      bg: colors.warningMuted,
      fg: colors.warning,
      border: colors.warningBorder,
      icon: 'trophy' as const,
      label: 'Goal Achieved',
    },
    locked: {
      bg: colors.surfaceVariant,
      fg: colors.textDisabled,
      border: colors.border,
      icon: disabledKind === 'too_late' ? 'lock' : 'hourglass-half',
      label: disabledKind === 'too_late' ? 'Window Passed' : 'Not Yet Open',
    },
  }[state];

  return (
    <View style={styles.wrapper}>
      <Animated.View style={containerStyle}>
        <PressableScale
          onPress={handlePress}
          haptic={false}
          scaleTo={isActionable ? 0.96 : 0.99}
          style={[
            styles.button,
            {
              backgroundColor: visuals.bg,
              borderColor: visuals.border,
              borderWidth: state === 'ready' ? 0 : StyleSheet.hairlineWidth,
            },
            state === 'ready' ? elevation.brandGlow(colors.primary) : null,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: state !== 'ready', busy: isLoading }}
          accessibilityLabel={
            state === 'locked' && disabledReason
              ? `${visuals.label}. ${disabledReason}`
              : visuals.label
          }
        >
          <View style={styles.row}>
            {isLoading ? (
              <ActivityIndicator size="small" color={visuals.fg} />
            ) : (
              <View
                style={[
                  styles.iconChip,
                  {
                    backgroundColor:
                      state === 'ready' ? alpha('#FFFFFF', 0.18) : alpha(visuals.fg, 0.14),
                  },
                ]}
              >
                <FontAwesome5 name={visuals.icon} size={14} color={visuals.fg} />
              </View>
            )}
            <Text style={[styles.label, { color: visuals.fg }]}>{visuals.label}</Text>
          </View>

          {state === 'locked' && disabledReason ? (
            <Text style={[styles.hint, { color: colors.textTertiary }]}>{disabledReason}</Text>
          ) : null}
        </PressableScale>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    // No `alignItems: 'center'` here on purpose: that shrink-wraps the child,
    // which leaves the button's `width: '100%'` with an auto-width parent to
    // resolve against, so it silently collapses to hug its label.
    width: '100%',
  },
  button: {
    width: '100%',
    minHeight: 58,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md - 2,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  iconChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...Typography.titleLarge,
    fontSize: 16.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  hint: {
    ...Typography.caption,
    marginTop: 5,
    textAlign: 'center',
  },
});
