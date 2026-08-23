import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FontAwesome5 } from '@expo/vector-icons';
import { BorderRadius, Spacing, Typography, alpha } from '../../constants';
import { useTheme } from '../../hooks/useTheme';
import { PressableScale } from './PressableScale';

export interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  /** An empty screen with no way forward is a dead end — give it an action. */
  actionLabel?: string;
  onAction?: () => void;
  delay?: number;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  delay = 100,
}) => {
  const { colors } = useTheme();

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.container}>
      <View
        style={[
          styles.iconHalo,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={[styles.iconInner, { backgroundColor: alpha(colors.primary, 0.1) }]}>
          <FontAwesome5 name={icon} size={26} color={colors.primary} />
        </View>
      </View>

      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>

      {actionLabel && onAction ? (
        <PressableScale
          onPress={onAction}
          scaleTo={0.95}
          style={[styles.action, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <FontAwesome5 name="plus" size={12} color={colors.onPrimary} />
          <Text style={[styles.actionLabel, { color: colors.onPrimary }]}>{actionLabel}</Text>
        </PressableScale>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  iconHalo: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  iconInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.headlineMedium,
    textAlign: 'center',
    marginBottom: Spacing.xs + 2,
  },
  description: {
    ...Typography.bodyMedium,
    textAlign: 'center',
    maxWidth: 300,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.full,
  },
  actionLabel: {
    ...Typography.labelLarge,
  },
});
