import { Platform, TextStyle } from 'react-native';

// ─── Typography ──────────────────────────────────────────────────────────────
// Every style carries an explicit lineHeight — leaving it to the platform is the
// main reason stock RN text blocks read as cramped and unconsidered. Display and
// headline sizes get negative tracking; small uppercase labels get positive.

/** Numerals that keep their column when a counter ticks over. */
export const tabularNums: TextStyle = {
  fontVariant: ['tabular-nums'],
};

/** Slightly condensed numeric face for large counters. */
const numericFace: TextStyle = Platform.select<TextStyle>({
  ios: { fontVariant: ['tabular-nums'] },
  default: { fontVariant: ['tabular-nums'] },
}) as TextStyle;

export const Typography = {
  // ── Display ───────────────────────────────────────────────────────────────
  displayLarge: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800' as const,
    letterSpacing: -0.8,
  },
  displayMedium: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800' as const,
    letterSpacing: -0.6,
  },

  // ── Headline ──────────────────────────────────────────────────────────────
  headlineLarge: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  headlineMedium: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },

  // ── Title ─────────────────────────────────────────────────────────────────
  titleLarge: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  titleMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.1,
  },

  // ── Body ──────────────────────────────────────────────────────────────────
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
    letterSpacing: -0.1,
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '400' as const,
  },
  bodySmall: {
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '400' as const,
  },

  // ── Label ─────────────────────────────────────────────────────────────────
  labelLarge: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  labelMedium: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
  },

  // ── Additions ─────────────────────────────────────────────────────────────
  /** Small all-caps section eyebrow. Pair with textTertiary. */
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700' as const,
    letterSpacing: 0.9,
    textTransform: 'uppercase' as const,
  },
  /** Dense metadata under a title. */
  caption: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '500' as const,
  },
  /** Hero counter — streak numbers, stat tiles. */
  numeralLarge: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '800' as const,
    letterSpacing: -1.5,
    ...numericFace,
  },
  numeralMedium: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '700' as const,
    letterSpacing: -0.8,
    ...numericFace,
  },
  numeralSmall: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
    ...numericFace,
  },
};
