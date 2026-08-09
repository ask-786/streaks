import { StyleSheet, ViewStyle } from 'react-native';
import { ThemePalette, alpha } from './colors';

/**
 * Elevation system.
 *
 * Light mode gets *tinted*, two-stop shadows (indigo-slate, never pure black)
 * paired with a hairline ring. The ring is what actually reads as "crisp" on a
 * white card — a blur alone just looks like a grey smudge. Two stops, one tight
 * contact shadow and one wide ambient one, is what separates a considered
 * surface from a default one.
 *
 * Dark mode inverts the strategy: shadows are nearly invisible on a dark ground,
 * so depth comes from surface lightness steps plus a slightly brighter border.
 *
 * ── Why boxShadow and not elevation ──────────────────────────────────────────
 * Android's `elevation` shadow is drawn by the *parent* from the child's
 * outline, so it does not composite with the child's own alpha. Any card that
 * fades in — which is every card here, they all use FadeInDown — renders its
 * shadow at full strength behind a half-transparent surface, and you see a hard
 * grey block through it for the duration of the animation.
 *
 * `boxShadow` is part of the view's own background layer, so it fades with the
 * view. It needs API 28+ on Android; RN skips it below that, which degrades to
 * the hairline ring alone rather than breaking.
 */

export interface ElevationSet {
  /** Flush with the background — hairline ring only. */
  flat: ViewStyle;
  /** Resting cards, list rows. */
  low: ViewStyle;
  /** Primary content cards, the hero surface on a screen. */
  medium: ViewStyle;
  /** Sheets, popovers, floating action buttons. */
  high: ViewStyle;
  /** Modals and full-screen overlays. */
  overlay: ViewStyle;
  /** Coloured glow beneath a filled brand button. */
  brandGlow: (color: string) => ViewStyle;
}

type Stop = {
  y: number;
  blur: number;
  opacity: number;
  spread?: number;
};

/** Composes one or more shadow stops into a boxShadow value. */
const shadow = (color: string, stops: Stop[]): ViewStyle => ({
  boxShadow: stops.map(({ y, blur, opacity, spread = 0 }) => ({
    offsetX: 0,
    offsetY: y,
    blurRadius: blur,
    spreadDistance: spread,
    color: alpha(color, opacity),
  })),
});

export const createElevation = (palette: ThemePalette, isDark: boolean): ElevationSet => {
  const ring: ViewStyle = {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  };
  const ringStrong: ViewStyle = {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderStrong,
  };
  const c = palette.shadowColor;

  if (isDark) {
    // Depth in dark mode = lighter surface + brighter edge, not blur.
    return {
      flat: { ...ring },
      low: { ...ring },
      medium: {
        ...ringStrong,
        ...shadow(c, [{ y: 4, blur: 12, opacity: 0.4 }]),
      },
      high: {
        ...ringStrong,
        ...shadow(c, [
          { y: 2, blur: 6, opacity: 0.35 },
          { y: 10, blur: 24, opacity: 0.5 },
        ]),
      },
      overlay: {
        ...ringStrong,
        ...shadow(c, [
          { y: 4, blur: 10, opacity: 0.4 },
          { y: 18, blur: 40, opacity: 0.6 },
        ]),
      },
      // Kept restrained: a saturated glow around a full-width button on a dark
      // ground reads as a smudge rather than depth.
      brandGlow: (color: string) => shadow(color, [{ y: 4, blur: 14, opacity: 0.28 }]),
    };
  }

  return {
    flat: { ...ring },
    low: {
      ...ring,
      ...shadow(c, [
        { y: 1, blur: 2, opacity: 0.05 },
        { y: 2, blur: 6, opacity: 0.05 },
      ]),
    },
    medium: {
      ...ring,
      ...shadow(c, [
        { y: 1, blur: 2, opacity: 0.05 },
        { y: 6, blur: 16, opacity: 0.08 },
      ]),
    },
    high: {
      ...ring,
      ...shadow(c, [
        { y: 2, blur: 4, opacity: 0.06 },
        { y: 12, blur: 28, opacity: 0.12 },
      ]),
    },
    overlay: {
      ...ringStrong,
      ...shadow(c, [
        { y: 4, blur: 8, opacity: 0.08 },
        { y: 20, blur: 44, opacity: 0.16 },
      ]),
    },
    brandGlow: (color: string) =>
      shadow(color, [
        { y: 2, blur: 5, opacity: 0.18 },
        { y: 6, blur: 16, opacity: 0.26 },
      ]),
  };
};
