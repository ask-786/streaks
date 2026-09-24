import React from 'react';
import { View, StyleSheet, TextInput, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { FontAwesome5 } from '@expo/vector-icons';
import { Spacing, Typography, BorderRadius } from '../constants';
import { useTheme } from '../hooks/useTheme';
import { haptics } from '../utils/haptics';
import { SegmentedControl } from './ui';
import { MetricValueInput } from './MetricValueInput';
import {
  HabitMetric,
  MetricCombine,
  MetricKind,
  MetricValueDraft,
  METRIC_KINDS,
  METRIC_KIND_ORDER,
  draftFromBase,
  emptyValueDraft,
  parseValueDraft,
} from '../features/metrics/metrics';

/** What the editor holds while the user picks; the target stays as typed text. */
export interface MetricDraft {
  kind: MetricKind;
  unit: string;
  label: string;
  required: boolean;
  combine: MetricCombine;
  target: MetricValueDraft;
}

export const toMetricDraft = (metric?: HabitMetric): MetricDraft => {
  if (!metric) {
    const def = METRIC_KINDS.duration;
    return {
      kind: def.kind,
      unit: def.defaultUnit,
      label: '',
      required: true,
      combine: def.combine,
      target: emptyValueDraft(),
    };
  }
  return {
    kind: metric.kind,
    unit: metric.unit,
    label: metric.label ?? '',
    required: !metric.optional,
    combine: metric.combine,
    target: draftFromBase(metric, metric.target),
  };
};

export const fromMetricDraft = (draft: MetricDraft): HabitMetric => {
  const target = parseValueDraft(draft, draft.target);
  return {
    kind: draft.kind,
    unit: draft.unit.trim(),
    combine: draft.combine,
    ...(draft.label.trim() ? { label: draft.label.trim() } : {}),
    ...(draft.required ? {} : { optional: true }),
    ...(draft.combine === 'sum' && target.state === 'ok' && target.value > 0
      ? { target: target.value }
      : {}),
  };
};

export const isMetricDraftValid = (draft: MetricDraft) =>
  parseValueDraft(draft, draft.target).state !== 'invalid';

const REQUIRED_OPTIONS = [
  { value: 'required' as const, label: 'Required', icon: 'lock' },
  { value: 'optional' as const, label: 'Optional', icon: 'unlock' },
];

const COMBINE_OPTIONS = [
  { value: 'sum' as const, label: 'Add up', icon: 'plus' },
  { value: 'latest' as const, label: 'Keep latest', icon: 'redo' },
];

export interface MetricEditorProps {
  draft: MetricDraft;
  onChange: (draft: MetricDraft) => void;
  /**
   * Set when the habit already has logged values. Switching to another kind
   * would leave those numbers meaning something else, so only the unit and
   * the rest can change.
   */
  kindLocked?: boolean;
  /** Field fill; differs between the bottom sheet and the settings cards. */
  fieldBackground: string;
}

/**
 * Kind, unit, label and rules for a habit's progress metric.
 */
export const MetricEditor: React.FC<MetricEditorProps> = ({
  draft,
  onChange,
  kindLocked = false,
  fieldBackground,
}) => {
  const { colors } = useTheme();
  const def = METRIC_KINDS[draft.kind];
  const update = (patch: Partial<MetricDraft>) => onChange({ ...draft, ...patch });

  const selectKind = (kind: MetricKind) => {
    if (kind === draft.kind) return;
    haptics.selection();
    const next = METRIC_KINDS[kind];
    update({ kind, unit: next.defaultUnit, combine: next.combine, target: emptyValueDraft() });
  };

  // Keep the target's meaning when the unit changes: 5 km becomes 3.11 mi, not 5 mi.
  const selectUnit = (unit: string) => {
    if (unit === draft.unit) return;
    haptics.selection();
    const target = parseValueDraft(draft, draft.target);
    update({
      unit,
      target:
        target.state === 'ok'
          ? draftFromBase({ kind: draft.kind, unit }, target.value)
          : draft.target,
    });
  };

  const kinds = kindLocked ? [draft.kind] : METRIC_KIND_ORDER;

  return (
    <View style={styles.container}>
      {/* Kind */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textTertiary }]}>What to track</Text>
        <View style={styles.pillWrap}>
          {kinds.map((kind) => {
            const selected = kind === draft.kind;
            const k = METRIC_KINDS[kind];
            return (
              <Pressable
                key={kind}
                onPress={() => selectKind(kind)}
                style={[
                  styles.pill,
                  {
                    backgroundColor: selected ? colors.primary : fieldBackground,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <FontAwesome5
                  name={k.icon}
                  size={11}
                  color={selected ? colors.onPrimary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.pillText,
                    { color: selected ? colors.onPrimary : colors.textSecondary },
                  ]}
                >
                  {k.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.caption, { color: colors.textSecondary }]}>
          {kindLocked
            ? 'This habit already has values logged, so the type stays as it is.'
            : def.examples}
        </Text>
      </View>

      {/* Unit */}
      {def.units.length > 0 || def.freeUnit ? (
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textTertiary }]}>Unit</Text>
          {def.units.length > 0 ? (
            <View style={styles.pillWrap}>
              {def.units.map((u) => {
                const selected = u.id === draft.unit;
                return (
                  <Pressable
                    key={u.id}
                    onPress={() => selectUnit(u.id)}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: selected ? colors.primaryMuted : fieldBackground,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        { color: selected ? colors.primary : colors.textSecondary },
                      ]}
                    >
                      {u.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          {def.freeUnit ? (
            <View
              style={[
                styles.inputShell,
                { backgroundColor: fieldBackground, borderColor: colors.border },
              ]}
            >
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder={def.freeUnit.placeholder}
                placeholderTextColor={colors.textDisabled}
                value={draft.unit}
                onChangeText={(unit) => update({ unit })}
                maxLength={16}
                autoCapitalize="none"
                selectionColor={colors.primary}
                accessibilityLabel="Unit"
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Label */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textTertiary }]}>Name (optional)</Text>
        <View
          style={[
            styles.inputShell,
            { backgroundColor: fieldBackground, borderColor: colors.border },
          ]}
        >
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            placeholder={def.label}
            placeholderTextColor={colors.textDisabled}
            value={draft.label}
            onChangeText={(label) => update({ label })}
            maxLength={30}
            selectionColor={colors.primary}
            accessibilityLabel="Metric name"
          />
        </View>
      </View>

      {/* Required */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textTertiary }]}>When logging</Text>
        <SegmentedControl
          options={REQUIRED_OPTIONS}
          value={draft.required ? 'required' : 'optional'}
          onChange={(v) => update({ required: v === 'required' })}
        />
        <Text style={[styles.caption, { color: colors.textSecondary }]}>
          {draft.required
            ? 'You enter a value every time you log.'
            : 'You can log without a value and add it later from the calendar.'}
        </Text>
      </View>

      {/* Same-day rule */}
      {!def.combineFixed ? (
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textTertiary }]}>
            Adding more on the same day
          </Text>
          <SegmentedControl
            options={COMBINE_OPTIONS}
            value={draft.combine}
            onChange={(combine) => update({ combine })}
          />
          <Text style={[styles.caption, { color: colors.textSecondary }]}>
            {draft.combine === 'sum'
              ? 'A second ride adds to the day’s distance.'
              : 'A new value replaces the day’s, like weighing yourself again.'}
          </Text>
        </View>
      ) : null}

      {/* Target */}
      {draft.combine === 'sum' ? (
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textTertiary }]}>
            Daily target (optional)
          </Text>
          <MetricValueInput
            metric={draft}
            draft={draft.target}
            onChange={(target) => update({ target })}
            fieldBackground={fieldBackground}
            accessibilityLabel="Daily target"
          />
        </View>
      ) : null}
    </View>
  );
};

const FIELD_HEIGHT = 48;

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  field: {
    gap: Spacing.sm,
  },
  label: {
    ...Typography.overline,
    marginLeft: 2,
  },
  caption: {
    ...Typography.caption,
    marginLeft: 2,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs + 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md - 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillText: {
    ...Typography.labelMedium,
    fontWeight: '600',
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    height: FIELD_HEIGHT,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
  },
  input: {
    ...Typography.bodyLarge,
    flex: 1,
    height: FIELD_HEIGHT,
    paddingVertical: 0,
  },
});
