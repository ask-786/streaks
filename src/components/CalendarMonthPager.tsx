import React from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import dayjs from 'dayjs';
import { Calendar, CalendarProps } from 'react-native-calendars';
import { Duration, Ease, Spring } from '../constants';
import { haptics } from '../utils/haptics';

/** How far the finger has to travel before the release commits to a month. */
const SwipeDistanceRatio = 0.28;
/** A flick this fast commits regardless of distance (px/s). */
const SwipeVelocity = 420;
/**
 * Height to hold before any month has been measured. Only ever shows for the
 * first frame after mount — from then on the real measurements drive it.
 */
const EstimatedHeight = 290;

type PageProps = {
  index: number;
  month: string;
  width: number;
  isCurrent: boolean;
  onNavigate: (index: number) => void;
  onPageLayout: (index: number, height: number) => void;
  calendarProps: Record<string, unknown>;
};

/**
 * One month in the strip.
 *
 * Memoized, and it earns it: the library's `Day` is itself memoized, so a page
 * that re-renders with equal props costs an element tree and nothing more —
 * but a page that re-renders with *new* props re-renders all ~40 day cells.
 * Three mounted months make that the difference between a month change costing
 * one grid and costing four.
 */
const MonthPage = React.memo<PageProps>(
  ({ index, month, width, isCurrent, onNavigate, onPageLayout, calendarProps }) => {
    const goPrev = React.useCallback(() => onNavigate(index - 1), [onNavigate, index]);
    const goNext = React.useCallback(() => onNavigate(index + 1), [onNavigate, index]);
    const handleLayout = React.useCallback(
      (event: LayoutChangeEvent) => onPageLayout(index, event.nativeEvent.layout.height),
      [onPageLayout, index],
    );

    return (
      <View
        style={[styles.page, { width, transform: [{ translateX: index * width }] }]}
        onLayout={handleLayout}
        // Only the month in view should be reachable by a screen reader or by a
        // stray tap on a half-visible neighbour.
        pointerEvents={isCurrent ? 'auto' : 'none'}
        accessibilityElementsHidden={!isCurrent}
        importantForAccessibility={isCurrent ? 'auto' : 'no-hide-descendants'}
      >
        <Calendar
          {...calendarProps}
          current={month}
          // The pager owns the month: without this, tapping a day from an
          // adjacent month would move a page's internal month and desync it
          // from its position in the strip.
          disableMonthChange
          onPressArrowLeft={goPrev}
          onPressArrowRight={goNext}
        />
      </View>
    );
  },
);
MonthPage.displayName = 'MonthPage';

/**
 * Holds an object's identity steady while its contents are unchanged, so the
 * props spread below does not defeat `MonthPage`'s memoization on every render
 * of the screen above.
 */
const useStableProps = (value: Record<string, unknown>): Record<string, unknown> => {
  const ref = React.useRef(value);
  const previous = ref.current;
  const keys = Object.keys(value);
  const unchanged =
    keys.length === Object.keys(previous).length &&
    keys.every((key) => previous[key] === value[key]);
  if (!unchanged) ref.current = value;
  return ref.current;
};

export interface CalendarMonthPagerProps
  extends Omit<
    CalendarProps,
    | 'current'
    | 'initialDate'
    | 'enableSwipeMonths'
    | 'onMonthChange'
    | 'onPressArrowLeft'
    | 'onPressArrowRight'
  > {
  /** Visible month as `YYYY-MM-DD`. Controlled by the parent. */
  month: string;
  /** Fired with the first of the new month once a swipe or arrow lands. */
  onMonthChange: (month: string) => void;
}

/**
 * A month-at-a-time calendar that moves instead of cutting.
 *
 * `react-native-calendars` swaps the grid in place — arrows, its own swipe
 * handler and a changed `current` all repaint the same view, so a month change
 * reads as a jump. This wraps it in a three-page carousel (previous, visible,
 * next) laid out in one continuous strip so a month can actually slide past.
 *
 * Positions are absolute rather than recycled: page `i` always sits at
 * `i * width`, and the strip is translated to `-index * width`. When the index
 * commits after a swipe the strip is already at the right place, so there is no
 * offset reset to race the re-render — the seam that would otherwise flash a
 * frame of the outgoing month.
 *
 * Months are 5 or 6 rows tall, so the card would resize under the transition.
 * Each page reports its height and the container interpolates between them
 * along the same drag, keeping the card's growth tied to the finger.
 */
export const CalendarMonthPager: React.FC<CalendarMonthPagerProps> = ({
  month,
  onMonthChange,
  ...calendarProps
}) => {
  // Every page index is counted in months from the month first shown, so a page
  // keeps its coordinate for the lifetime of the component.
  const anchor = React.useRef(dayjs(month).startOf('month')).current;
  const monthAt = React.useCallback(
    (index: number) => anchor.add(index, 'month').format('YYYY-MM-DD'),
    [anchor],
  );

  const targetIndex = dayjs(month).startOf('month').diff(anchor, 'month');

  const [pageIndex, setPageIndex] = React.useState(targetIndex);
  const [width, setWidth] = React.useState(0);
  /**
   * Three months is three grids to build. Opening the screen only needs the one
   * being looked at, so the neighbours wait a frame and the tab paints on a
   * third of the work.
   */
  const [neighboursMounted, setNeighboursMounted] = React.useState(false);

  const offset = useSharedValue(0);
  const opacity = useSharedValue(1);
  const dragStart = useSharedValue(0);
  /** True while a jump is faded out and the page underneath is being swapped. */
  const jumping = useSharedValue(false);
  /** True while a released swipe is still travelling to the month it picked. */
  const settling = useSharedValue(false);
  const widthValue = useSharedValue(0);
  const indexValue = useSharedValue(targetIndex);

  // Measured page heights, keyed by page index.
  const heights = React.useRef(new Map<number, number>()).current;
  const heightPrev = useSharedValue(0);
  const heightCurrent = useSharedValue(0);
  const heightNext = useSharedValue(0);

  // Latest values for callbacks that outlive the render they were created in
  // (the gesture is built once; its worklets hop back to JS long after).
  const indexRef = React.useRef(pageIndex);
  const targetRef = React.useRef(targetIndex);
  const changeRef = React.useRef(onMonthChange);
  const fadeInPending = React.useRef(false);
  indexRef.current = pageIndex;
  targetRef.current = targetIndex;
  changeRef.current = onMonthChange;

  const syncHeights = React.useCallback((index: number) => {
    const current = heights.get(index) ?? 0;
    heightCurrent.value = current;
    // Fall back to the visible month's height so an unmeasured neighbour never
    // interpolates the container down to nothing.
    heightPrev.value = heights.get(index - 1) ?? current;
    heightNext.value = heights.get(index + 1) ?? current;
  }, []);

  const onContainerLayout = (event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    if (!next || next === width) return;
    setWidth(next);
    widthValue.value = next;
    offset.value = -indexRef.current * next;
  };

  const onPageLayout = React.useCallback((index: number, measured: number) => {
    const height = Math.round(measured);
    if (!height || heights.get(index) === height) return;
    heights.set(index, height);
    syncHeights(indexRef.current);
  }, [syncHeights]);

  const goToIndex = React.useCallback((index: number) => {
    haptics.selection();
    changeRef.current(monthAt(index));
  }, [monthAt]);

  /** Runs on the JS thread once a released swipe has finished travelling. */
  const commitSwipe = React.useCallback((delta: number) => {
    haptics.selection();
    changeRef.current(monthAt(indexRef.current + delta));
  }, [monthAt]);

  /** Second half of a distant jump: swap the page under a faded-out strip. */
  const finishJump = React.useCallback(() => {
    const index = targetRef.current;
    fadeInPending.current = true;
    offset.value = -index * widthValue.value;
    indexValue.value = index;
    jumping.value = false;
    setPageIndex(index);
  }, []);

  const pan = React.useMemo(
    () =>
      Gesture.Pan()
        // Horizontal only, and only once it clearly is: the pager lives inside a
        // vertical ScrollView, which must keep every up/down gesture.
        .activeOffsetX([-12, 12])
        .failOffsetY([-12, 12])
        .onBegin(() => {
          // A jump has the strip faded out and about to be repositioned; a drag
          // started now would fight it over the same offset.
          if (jumping.value) return;
          cancelAnimation(offset);
          settling.value = false;
          dragStart.value = offset.value;
        })
        .onUpdate((event) => {
          const w = widthValue.value;
          if (!w || jumping.value) return;
          const base = -indexValue.value * w;
          // Only the two neighbours exist, so the strip must not be dragged
          // past them into empty space.
          offset.value = Math.min(
            base + w,
            Math.max(base - w, dragStart.value + event.translationX),
          );
        })
        .onEnd((event) => {
          const w = widthValue.value;
          if (!w || jumping.value) return;
          const base = -indexValue.value * w;
          const dragged = offset.value - base;
          const flicked = Math.abs(event.velocityX) > SwipeVelocity;

          let delta = 0;
          if (dragged < 0 && (dragged <= -w * SwipeDistanceRatio || (flicked && event.velocityX < 0))) {
            delta = 1;
          } else if (dragged > 0 && (dragged >= w * SwipeDistanceRatio || (flicked && event.velocityX > 0))) {
            delta = -1;
          }

          // Commit at release rather than on arrival. The spring runs on the UI
          // thread, so mounting the month that just came into range overlaps it
          // instead of landing as a stall the moment it settles.
          if (delta !== 0) {
            settling.value = true;
            runOnJS(commitSwipe)(delta);
          }

          offset.value = withSpring(
            base - delta * w,
            // Clamped: an overshoot would expose the unrendered page beyond the
            // one being settled on.
            { ...Spring.gentle, velocity: event.velocityX, overshootClamping: true },
            () => {
              settling.value = false;
            },
          );
        }),
    [commitSwipe],
  );

  // React to a month the parent set — an arrow, a day in a neighbouring month,
  // or one of the start/today jump buttons.
  React.useEffect(() => {
    if (targetIndex === pageIndex) return;

    if (!width) {
      setPageIndex(targetIndex);
      return;
    }

    if (Math.abs(targetIndex - pageIndex) === 1) {
      // The outgoing month stays mounted as a neighbour of the new index, so it
      // can slide out under its replacement.
      setPageIndex(targetIndex);
      // A released swipe is already carrying the strip there under its own
      // spring; re-animating would swap that for a different curve mid-flight.
      if (settling.value) return;
      const destination = -targetIndex * width;
      if (Math.abs(offset.value - destination) > 0.5) {
        offset.value = withTiming(destination, { duration: Duration.normal, easing: Ease.out });
      }
      return;
    }

    // Nothing to slide through on a jump of several months, and the months in
    // between are not rendered — cross-fade to the destination instead.
    jumping.value = true;
    opacity.value = withTiming(
      0,
      { duration: Duration.instant, easing: Ease.in },
      (finished) => {
        if (finished) runOnJS(finishJump)();
      },
    );
  }, [targetIndex, pageIndex, width, finishJump]);

  React.useEffect(() => {
    if (!width || neighboursMounted) return;
    const frame = requestAnimationFrame(() => setNeighboursMounted(true));
    return () => cancelAnimationFrame(frame);
  }, [width, neighboursMounted]);

  React.useEffect(() => {
    indexValue.value = pageIndex;
    syncHeights(pageIndex);
    if (fadeInPending.current) {
      fadeInPending.current = false;
      opacity.value = withTiming(1, { duration: Duration.normal, easing: Ease.out });
    }
  }, [pageIndex, syncHeights]);

  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
    opacity: opacity.value,
  }));

  const containerStyle = useAnimatedStyle(() => {
    const w = widthValue.value;
    if (!w || !heightCurrent.value) return { height: EstimatedHeight };
    const base = -indexValue.value * w;
    return {
      height: interpolate(
        offset.value,
        [base - w, base, base + w],
        [heightNext.value, heightCurrent.value, heightPrev.value],
        Extrapolation.CLAMP,
      ),
    };
  });

  const pageProps = useStableProps(calendarProps as Record<string, unknown>);
  const indices = width > 0 ? (neighboursMounted ? [pageIndex - 1, pageIndex, pageIndex + 1] : [pageIndex]) : [];

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.container, containerStyle]} onLayout={onContainerLayout}>
        <Animated.View style={[styles.strip, stripStyle]}>
          {indices.map((index) => (
            <MonthPage
              key={index}
              index={index}
              month={monthAt(index)}
              width={width}
              isCurrent={index === pageIndex}
              onNavigate={goToIndex}
              onPageLayout={onPageLayout}
              calendarProps={pageProps}
            />
          ))}
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    minHeight: EstimatedHeight,
  },
  strip: {
    flex: 1,
  },
  page: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
