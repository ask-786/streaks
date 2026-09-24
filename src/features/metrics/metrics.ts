/**
 * Progress metrics: an optional number a habit records each time it's logged
 * (minutes worked out, km ridden, pages read).
 *
 * Values are stored in one base unit per kind — seconds, meters, grams — so a
 * habit can switch km to miles without touching its history, and anything
 * charting the values never has to reconcile units. The display unit only
 * decides how a value is typed in and shown.
 */

export type MetricKind =
  | 'duration'
  | 'distance'
  | 'count'
  | 'weight'
  | 'volume'
  | 'energy'
  | 'money'
  | 'speed'
  | 'pace'
  | 'heartRate'
  | 'rating'
  | 'percent'
  | 'custom';

/**
 * What a second entry on the same day does: `sum` adds to the day's value
 * (two rides make one day's distance), `latest` replaces it (a body weight
 * weighed twice is the later reading).
 */
export type MetricCombine = 'sum' | 'latest';

export interface HabitMetric {
  kind: MetricKind;
  /**
   * Display unit. An id from the kind's unit list, or free text for kinds
   * without a fixed list (count, money, custom).
   */
  unit: string;
  /** What's being measured, e.g. "Pages read". Falls back to the kind's name. */
  label?: string;
  /** When true, a day can be logged without a value. Required is the default. */
  optional?: boolean;
  combine: MetricCombine;
  /** Daily target in base units. Only meaningful for `sum` metrics. */
  target?: number;
}

/** Clock-style entry fields, largest first. */
type ClockField = 'h' | 'm' | 's';

export interface MetricUnitDef {
  id: string;
  /** Shown in the unit picker. */
  label: string;
  /** Base units per one entered unit. For clock units, the entered unit is a second. */
  factor: number;
  /** Most decimals shown; trailing zeros are trimmed. */
  decimals: number;
  /** Appended to a formatted value, spacing included: " km", "%", "/5". */
  suffix?: string;
  /** Prepended instead of a suffix, for currency symbols: "$12". */
  prefix?: string;
  /** Entered as clock fields rather than one number, e.g. hours + minutes. */
  fields?: ClockField[];
  /** Largest value that can be entered, in this unit. */
  max?: number;
}

export interface MetricKindDef {
  kind: MetricKind;
  label: string;
  /** FontAwesome5 icon name. */
  icon: string;
  /** A few habits this suits, shown under the picker. */
  examples: string;
  units: MetricUnitDef[];
  defaultUnit: string;
  /**
   * Kinds whose unit is typed rather than picked. The listed units become
   * suggestions; any text is accepted.
   */
  freeUnit?: { placeholder: string; decimals: number };
  combine: MetricCombine;
  /** Whether the user may change `combine`. Averages like pace can't be summed. */
  combineFixed?: boolean;
}

const MILE = 1609.344;

const freeUnits = (ids: string[]): MetricUnitDef[] =>
  ids.map((id) => ({ id, label: id, factor: 1, decimals: 2, suffix: ` ${id}` }));

/** Currency symbols that read naturally in front of the number. */
const CURRENCY_SYMBOLS = ['₹', '$', '€', '£', '¥', '₩', '₽', '₺', '฿', '₱', '₫', 'R$', 'A$', 'C$'];

export const METRIC_KINDS: Record<MetricKind, MetricKindDef> = {
  duration: {
    kind: 'duration',
    label: 'Time',
    icon: 'stopwatch',
    examples: 'Workout, meditation, study, sleep',
    units: [
      { id: 'hm', label: 'h + min', factor: 1, decimals: 0, fields: ['h', 'm'] },
      { id: 'min', label: 'Minutes', factor: 60, decimals: 1, suffix: ' min' },
      { id: 'h', label: 'Hours', factor: 3600, decimals: 2, suffix: ' h' },
      { id: 'ms', label: 'min + sec', factor: 1, decimals: 0, fields: ['m', 's'] },
    ],
    defaultUnit: 'hm',
    combine: 'sum',
  },
  distance: {
    kind: 'distance',
    label: 'Distance',
    icon: 'route',
    examples: 'Riding, running, walking, swimming',
    units: [
      { id: 'km', label: 'km', factor: 1000, decimals: 2, suffix: ' km' },
      { id: 'mi', label: 'mi', factor: MILE, decimals: 2, suffix: ' mi' },
      { id: 'm', label: 'm', factor: 1, decimals: 0, suffix: ' m' },
      { id: 'yd', label: 'yd', factor: 0.9144, decimals: 0, suffix: ' yd' },
      { id: 'ft', label: 'ft', factor: 0.3048, decimals: 0, suffix: ' ft' },
      { id: 'cm', label: 'cm', factor: 0.01, decimals: 1, suffix: ' cm' },
      { id: 'in', label: 'in', factor: 0.0254, decimals: 1, suffix: ' in' },
    ],
    defaultUnit: 'km',
    combine: 'sum',
  },
  count: {
    kind: 'count',
    label: 'Count',
    icon: 'hashtag',
    examples: 'Pushups, pages, steps, glasses of water',
    units: freeUnits(['reps', 'pages', 'steps', 'sets', 'times', 'glasses', 'chapters', 'words']),
    defaultUnit: 'reps',
    freeUnit: { placeholder: 'e.g. pages', decimals: 2 },
    combine: 'sum',
  },
  weight: {
    kind: 'weight',
    label: 'Weight',
    icon: 'weight-hanging',
    examples: 'Weight lifted, body weight, food',
    units: [
      { id: 'kg', label: 'kg', factor: 1000, decimals: 2, suffix: ' kg' },
      { id: 'lb', label: 'lb', factor: 453.59237, decimals: 1, suffix: ' lb' },
      { id: 'g', label: 'g', factor: 1, decimals: 0, suffix: ' g' },
      { id: 'oz', label: 'oz', factor: 28.349523125, decimals: 1, suffix: ' oz' },
    ],
    defaultUnit: 'kg',
    combine: 'sum',
  },
  volume: {
    kind: 'volume',
    label: 'Volume',
    icon: 'tint',
    examples: 'Water intake, milk, coffee',
    units: [
      { id: 'ml', label: 'ml', factor: 1, decimals: 0, suffix: ' ml' },
      { id: 'L', label: 'L', factor: 1000, decimals: 2, suffix: ' L' },
      { id: 'floz', label: 'fl oz', factor: 29.5735295625, decimals: 1, suffix: ' fl oz' },
      { id: 'cup', label: 'cups', factor: 236.5882365, decimals: 2, suffix: ' cups' },
      { id: 'gal', label: 'gal', factor: 3785.411784, decimals: 2, suffix: ' gal' },
    ],
    defaultUnit: 'ml',
    combine: 'sum',
  },
  energy: {
    kind: 'energy',
    label: 'Energy',
    icon: 'fire',
    examples: 'Calories burned, calories eaten',
    units: [
      { id: 'kcal', label: 'kcal', factor: 1, decimals: 0, suffix: ' kcal' },
      { id: 'kJ', label: 'kJ', factor: 1 / 4.184, decimals: 0, suffix: ' kJ' },
    ],
    defaultUnit: 'kcal',
    combine: 'sum',
  },
  money: {
    kind: 'money',
    label: 'Money',
    icon: 'coins',
    examples: 'Saved, invested, spent',
    units: CURRENCY_SYMBOLS.slice(0, 5).map((id) => ({
      id,
      label: id,
      factor: 1,
      decimals: 2,
      prefix: id,
    })),
    defaultUnit: '₹',
    freeUnit: { placeholder: 'e.g. AED', decimals: 2 },
    combine: 'sum',
  },
  speed: {
    kind: 'speed',
    label: 'Speed',
    icon: 'tachometer-alt',
    examples: 'Average riding or running speed',
    units: [
      { id: 'kmh', label: 'km/h', factor: 1, decimals: 1, suffix: ' km/h' },
      { id: 'mph', label: 'mph', factor: MILE / 1000, decimals: 1, suffix: ' mph' },
      { id: 'ms', label: 'm/s', factor: 3.6, decimals: 2, suffix: ' m/s' },
    ],
    defaultUnit: 'kmh',
    combine: 'latest',
    combineFixed: true,
  },
  pace: {
    kind: 'pace',
    label: 'Pace',
    icon: 'running',
    examples: 'Running or swimming pace',
    // Base unit is seconds per km.
    units: [
      { id: 'minkm', label: 'min/km', factor: 1, decimals: 0, fields: ['m', 's'], suffix: ' /km' },
      {
        id: 'minmi',
        label: 'min/mi',
        factor: 1000 / MILE,
        decimals: 0,
        fields: ['m', 's'],
        suffix: ' /mi',
      },
    ],
    defaultUnit: 'minkm',
    combine: 'latest',
    combineFixed: true,
  },
  heartRate: {
    kind: 'heartRate',
    label: 'Heart rate',
    icon: 'heartbeat',
    examples: 'Resting or average heart rate',
    units: [{ id: 'bpm', label: 'bpm', factor: 1, decimals: 0, suffix: ' bpm', max: 300 }],
    defaultUnit: 'bpm',
    combine: 'latest',
    combineFixed: true,
  },
  rating: {
    kind: 'rating',
    label: 'Rating',
    icon: 'star',
    examples: 'Mood, energy, sleep quality, focus',
    // Base unit is a percentage, so a 5-point scale can become a 10-point one.
    units: [
      { id: 'of5', label: 'out of 5', factor: 20, decimals: 1, suffix: '/5', max: 5 },
      { id: 'of10', label: 'out of 10', factor: 10, decimals: 1, suffix: '/10', max: 10 },
    ],
    defaultUnit: 'of5',
    combine: 'latest',
    combineFixed: true,
  },
  percent: {
    kind: 'percent',
    label: 'Percent',
    icon: 'percentage',
    examples: 'Task completion, accuracy, battery of the day',
    units: [{ id: 'pct', label: '%', factor: 1, decimals: 1, suffix: '%', max: 100 }],
    defaultUnit: 'pct',
    combine: 'latest',
    combineFixed: true,
  },
  custom: {
    kind: 'custom',
    label: 'Custom',
    icon: 'sliders-h',
    examples: 'Anything else you can put a number on',
    units: [],
    defaultUnit: '',
    freeUnit: { placeholder: 'Unit, e.g. problems', decimals: 2 },
    combine: 'sum',
  },
};

export const METRIC_KIND_ORDER: MetricKind[] = [
  'duration',
  'distance',
  'count',
  'weight',
  'volume',
  'energy',
  'money',
  'speed',
  'pace',
  'heartRate',
  'rating',
  'percent',
  'custom',
];

export const getKindDef = (kind: MetricKind): MetricKindDef => METRIC_KINDS[kind];

/** The unit definition a metric displays in, synthesizing one for free-text units. */
export function getUnitDef(metric: Pick<HabitMetric, 'kind' | 'unit'>): MetricUnitDef {
  const def = METRIC_KINDS[metric.kind];
  const known = def.units.find((u) => u.id === metric.unit);
  if (known) return known;
  if (def.freeUnit) {
    const unit = metric.unit.trim();
    const isSymbol = CURRENCY_SYMBOLS.includes(unit);
    return {
      id: unit,
      label: unit,
      factor: 1,
      decimals: def.freeUnit.decimals,
      ...(isSymbol ? { prefix: unit } : unit ? { suffix: ` ${unit}` } : {}),
    };
  }
  return def.units.find((u) => u.id === def.defaultUnit) ?? def.units[0];
}

/** "Pages read", or the kind's name when the habit didn't set one. */
export const metricTitle = (metric: HabitMetric): string =>
  metric.label?.trim() || METRIC_KINDS[metric.kind].label;

/** Whether a day can be logged without a value. */
export const isMetricRequired = (metric: HabitMetric | undefined): boolean =>
  !!metric && !metric.optional;

/** What a second entry on the same day leaves behind. */
export const combineValues = (
  metric: HabitMetric,
  previous: number | undefined,
  next: number,
): number => (metric.combine === 'sum' && previous !== undefined ? previous + next : next);

// ─── Formatting ──────────────────────────────────────────────────────────────

const trimNumber = (value: number, decimals: number): string => {
  const fixed = value.toFixed(decimals);
  return decimals > 0 ? fixed.replace(/\.?0+$/, '') : fixed;
};

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

const formatClock = (totalSeconds: number, fields: ClockField[]): string => {
  const secs = Math.round(totalSeconds);
  if (fields[0] === 'h') {
    // h + min: minute precision reads better than a stopwatch here.
    const totalMinutes = Math.round(secs / 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) return `${m}m`;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`;
};

/** A stored value as the user reads it: "5.2 km", "1h 20m", "$40", "4/5". */
export function formatMetricValue(metric: HabitMetric, base: number): string {
  const unit = getUnitDef(metric);
  const inUnit = base / unit.factor;
  // Money keeps its cents once it has any: $12.50, not $12.5.
  const body = unit.fields
    ? formatClock(inUnit, unit.fields)
    : metric.kind === 'money' && Math.round(inUnit * 100) % 100 !== 0
      ? inUnit.toFixed(2)
      : trimNumber(inUnit, unit.decimals);
  return `${unit.prefix ?? ''}${body}${unit.suffix ?? ''}`;
}

// ─── Entry drafts ────────────────────────────────────────────────────────────

/**
 * What a value input holds while the user types. `num` is used by plain
 * units, `h`/`m`/`s` by clock units; the other side is ignored.
 */
export interface MetricValueDraft {
  num: string;
  h: string;
  m: string;
  s: string;
}

export const emptyValueDraft = (): MetricValueDraft => ({ num: '', h: '', m: '', s: '' });

export type ParsedValue =
  { state: 'empty' } | { state: 'invalid'; reason: string } | { state: 'ok'; value: number };

/** Accepts a comma as the decimal separator, since many keyboards offer only that. */
const parseDecimal = (text: string): number | null => {
  const cleaned = text.trim().replace(',', '.');
  if (!cleaned) return null;
  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === '.') return NaN;
  return Number(cleaned);
};

export function draftFromBase(
  metric: Pick<HabitMetric, 'kind' | 'unit'>,
  base: number | undefined,
): MetricValueDraft {
  if (base === undefined) return emptyValueDraft();
  const unit = getUnitDef(metric);
  const inUnit = base / unit.factor;
  if (!unit.fields) return { ...emptyValueDraft(), num: trimNumber(inUnit, unit.decimals) };

  let secs = Math.round(inUnit);
  const draft = emptyValueDraft();
  if (unit.fields[0] === 'h') {
    const totalMinutes = Math.round(secs / 60);
    draft.h = String(Math.floor(totalMinutes / 60));
    draft.m = String(totalMinutes % 60);
  } else {
    draft.m = String(Math.floor(secs / 60));
    secs %= 60;
    draft.s = String(secs);
  }
  return draft;
}

/** Turns a draft into a base-unit value, or says why it can't. */
export function parseValueDraft(
  metric: Pick<HabitMetric, 'kind' | 'unit'>,
  draft: MetricValueDraft,
): ParsedValue {
  const unit = getUnitDef(metric);

  if (unit.fields) {
    const parts = unit.fields.map((f) => parseDecimal(draft[f]));
    if (parts.every((p) => p === null)) return { state: 'empty' };
    if (parts.some((p) => p !== null && (Number.isNaN(p) || !Number.isInteger(p)))) {
      return { state: 'invalid', reason: 'Use whole numbers' };
    }
    // Only the leading field may run past 59; "90 min" in h + min is a typo.
    if (parts.slice(1).some((p) => p !== null && p >= 60)) {
      return { state: 'invalid', reason: 'Minutes and seconds go up to 59' };
    }
    const scale: Record<ClockField, number> = { h: 3600, m: 60, s: 1 };
    const seconds = unit.fields.reduce((sum, f, i) => sum + (parts[i] ?? 0) * scale[f], 0);
    return { state: 'ok', value: seconds * unit.factor };
  }

  const n = parseDecimal(draft.num);
  if (n === null) return { state: 'empty' };
  if (Number.isNaN(n)) return { state: 'invalid', reason: 'Enter a number' };
  if (unit.max !== undefined && n > unit.max) {
    return { state: 'invalid', reason: `Goes up to ${unit.max}` };
  }
  return { state: 'ok', value: n * unit.factor };
}

// ─── Import / storage hygiene ────────────────────────────────────────────────

const isMetricKind = (value: unknown): value is MetricKind =>
  typeof value === 'string' && value in METRIC_KINDS;

/**
 * Coerces a stored or imported metric into a valid `HabitMetric`, or undefined
 * when it isn't one. An unknown unit falls back to the kind's default rather
 * than dropping the metric, so a hand-edited export keeps its history visible.
 */
export function normalizeMetric(value: unknown): HabitMetric | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  if (!isMetricKind(raw.kind)) return undefined;
  const def = METRIC_KINDS[raw.kind];

  let unit = typeof raw.unit === 'string' ? raw.unit.trim() : '';
  if (!def.freeUnit && !def.units.some((u) => u.id === unit)) unit = def.defaultUnit;
  if (def.freeUnit && !unit) unit = def.defaultUnit;

  const combine: MetricCombine =
    def.combineFixed || (raw.combine !== 'sum' && raw.combine !== 'latest')
      ? def.combine
      : raw.combine;

  const metric: HabitMetric = { kind: raw.kind, unit, combine };
  if (typeof raw.label === 'string' && raw.label.trim()) metric.label = raw.label.trim();
  if (raw.optional === true) metric.optional = true;
  if (
    combine === 'sum' &&
    typeof raw.target === 'number' &&
    Number.isFinite(raw.target) &&
    raw.target > 0
  ) {
    metric.target = raw.target;
  }
  return metric;
}

/** A log value worth keeping: finite and not negative. */
export const isValidMetricValue = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;
