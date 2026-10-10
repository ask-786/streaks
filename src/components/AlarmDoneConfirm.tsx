import React from 'react';
import { Alert } from 'react-native';
import dayjs from 'dayjs';
import { NoteInputModal } from './NoteInputModal';
import { AlarmTap, useAlarmActions } from '../hooks/useAlarmActions';
import { useAttendanceStore } from '../store/attendanceStore';
import { formatTimeWithTz, todayStr } from '../utils/dateUtils';
import { haptics } from '../utils/haptics';

/** "at 7:02 AM yesterday" — whatever the tap carries, in the timezone it was made in. */
const describeTap = (tap: AlarmTap): { when: string; day: string | null } => {
  const today = todayStr();
  const day =
    tap.date === today
      ? null
      : tap.date === dayjs(today).subtract(1, 'day').format('YYYY-MM-DD')
        ? 'yesterday'
        : dayjs(tap.date).format('ddd, MMM D');
  const time = tap.tappedAt
    ? formatTimeWithTz(new Date(tap.tappedAt).toISOString(), tap.tz || undefined).time
    : null;
  const parts = [time ? `at ${time}` : null, day && day !== 'yesterday' ? `on ${day}` : day];
  const when = parts.filter(Boolean).join(' ');
  return { when: when ? ` ${when}` : '', day };
};

/**
 * Asks about each "Mark done" tap from the alarm before it becomes a log. A
 * tap on a locked phone is easy to make by accident, and easy to make before
 * the habit is actually done — so nothing is logged until it's confirmed here.
 *
 * "Not done" drops the tap for good. Closing the sheet leaves it for next time.
 */
export const AlarmDoneConfirm: React.FC = () => {
  const { current, settle, defer } = useAlarmActions();
  const logAlarmTap = useAttendanceStore((state) => state.logAlarmTap);
  const submitting = React.useRef(false);
  const alerted = React.useRef(new Set<string>());

  // A tap outside the habit's window can't count, but saying nothing would
  // look like the app lost it.
  React.useEffect(() => {
    if (!current || current.insideWindow || alerted.current.has(current.id)) return;
    alerted.current.add(current.id);
    const { when } = describeTap(current);
    Alert.alert(
      `${current.activity.name} wasn't logged`,
      `You marked it done${when}, outside the time this habit can be logged.`,
      [{ text: 'OK', onPress: () => settle(current.id) }],
      { cancelable: false },
    );
  }, [current, settle]);

  if (!current || !current.insideWindow) return null;

  const { activity } = current;
  const { when, day } = describeTap(current);
  const subtitle = [
    `You tapped Mark done on the alarm${when}.`,
    day ? `It will be logged for ${day}.` : null,
    activity.requiresNote ? 'Add a note to finish logging.' : null,
  ]
    .filter(Boolean)
    .join(' ');

  const handleSubmit = async (note: string, value?: number) => {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const logged = await logAlarmTap(
        activity.id,
        {
          date: current.date,
          ts: current.tappedAt ? new Date(current.tappedAt).toISOString() : dayjs().toISOString(),
          tz: current.tz || undefined,
        },
        note,
        value,
      );
      if (logged) haptics.success();
      else haptics.error();
      settle(current.id);
    } finally {
      submitting.current = false;
    }
  };

  return (
    <NoteInputModal
      // Remount per tap, so one tap's half-typed note never carries into the next.
      key={current.id}
      visible
      activityName={activity.name}
      title="Did you do it?"
      subtitle={subtitle}
      submitLabel="Log it"
      cancelLabel="Not done"
      showNote={!!activity.requiresNote}
      metric={activity.metric}
      onClose={() => defer(current.id)}
      onCancel={() => {
        haptics.light();
        settle(current.id);
      }}
      onSubmit={handleSubmit}
    />
  );
};
