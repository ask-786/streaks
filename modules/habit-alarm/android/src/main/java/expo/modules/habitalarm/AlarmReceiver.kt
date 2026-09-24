package expo.modules.habitalarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

/** Starts the ringing service when an alarm fires, and re-arms alarms after a reboot or update. */
class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      AlarmScheduler.ACTION_FIRE -> {
        val alarm = Alarm.readFrom(intent) ?: return
        AlarmStore.remove(context, alarm.id)
        // Starting a foreground service from the background is allowed here:
        // broadcasts from setAlarmClock alarms are exempt.
        ContextCompat.startForegroundService(context, AlarmService.startIntent(context, alarm))
      }
      Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED -> {
        AlarmScheduler.rearmAll(context)
      }
    }
  }
}
