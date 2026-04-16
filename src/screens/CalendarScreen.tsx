import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { buildMarkedDates } from '../utils/calendarUtils';
import { useAttendanceStore } from '../store/attendanceStore';
import { CalendarLegend } from '../components/CalendarLegend';
import { LogDetailsModal } from '../components/LogDetailsModal';
import { Colors, Spacing, Typography, BorderRadius } from '../constants';
import { useTheme } from '../hooks/useTheme';
import { todayStr } from '../utils/dateUtils';
import dayjs from 'dayjs';

export const CalendarScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const [logDetailsVisible, setLogDetailsVisible] = React.useState(false);
  const [logModalDate, setLogModalDate] = React.useState('');
  const [logModalDateKey, setLogModalDateKey] = React.useState('');
  const [logModalTime, setLogModalTime] = React.useState<string | null>(null);

  const { logs, notes, selectedActivityId, activities, appendNote, editNote } = useAttendanceStore();
  const selectedActivity = activities.find(a => a.id === selectedActivityId);
  const loggedDates = selectedActivityId ? logs[selectedActivityId] || [] : [];
  const today = todayStr();
  const markedDates = buildMarkedDates(loggedDates, today, selectedActivity?.createdAt);

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
        <Text style={[styles.title, { color: colors.textPrimary }]}>Attendance Calendar</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {loggedDates.length} day{loggedDates.length !== 1 ? 's' : ''} logged total
        </Text>
      </Animated.View>

      {/* Calendar */}
      <Animated.View
        entering={FadeInDown.delay(100).springify()}
        style={[styles.calendarCard, { backgroundColor: colors.surface }]}
      >
        <Calendar
          current={today}
          markedDates={markedDates}
          markingType={'custom'}
          maxDate={today}
          enableSwipeMonths={true}
          onDayLongPress={(day) => {
            // Use dayjs to convert each log to a local-timezone date string before comparing.
            // This handles UTC ISO strings (e.g. "2026-03-27T18:45:00.639Z") which may fall
            // on a different calendar day once converted to the user's local timezone (IST).
            const rawLog = loggedDates.find(
              log => dayjs(log).format('YYYY-MM-DD') === day.dateString
            );
            if (rawLog) {
              const containsTime = rawLog.includes('T');
              const dateKey = day.dateString;
              if (containsTime) {
                setLogModalDate(dayjs(day.dateString).format('MMMM D, YYYY'));
                setLogModalTime(dayjs(rawLog).format('h:mm A'));
              } else {
                setLogModalDate(dayjs(day.dateString).format('MMMM D, YYYY'));
                setLogModalTime(null);
              }
              setLogModalDateKey(dateKey);
              setLogDetailsVisible(true);
            }
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
        timeStr={logModalTime}
        notes={logModalNotes}
        activityName={selectedActivity?.name}
        dateKey={logModalDateKey}
        isToday={logModalDateKey === today}
        requiresNote={selectedActivity?.requiresNote}
        onNoteAppend={
          selectedActivityId
            ? async (text) => {
                await appendNote(selectedActivityId, logModalDateKey, text);
              }
            : undefined
        }
        onNoteEdit={
          selectedActivityId
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
