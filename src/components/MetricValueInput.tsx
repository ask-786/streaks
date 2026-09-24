import React from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Text } from 'react-native-paper';
import { Spacing, Typography, BorderRadius } from '../constants';
import { useTheme } from '../hooks/useTheme';
import {
  HabitMetric,
  MetricValueDraft,
  getUnitDef,
  parseValueDraft,
} from '../features/metrics/metrics';

const FIELD_LABELS = { h: 'h', m: 'min', s: 'sec' } as const;

export interface MetricValueInputProps {
  metric: Pick<HabitMetric, 'kind' | 'unit'>;
  draft: MetricValueDraft;
  onChange: (draft: MetricValueDraft) => void;
  /** Field fill; differs between sheets and cards. */
  fieldBackground: string;
  autoFocus?: boolean;
  /** Attached to the first field, for callers that focus it after an animation. */
  inputRef?: React.Ref<TextInput>;
  accessibilityLabel?: string;
}

/**
 * Number entry in a metric's display unit: one decimal field with the unit
 * beside it, or clock fields (h + min, min + sec) for time and pace. Shows why
 * a value can't be used, so callers only need `parseValueDraft` to gate saving.
 */
export const MetricValueInput: React.FC<MetricValueInputProps> = ({
  metric,
  draft,
  onChange,
  fieldBackground,
  autoFocus,
  inputRef,
  accessibilityLabel = 'Value',
}) => {
  const { colors } = useTheme();
  const unit = getUnitDef(metric);
  const parsed = parseValueDraft(metric, draft);
  const invalid = parsed.state === 'invalid';
  const borderColor = invalid ? colors.danger : colors.border;
  const textColor = invalid ? colors.danger : colors.textPrimary;

  return (
    <View style={styles.container}>
      {unit.fields ? (
        <View style={styles.row}>
          {unit.fields.map((field, i) => (
            <View
              key={field}
              style={[
                styles.shell,
                styles.clockShell,
                { backgroundColor: fieldBackground, borderColor },
              ]}
            >
              <TextInput
                ref={i === 0 ? inputRef : undefined}
                style={[styles.input, { color: textColor }]}
                placeholder="0"
                placeholderTextColor={colors.textDisabled}
                value={draft[field]}
                onChangeText={(text) => onChange({ ...draft, [field]: text })}
                keyboardType="number-pad"
                maxLength={i === 0 ? 4 : 2}
                autoFocus={autoFocus && i === 0}
                selectionColor={colors.primary}
                accessibilityLabel={`${accessibilityLabel}, ${FIELD_LABELS[field]}`}
              />
              <Text style={[styles.affix, { color: colors.textTertiary }]}>
                {FIELD_LABELS[field]}
              </Text>
            </View>
          ))}
          {unit.suffix ? (
            <Text style={[styles.trailing, { color: colors.textTertiary }]}>
              {unit.suffix.trim()}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={[styles.shell, { backgroundColor: fieldBackground, borderColor }]}>
          {unit.prefix ? (
            <Text style={[styles.affix, { color: colors.textTertiary }]}>{unit.prefix}</Text>
          ) : null}
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: textColor }]}
            placeholder="0"
            placeholderTextColor={colors.textDisabled}
            value={draft.num}
            onChangeText={(num) => onChange({ ...draft, num })}
            keyboardType="decimal-pad"
            maxLength={10}
            autoFocus={autoFocus}
            selectionColor={colors.primary}
            accessibilityLabel={accessibilityLabel}
          />
          {unit.suffix ? (
            <Text style={[styles.affix, { color: colors.textTertiary }]}>{unit.suffix.trim()}</Text>
          ) : null}
        </View>
      )}
      {parsed.state === 'invalid' ? (
        <Text style={[styles.error, { color: colors.danger }]}>{parsed.reason}</Text>
      ) : null}
    </View>
  );
};

const FIELD_HEIGHT = 48;

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: FIELD_HEIGHT,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
  },
  clockShell: {
    flex: 1,
  },
  input: {
    ...Typography.bodyLarge,
    flex: 1,
    height: FIELD_HEIGHT,
    paddingVertical: 0,
    fontVariant: ['tabular-nums'],
  },
  affix: {
    ...Typography.labelLarge,
  },
  trailing: {
    ...Typography.labelLarge,
  },
  error: {
    ...Typography.caption,
    marginLeft: 2,
  },
});
