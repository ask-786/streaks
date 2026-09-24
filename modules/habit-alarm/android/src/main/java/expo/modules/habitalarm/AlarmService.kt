package expo.modules.habitalarm

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.ServiceCompat

/**
 * Rings an alarm: loops the user's alarm sound at alarm volume and vibrates
 * until Snooze, Mark done or Dismiss stops the service, or until it gives up
 * after RING_TIMEOUT_MS the way a clock app does.
 */
class AlarmService : Service() {
  private var player: MediaPlayer? = null
  private var vibrator: Vibrator? = null
  private val handler = Handler(Looper.getMainLooper())
  private var ringing: Alarm? = null
  private val timeout = Runnable { giveUp() }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val alarm = Alarm.readFrom(intent)
    if (alarm == null) {
      stopSelf()
      return START_NOT_STICKY
    }

    // A second alarm while one is ringing takes over the screen and the sound.
    stopRinging()
    ringing = alarm

    ensureChannels(this)
    ServiceCompat.startForeground(
      this,
      RINGING_NOTIFICATION_ID,
      ringingNotification(alarm),
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
      } else {
        0
      },
    )
    startRinging()
    handler.postDelayed(timeout, RING_TIMEOUT_MS)
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    stopRinging()
    super.onDestroy()
  }

  private fun ringingNotification(alarm: Alarm): android.app.Notification {
    val immutable = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    val screen = PendingIntent.getActivity(this, 0, AlarmActivity.intent(this, alarm), immutable)
    val done = PendingIntent.getActivity(
      this,
      1,
      AlarmActivity.intent(this, alarm).setAction(AlarmActions.ACTION_DONE),
      immutable,
    )
    val snooze = PendingIntent.getBroadcast(
      this,
      2,
      alarm.writeTo(Intent(this, AlarmActionReceiver::class.java).setAction(AlarmActions.ACTION_SNOOZE)),
      immutable,
    )
    val dismiss = PendingIntent.getBroadcast(
      this,
      3,
      alarm.writeTo(Intent(this, AlarmActionReceiver::class.java).setAction(AlarmActions.ACTION_DISMISS)),
      immutable,
    )

    return NotificationCompat.Builder(this, CHANNEL_RINGING)
      .setSmallIcon(smallIcon(this))
      .setContentTitle(alarm.title)
      .setContentText(alarm.message)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setAutoCancel(false)
      // Shows AlarmActivity over the lock screen when the device is locked or
      // the screen is off; otherwise the system shows a heads-up with the buttons.
      .setFullScreenIntent(screen, true)
      .setContentIntent(screen)
      .addAction(0, "Snooze ${AlarmScheduler.SNOOZE_MINUTES} min", snooze)
      .addAction(0, "Mark done", done)
      .addAction(0, "Dismiss", dismiss)
      .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
      .build()
  }

  private fun startRinging() {
    val attributes = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_ALARM)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()

    player = alarmSoundCandidates().firstNotNullOfOrNull { uri ->
      try {
        MediaPlayer().apply {
          setAudioAttributes(attributes)
          setDataSource(this@AlarmService, uri)
          isLooping = true
          setWakeMode(this@AlarmService, PowerManager.PARTIAL_WAKE_LOCK)
          prepare()
          start()
        }
      } catch (e: Exception) {
        null
      }
    }

    vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
    } else {
      @Suppress("DEPRECATION")
      getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
    }
    @Suppress("DEPRECATION")
    vibrator?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 800, 800), 0), attributes)
  }

  /** The user's alarm sound first; some devices have none set, so fall back to other system sounds. */
  private fun alarmSoundCandidates(): List<Uri> = listOfNotNull(
    RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_ALARM),
    RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
    RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE),
    RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
  )

  private fun stopRinging() {
    handler.removeCallbacks(timeout)
    player?.run {
      try {
        stop()
      } catch (_: IllegalStateException) {
      }
      release()
    }
    player = null
    vibrator?.cancel()
    vibrator = null
  }

  /** Nobody answered. Stop ringing, leave a quiet "missed" notification, and close the screen. */
  private fun giveUp() {
    val alarm = ringing
    stopRinging()
    if (alarm != null) {
      val open = packageManager.getLaunchIntentForPackage(packageName)?.let {
        PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_IMMUTABLE)
      }
      val missed = NotificationCompat.Builder(this, CHANNEL_MISSED)
        .setSmallIcon(smallIcon(this))
        .setContentTitle("Missed alarm: ${alarm.title}")
        .setContentText(alarm.message)
        .setContentIntent(open)
        .setAutoCancel(true)
        .build()
      try {
        NotificationManagerCompat.from(this).notify(alarm.activityId.hashCode(), missed)
      } catch (_: SecurityException) {
        // Notification permission revoked; nothing to show it with.
      }
    }
    sendBroadcast(Intent(AlarmActions.ACTION_CLOSE_SCREEN).setPackage(packageName))
    stopSelf()
  }

  companion object {
    private const val CHANNEL_RINGING = "habit_alarm_ringing"
    private const val CHANNEL_MISSED = "habit_alarm_missed"
    private const val RINGING_NOTIFICATION_ID = 0x4841 // "HA"
    private const val RING_TIMEOUT_MS = 10 * 60_000L

    fun startIntent(context: Context, alarm: Alarm): Intent =
      alarm.writeTo(Intent(context, AlarmService::class.java))

    /** The expo-notifications config plugin generates `notification_icon`; fall back to the app icon. */
    fun smallIcon(context: Context): Int {
      val id = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
      return if (id != 0) id else context.applicationInfo.icon
    }

    private fun ensureChannels(context: Context) {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
      val manager = context.getSystemService(NotificationManager::class.java)
      // Silent on purpose: the service plays the sound itself so it can loop at alarm volume.
      val ringingChannel = NotificationChannel(
        CHANNEL_RINGING,
        "Habit alarms",
        NotificationManager.IMPORTANCE_HIGH,
      ).apply {
        description = "Rings until you snooze, dismiss or mark the habit done"
        setSound(null, null)
        enableVibration(false)
        setBypassDnd(true)
        lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
      }
      val missedChannel = NotificationChannel(
        CHANNEL_MISSED,
        "Missed habit alarms",
        NotificationManager.IMPORTANCE_DEFAULT,
      )
      manager.createNotificationChannels(listOf(ringingChannel, missedChannel))
    }
  }
}
