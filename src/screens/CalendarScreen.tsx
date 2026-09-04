import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import Animated, { FadeInDown } from 'react-native-reanimated';
import dayjs from 'dayjs';
import { FontAwesome5 } from '@expo/vector-icons';
import { buildMarkedDates } from '../utils/calendarUtils';
import {
  useAttendanceStore,
  getTaskForDate,
  SequenceDrop,
  SequenceTask,
} from '../store/attendanceStore';
import { CalendarLegend } from '../components/CalendarLegend';
import { LogDetailsModal } from '../components/LogDetailsModal';
import { Spacing, Typography, BorderRadius, ScreenPadding } from '../constants';
import { useTheme } from '../hooks/useTheme';
import { todayStr, formatTimeWithTz } from '../utils/dateUtils';
import { haptics } from '../utils/haptics';
import { Card, PressableScale } from '../components/ui';

export const CalendarScreen: React.FC = () => {
  const { colors, calendar: calendarColors } = useTheme();
  const [logDetailsVisible, setLogDetailsVisible] = React.useState(false);
  const [logModalDateKey, setLogModalDateKey] = React.useState('');
  // The only piece of sheet state that can't be derived: it depends on the
  // wall-clock at the moment the day was tapped, not on stored data.
  const [logModalTimeBoundKind, setLogModalTimeBoundKind] = React.useState<
    'too_early' | 'too_late' | undefined
  >(undefined);

  const {
    logs,
    notes,
    taskHistory,
    sequenceSkips,
    sequenceDrops,
    selectedActivityId,
    activities,
    appendNote,
    editNote,
    logMissedDay,
    getBackfillEligibility,
    isHideExtraDaysEnabled,
  } = useAttendanceStore();
  const selectedActivity = activities.find((a) => a.id === selectedActivityId);
  const activityLogs = selectedActivityId ? (logs[selectedActivityId] ?? []) : [];
  const loggedDates = activityLogs.map((e) => e.date);
  const backfilledDates = activityLogs.filter((e) => e.backfilled).map((e) => e.date);
  const activitySequenceSkips: string[] = selectedActivityId
    ? (sequenceSkips[selectedActivityId] ?? [])
    : [];
  const activityDrops: SequenceDrop[] = selectedActivityId
    ? (sequenceDrops[selectedActivityId] ?? [])
    : [];
  const today = todayStr();
  const markedDates = buildMarkedDates(
    loggedDates,
    today,
    selectedActivity?.createdAt,
    selectedActivity?.completedAt,
    calendarColors,
    backfilledDates,
  );

  // Start / end date jump helpers
  const startDate = selectedActivity
    ? dayjs(selectedActivity.createdAt).format('YYYY-MM-DD')
    : null;
  const endDate = selectedActivity
    ? selectedActivity.completedAt
      ? dayjs(selectedActivity.completedAt).format('YYYY-MM-DD')
      : today
    : null;

  // Controlled month for the calendar — defaults to today's month
  const [currentMonth, setCurrentMonth] = React.useState(today);

  const isViewingCurrentMonth = dayjs(currentMonth).isSame(dayjs(today), 'month');

  // Everything the sheet shows about the tapped day is derived from the store
  // rather than snapshotted on press, so fixing a missed day (or adding a note)
  // updates the open sheet instead of leaving it showing the old state.
  const logModalNotes =
    selectedActivityId && logModalDateKey
      ? notes[selectedActivityId]?.[logModalDateKey]
      : undefined;
  const logModalEntry = logModalDateKey
    ? activityLogs.find((e) => e.date === logModalDateKey)
    : undefined;
  const logModalDate = logModalDateKey ? dayjs(logModalDateKey).format('MMMM D, YYYY') : '';
  // A fixed day's timestamp is the moment of the fix, not of the habit — there
  // is no honest "time logged" to show for it.
  const logModalTime =
    logModalEntry && !logModalEntry.backfilled && logModalEntry.ts.includes('T')
      ? formatTimeWithTz(logModalEntry.ts, logModalEntry.tz)
      : null;
  const logModalTask: SequenceTask | null =
    logModalEntry && selectedActivityId && selectedActivity
      ? (taskHistory[selectedActivityId]?.[logModalDateKey] ??
        getTaskForDate(selectedActivity, logModalDateKey, {
          logs: loggedDates,
          postponed: activitySequenceSkips,
          dropped: activityDrops.map((d) => d.date),
        }))
      : null;
  const logModalIsSequenceSkipped =
    !!logModalEntry && activitySequenceSkips.includes(logModalDateKey);
  // Tasks dropped on this day are worth showing whether or not the day itself
  // was logged — a rest day can still be the day Leg left the cycle.
  const logModalDroppedTasks = activityDrops.filter((d) => d.date === logModalDateKey);
  // Only past, un-logged days get the fix affordance at all. Today has its own
  // log button, so telling it the day "hasn't ended yet" would be pure noise.
  const logModalBackfill =
    selectedActivityId && logModalDateKey && !logModalEntry && logModalDateKey < today
      ? getBackfillEligibility(selectedActivityId, logModalDateKey)
      : undefined;

  const jumpTo = (date: string) => {
    haptics.light();
    setCurrentMonth(date);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.springify()} style={styles.header}>
          <Text style={[styles.eyebrow, { color: colors.textTertiary }]}>Attendance</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Calendar</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {loggedDates.length} day{loggedDates.length !== 1 ? 's' : ''} logged in total
          </Text>
        </Animated.View>

        {/* Month jump controls */}
        {selectedActivity && startDate && endDate ? (
          <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.jumpRow}>
            <PressableScale
              onPress={() => jumpTo(startDate)}
              scaleTo={0.95}
              style={[
                styles.jumpBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Jump to the month this habit started"
            >
              <FontAwesome5 name="angle-double-left" size={12} color={colors.textSecondary} />
              <Text style={[styles.jumpLabel, { color: colors.textSecondary }]}>Start</Text>
            </PressableScale>

            <PressableScale
              onPress={() => jumpTo(endDate)}
              scaleTo={0.95}
              style={[
                styles.jumpBtn,
                isViewingCurrentMonth
                  ? { backgroundColor: colors.surface, borderColor: colors.border }
                  : { backgroundColor: colors.primaryMuted, borderColor: colors.primaryBorder },
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                selectedActivity.completedAt
                  ? 'Jump to the month this habit was completed'
                  : 'Jump to this month'
              }
            >
              <Text
                style={[
                  styles.jumpLabel,
                  {
                    color: isViewingCurrentMonth ? colors.textSecondary : colors.primary,
                  },
                ]}
              >
                {selectedActivity.completedAt ? 'Finished' : 'Today'}
              </Text>
              <FontAwesome5
                name="angle-double-right"
                size={12}
                color={isViewingCurrentMonth ? colors.textSecondary : colors.primary}
              />
            </PressableScale>
          </Animated.View>
        ) : null}

        {/* Calendar */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Card elevation="medium" padding={Spacing.sm} radius={BorderRadius.xl}>
            <Calendar
              key={`${currentMonth}-${colors.surface}`}
              current={currentMonth}
              markedDates={markedDates}
              markingType={'custom'}
              maxDate={today}
              enableSwipeMonths
              hideExtraDays={isHideExtraDaysEnabled}
              onDayPress={(day) => {
                haptics.light();
                // Match on the .date field (the locked local date) rather than
                // parsing the UTC timestamp, so the calendar day never shifts
                // when the device's timezone changes.
                const isLogged = loggedDates.includes(day.dateString);
                setLogModalDateKey(day.dateString);

                // Time-bound state only means anything for an un-logged today,
                // and only against the clock as it reads right now.
                let kind: 'too_early' | 'too_late' | undefined;
                if (!isLogged && day.dateString === today && selectedActivity?.timeBoundType) {
                  const currentTime = dayjs().format('HH:mm');
                  const { timeBoundType, timeBoundStartTime, timeBoundEndTime } = selectedActivity;
                  if (
                    timeBoundType === 'before' &&
                    timeBoundStartTime &&
                    currentTime >= timeBoundStartTime
                  ) {
                    kind = 'too_late';
                  } else if (
                    timeBoundType === 'after' &&
                    timeBoundStartTime &&
                    currentTime < timeBoundStartTime
                  ) {
                    kind = 'too_early';
                  } else if (
                    timeBoundType === 'between' &&
                    timeBoundStartTime &&
                    timeBoundEndTime
                  ) {
                    if (currentTime < timeBoundStartTime) kind = 'too_early';
                    else if (currentTime >= timeBoundEndTime) kind = 'too_late';
                  }
                }
                setLogModalTimeBoundKind(kind);
                setLogDetailsVisible(true);
              }}
              theme={{
                backgroundColor: colors.surface,
                calendarBackground: colors.surface,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: colors.onPrimary,
                todayTextColor: colors.primary,
                dayTextColor: colors.textPrimary,
                textDisabledColor: colors.textDisabled,
                arrowColor: colors.primary,
                monthTextColor: colors.textPrimary,
                textSectionTitleColor: colors.textTertiary,
                textMonthFontWeight: '700',
                textMonthFontSize: 17,
                textDayFontSize: 14,
                textDayFontWeight: '500',
                textDayHeaderFontSize: 11,
                textDayHeaderFontWeight: '700',
                arrowStyle: { padding: Spacing.sm },
              }}
              style={styles.calendar}
            />
          </Card>
        </Animated.View>

        {/* Legend */}
        <Animated.View entering={FadeInDown.delay(160).springify()}>
          <CalendarLegend />
        </Animated.View>

        <Text style={[styles.tip, { color: colors.textDisabled }]}>
          Tap any day to see its log, time and notes
        </Text>
      </ScrollView>

      <LogDetailsModal
        visible={logDetailsVisible}
        dateStr={logModalDate}
        timeData={logModalTime}
        notes={logModalNotes}
        activityName={selectedActivity?.name}
        dateKey={logModalDateKey}
        isToday={logModalDateKey === today}
        isLogged={!!logModalEntry}
        requiresNote={selectedActivity?.requiresNote}
        taskForDay={logModalTask}
        isSequenceSkipped={logModalIsSequenceSkipped}
        droppedTasks={logModalDroppedTasks}
        timeBoundKind={logModalTimeBoundKind}
        isActivityCompleted={!!selectedActivity?.completedAt}
        isBackfilled={!!logModalEntry?.backfilled}
        backfill={logModalBackfill}
        onBackfill={
          selectedActivityId && logModalDateKey
            ? (reason) => logMissedDay(selectedActivityId, logModalDateKey, reason)
            : undefined
        }
        onNoteAppend={
          selectedActivityId
            ? async (text) => {
                await appendNote(selectedActivityId, logModalDateKey, text);
              }
            : undefined
        }
        onNoteEdit={
          selectedActivityId && logModalEntry
            ? async (index, text) => {
                await editNote(selectedActivityId, logModalDateKey, index, text);
              }
            : undefined
        }
        onClose={() => setLogDetailsVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: ScreenPadding,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.md,
  },
  eyebrow: {
    ...Typography.overline,
    marginBottom: 6,
  },
  title: {
    ...Typography.headlineLarge,
  },
  subtitle: {
    ...Typography.bodyMedium,
    marginTop: 3,
  },
  jumpRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  jumpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md - 2,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  jumpLabel: {
    ...Typography.labelMedium,
    fontWeight: '700',
  },
  calendar: {
    borderRadius: BorderRadius.lg,
  },
  tip: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
