import React, { useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { FontAwesome5 } from '@expo/vector-icons';
import { HabitAlarm } from '../../modules/habit-alarm';
import { Spacing, Typography, BorderRadius, alpha } from '../constants';
import { useTheme } from '../hooks/useTheme';

const canUseFullScreen = () => HabitAlarm?.canUseFullScreenIntent() ?? true;

/**
 * Android 14+ lets the user switch off full-screen alerts per app. Without them
 * an alarm still rings, but only as a heads-up instead of taking over the lock
 * screen. Shown only in that case, and it links to the setting.
 */
export const FullScreenAlarmHint: React.FC = () => {
  const { colors } = useTheme();
  const [allowed, setAllowed] = useState(canUseFullScreen);

  // Re-check on return from system settings.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setAllowed(canUseFullScreen());
    });
    return () => subscription.remove();
  }, []);

  if (allowed) return null;

  return (
    <Pressable
      onPress={() => HabitAlarm?.openFullScreenIntentSettings()}
      style={({ pressed }) => [
        styles.hint,
        { backgroundColor: alpha(colors.warning, 0.12), opacity: pressed ? 0.7 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Allow full-screen alarms in system settings"
    >
      <FontAwesome5 name="exclamation-triangle" size={12} color={colors.warning} />
      <Text style={[styles.text, { color: colors.textPrimary }]}>
        Full-screen alarms are off for this app, so alarms only show as a notification. Tap to
        allow.
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  text: {
    ...Typography.caption,
    flex: 1,
  },
});
