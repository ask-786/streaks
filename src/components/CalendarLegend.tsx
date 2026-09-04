import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Spacing, Typography, BorderRadius } from '../constants';
import { useTheme } from '../hooks/useTheme';

/**
 * CalendarLegend — decodes the day markers.
 *
 * Each swatch is rendered at the same size and radius as a real calendar cell
 * so the mapping is literal rather than a dot the user has to translate.
 */
export const CalendarLegend: React.FC = () => {
  const { colors, calendar } = useTheme();

  const items: { bg: string; fg: string; border?: string; label: string; sample: string }[] = [
    { bg: calendar.logged, fg: calendar.loggedText, label: 'Logged', sample: '1' },
    { bg: calendar.missed, fg: calendar.missedText, label: 'Missed', sample: '2' },
    { bg: calendar.today, fg: calendar.todayText, label: 'Today', sample: '3' },
    {
      bg: calendar.backfilled,
      fg: calendar.backfilledText,
      border: calendar.backfilledBorder,
      label: 'Fixed later',
      sample: '4',
    },
  ];

  return (
    <View style={styles.row}>
      {items.map(({ bg, fg, border, label, sample }) => (
        <View key={label} style={styles.item}>
          <View
            style={[
              styles.swatch,
              { backgroundColor: bg },
              border ? { borderWidth: 1, borderColor: border } : null,
            ]}
          >
            <Text style={[styles.swatchText, { color: fg }]}>{sample}</Text>
          </View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    rowGap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchText: {
    fontSize: 11,
    fontWeight: '700',
  },
  label: {
    ...Typography.caption,
  },
});
