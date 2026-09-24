package expo.modules.habitalarm

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class AlarmSpec : Record {
  @Field val id: String = ""
  @Field val activityId: String = ""
  @Field val title: String = ""
  @Field val message: String = ""
  @Field val triggerAt: Double = 0.0
}

class HabitAlarmModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("HabitAlarm")

    Function("setAlarms") { specs: List<AlarmSpec> ->
      AlarmScheduler.replaceAll(
        context,
        specs.map {
          Alarm(
            id = it.id,
            activityId = it.activityId,
            title = it.title,
            message = it.message,
            triggerAt = it.triggerAt.toLong(),
          )
        },
      )
    }

    Function("cancelSnoozes") { activityIds: List<String> ->
      AlarmScheduler.cancelSnoozes(context, activityIds.toSet())
    }

    Function("consumePendingDone") {
      AlarmStore.consumePendingDone(context)
    }

    /** Android 14+ lets the user turn off full-screen alerts per app; below that it's always on. */
    Function("canUseFullScreenIntent") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        context.getSystemService(NotificationManager::class.java).canUseFullScreenIntent()
      } else {
        true
      }
    }

    Function("openFullScreenIntentSettings") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        context.startActivity(
          Intent(
            Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,
            Uri.parse("package:${context.packageName}"),
          ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        )
      }
    }
  }
}
