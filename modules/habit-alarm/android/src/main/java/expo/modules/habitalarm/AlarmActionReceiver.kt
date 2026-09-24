package expo.modules.habitalarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Snooze and Dismiss from the notification's buttons. These don't need the app
 * or any UI, so they stay a broadcast. Mark done has to open the app, and
 * Android 12+ blocks starting activities from a receiver, so that button goes
 * straight to AlarmActivity instead.
 */
class AlarmActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val alarm = Alarm.readFrom(intent) ?: return
    when (intent.action) {
      AlarmActions.ACTION_SNOOZE -> AlarmActions.snooze(context, alarm)
      AlarmActions.ACTION_DISMISS -> AlarmActions.dismiss(context)
    }
  }
}

object AlarmActions {
  const val ACTION_SNOOZE = "expo.modules.habitalarm.SNOOZE"
  const val ACTION_DISMISS = "expo.modules.habitalarm.DISMISS"
  const val ACTION_DONE = "expo.modules.habitalarm.DONE"

  /** Sent to AlarmActivity so it closes when the alarm is handled from the notification instead. */
  const val ACTION_CLOSE_SCREEN = "expo.modules.habitalarm.CLOSE_SCREEN"

  fun dismiss(context: Context) {
    // stopService, unlike startService, is allowed while the app is in the background.
    context.stopService(Intent(context, AlarmService::class.java))
    context.sendBroadcast(Intent(ACTION_CLOSE_SCREEN).setPackage(context.packageName))
  }

  fun snooze(context: Context, alarm: Alarm) {
    AlarmScheduler.snooze(context, alarm)
    dismiss(context)
  }

  /** Queues the log for JS; the caller is responsible for opening the app. */
  fun done(context: Context, alarm: Alarm) {
    AlarmStore.addPendingDone(context, alarm.activityId)
    dismiss(context)
  }
}
