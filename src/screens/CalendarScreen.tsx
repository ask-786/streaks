import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { buildMarkedDates } from '../utils/calendarUtils';
import { useAttendanceStore, getTaskForDate } from '../store/attendanceStore';
import { CalendarLegend } from '../components/CalendarLegend';
import { LogDetailsModal } from '../components/LogDetailsModal';
import { Colors, Spacing, Typography, BorderRadius } from '../constants';
import { useTheme } from '../hooks/useTheme';
import { todayStr, formatTimeWithTz } from '../utils/dateUtils';
import dayjs from 'dayjs';

export const CalendarScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const [logDetailsVisible, setLogDetailsVisible] = React.useState(false);
  const [logModalDate, setLogModalDate] = React.useState('');
  const [logModalDateKey, setLogModalDateKey] = React.useState('');
  const [logModalTime, setLogModalTime] = React.useState<{ time: string, tzDisplay: string | null } | null>(null);
  const [logModalTask, setLogModalTask] = React.useState<string | null>(null);
  const [logModalIsLogged, setLogModalIsLogged] = React.useState(false);
  const [logModalTimeBoundKind, setLogModalTimeBoundKind] = React.useState<'too_early' | 'too_late' | undefined>(undefined);
  const [logModalIsSequenceSkipped, setLogModalIsSequenceSkipped] = React.useState(false);

  const { logs, notes, taskHistory, sequenceSkips, selectedActivityId, activities, appendNote, editNote, isHideExtraDaysEnabled } = useAttendanceStore();
  const selectedActivity = activities.find(a => a.id === selectedActivityId);
  const loggedDates = selectedActivityId ? (logs[selectedActivityId] || []).map(e => e.date) : [];
  const activitySequenceSkips: string[] = selectedActivityId ? (sequenceSkips[selectedActivityId] ?? []) : [];
  const today = todayStr();
  const markedDates = buildMarkedDates(loggedDates, today, selectedActivity?.createdAt, selectedActivity?.completedAt);

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

  // Derive note entries reactively from the store so they stay fresh after appending
  const logModalNotes =
    selectedActivityId && logModalDateKey
      ? notes[selectedActivityId]?.[logModalDateKey]
      : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextBlock}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Attendance Calendar</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {loggedDates.length} day{loggedDates.length !== 1 ? 's' : ''} logged total
            </Text>
          </View>
          {/* Jump buttons — only shown when an activity is selected */}
          {selectedActivity && startDate && endDate ? (
            <View style={styles.jumpButtons}>
              <TouchableOpacity
                style={[
                  styles.jumpBtn,
                  { backgroundColor: colors.surface, borderColor: Colors.primary + '40' },
                ]}
                onPress={() => setCurrentMonth(startDate)}
                activeOpacity={0.75}
              >
                <Text style={[styles.jumpBtnIcon, { color: Colors.primary }]}>⏮</Text>
                <Text style={[styles.jumpBtnLabel, { color: Colors.primary }]}>Start</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.jumpBtn,
                  {
                    backgroundColor: selectedActivity.completedAt
                      ? Colors.success + '18'
                      : Colors.primary + '18',
                    borderColor: selectedActivity.completedAt
                      ? Colors.success + '60'
                      : Colors.primary + '40',
                  },
                ]}
                onPress={() => setCurrentMonth(endDate)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.jumpBtnIcon,
                    { color: selectedActivity.completedAt ? Colors.success : Colors.primary },
                  ]}
                >
                  ⏭
                </Text>
                <Text
                  style={[
                    styles.jumpBtnLabel,
                    { color: selectedActivity.completedAt ? Colors.success : Colors.primary },
                  ]}
                >
                  {selectedActivity.completedAt ? 'Done' : 'Today'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </Animated.View>

      {/* Calendar */}
      <Animated.View
        entering={FadeInDown.delay(100).springify()}
        style={[styles.calendarCard, { backgroundColor: colors.surface }]}
      >
        <Calendar
          key={currentMonth}
          current={currentMonth}
          markedDates={markedDates}
          markingType={'custom'}
          maxDate={today}
          enableSwipeMonths={true}
          hideExtraDays={isHideExtraDaysEnabled}
          onDayPress={(day) => {
            // Use .date field (locked local date) instead of parsing the UTC timestamp,
            // so the calendar day never shifts when the device's timezone changes.
            const rawEntry = selectedActivityId
              ? (logs[selectedActivityId] || []).find(e => e.date === day.dateString)
              : undefined;
            const dateKey = day.dateString;
            setLogModalDate(dayjs(day.dateString).format('MMMM D, YYYY'));
            setLogModalDateKey(dateKey);
            setLogModalIsLogged(!!rawEntry);
            if (rawEntry) {
              // Show time in the timezone where it was originally logged
              setLogModalTime(rawEntry.ts.includes('T') ? formatTimeWithTz(rawEntry.ts, rawEntry.tz) : null);
              // Compute which task was active on this day (accounting for skips)
              let task: string | null = null;
              if (selectedActivityId) {
                task = taskHistory[selectedActivityId]?.[day.dateString] || null;
                if (!task && selectedActivity) {
                  const actLogDates = (logs[selectedActivityId] || []).map(e => e.date);
                  task = getTaskForDate(selectedActivity, day.dateString, actLogDates, activitySequenceSkips);
                }
              }
              setLogModalTask(task);
              setLogModalIsSequenceSkipped(activitySequenceSkips.includes(day.dateString));
              setLogModalTimeBoundKind(undefined);
            } else {
              setLogModalTime(null);
              setLogModalTask(null);
              setLogModalIsSequenceSkipped(false);
              // Compute time-bound kind for unlogged today
              if (day.dateString === today && selectedActivity?.timeBoundType) {
                const currentTime = dayjs().format('HH:mm');
                const { timeBoundType, timeBoundStartTime, timeBoundEndTime } = selectedActivity;
                let kind: 'too_early' | 'too_late' | undefined;
                if (timeBoundType === 'before' && timeBoundStartTime && currentTime >= timeBoundStartTime) {
                  kind = 'too_late';
                } else if (timeBoundType === 'after' && timeBoundStartTime && currentTime < timeBoundStartTime) {
                  kind = 'too_early';
                } else if (timeBoundType === 'between' && timeBoundStartTime && timeBoundEndTime) {
                  if (currentTime < timeBoundStartTime) kind = 'too_early';
                  else if (currentTime >= timeBoundEndTime) kind = 'too_late';
                }
                setLogModalTimeBoundKind(kind);
              } else {
                setLogModalTimeBoundKind(undefined);
              }
            }
            setLogDetailsVisible(true);
          }}
          theme={{
            backgroundColor: colors.surface,
            calendarBackground: colors.surface,
            selectedDayBackgroundColor: Colors.primary,
            selectedDayTextColor: '#FFFFFF',
            todayTextColor: Colors.calendarToday,
            dayTextColor: colors.textPrimary,
            textDisabledColor: colors.textSecondary,
            arrowColor: Colors.primary,
            monthTextColor: colors.textPrimary,
            textMonthFontWeight: '700',
            textDayFontSize: 14,
            textMonthFontSize: 16,
            textDayHeaderFontSize: 12,
            textDayHeaderFontWeight: '600',
            arrowStyle: { padding: Spacing.xs },
          }}
          style={styles.calendar}
        />
      </Animated.View>

      {/* Legend */}
      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <CalendarLegend />
      </Animated.View>

      </ScrollView>

      <LogDetailsModal
        visible={logDetailsVisible}
        dateStr={logModalDate}
        timeData={logModalTime}
        notes={logModalNotes}
        activityName={selectedActivity?.name}
        dateKey={logModalDateKey}
        isToday={logModalDateKey === today}
        isLogged={logModalIsLogged}
        requiresNote={selectedActivity?.requiresNote}
        taskForDay={logModalTask}
        isSequenceSkipped={logModalIsSequenceSkipped}
        timeBoundKind={logModalTimeBoundKind}
        isActivityCompleted={!!selectedActivity?.completedAt}
        onNoteAppend={
          selectedActivityId
            ? async (text) => {
                await appendNote(selectedActivityId, logModalDateKey, text);
              }
            : undefined
        }
        onNoteEdit={
          selectedActivityId && logModalIsLogged
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  headerTextBlock: {
    flex: 1,
  },
  jumpButtons: {
    flexDirection: 'row',
    gap: Spacing.xs,
    alignItems: 'center',
    marginTop: 2,
  },
  jumpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  jumpBtnIcon: {
    fontSize: 11,
  },
  jumpBtnLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  title: {
    ...Typography.headlineLarge,
  },
  subtitle: {
    ...Typography.bodyMedium,
    marginTop: Spacing.xs,
  },
  calendarCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  calendar: {
    borderRadius: BorderRadius.xl,
  },
});
