import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Spacing, Typography } from '../../constants';
import { useTheme } from '../../hooks/useTheme';

export interface ScreenHeaderProps {
  /** Small all-caps line above the title. Gives the page a sense of place. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Rendered flush right, vertically centred against the title block. */
  action?: React.ReactNode;
  delay?: number;
}

/**
 * Consistent page masthead. Every screen previously rolled its own title with a
 * slightly different size and margin; this fixes the rhythm across all of them.
 */
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  action,
  delay = 0,
}) => {
  const { colors } = useTheme();

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.row}>
      <View style={styles.text}>
        {eyebrow ? (
          <Text style={[styles.eyebrow, { color: colors.textTertiary }]}>{eyebrow}</Text>
        ) : null}
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  text: {
    flex: 1,
  },
  eyebrow: {
    ...Typography.overline,
    marginBottom: 5,
  },
  title: {
    ...Typography.headlineLarge,
  },
  subtitle: {
    ...Typography.bodyMedium,
    marginTop: 3,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
