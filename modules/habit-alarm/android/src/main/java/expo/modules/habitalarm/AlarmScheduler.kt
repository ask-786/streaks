package expo.modules.habitalarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build

object AlarmScheduler {
  const val ACTION_FIRE = "expo.modules.habitalarm.FIRE"
  const val SNOOZE_MINUTES = 10

  private fun alarmManager(context: Context) =
    context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

  /** The data URI keeps each alarm's PendingIntent distinct, so one can be cancelled without the rest. */
  private fun fireIntent(context: Context, alarm: Alarm): PendingIntent {
    val intent = Intent(context, AlarmReceiver::class.java)
      .setAction(ACTION_FIRE)
      .setData(Uri.parse("habitalarm://alarm/${Uri.encode(alarm.id)}"))
    return PendingIntent.getBroadcast(
      context,
      0,
      alarm.writeTo(intent),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun arm(context: Context, alarm: Alarm) {
    val manager = alarmManager(context)
    val operation = fireIntent(context, alarm)
    val canBeExact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || manager.canScheduleExactAlarms()
    if (canBeExact) {
      // setAlarmClock is what clock apps use: exact, fires in Doze, and shows the
      // alarm icon in the status bar like any other alarm.
      val show = context.packageManager.getLaunchIntentForPackage(context.packageName)?.let {
        PendingIntent.getActivity(context, 0, it, PendingIntent.FLAG_IMMUTABLE)
      }
      manager.setAlarmClock(AlarmManager.AlarmClockInfo(alarm.triggerAt, show), operation)
    } else {
      // Exact-alarm access revoked in settings. Late beats never.
      manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, alarm.triggerAt, operation)
    }
  }

  private fun disarm(context: Context, alarm: Alarm) {
    alarmManager(context).cancel(fireIntent(context, alarm))
  }

  /**
   * Replaces every scheduled (non-snooze) alarm with `alarms`. Snoozes the user
   * asked for from the ringing screen are kept; `cancelSnoozes` clears those.
   */
  fun replaceAll(context: Context, alarms: List<Alarm>) {
    val (snoozes, previous) = AlarmStore.getAlarms(context).partition { it.snooze }
    previous.forEach { disarm(context, it) }
    val now = System.currentTimeMillis()
    val upcoming = alarms.filter { it.triggerAt > now }
    upcoming.forEach { arm(context, it) }
    AlarmStore.setAlarms(context, snoozes + upcoming)
  }

  fun cancelSnoozes(context: Context, activityIds: Set<String>) {
    val (doomed, kept) = AlarmStore.getAlarms(context).partition {
      it.snooze && it.activityId in activityIds
    }
    doomed.forEach { disarm(context, it) }
    AlarmStore.setAlarms(context, kept)
  }

  fun snooze(context: Context, alarm: Alarm) {
    val snoozed = alarm.copy(
      id = "${alarm.activityId}:snooze:${System.currentTimeMillis()}",
      triggerAt = System.currentTimeMillis() + SNOOZE_MINUTES * 60_000L,
      snooze = true,
    )
    arm(context, snoozed)
    AlarmStore.setAlarms(context, AlarmStore.getAlarms(context) + snoozed)
  }

  /** Alarms don't survive a reboot or an app update; re-arm whatever is still ahead. */
  fun rearmAll(context: Context) {
    val now = System.currentTimeMillis()
    val upcoming = AlarmStore.getAlarms(context).filter { it.triggerAt > now }
    upcoming.forEach { arm(context, it) }
    AlarmStore.setAlarms(context, upcoming)
  }
}
