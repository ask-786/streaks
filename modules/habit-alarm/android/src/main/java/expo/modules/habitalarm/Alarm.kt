package expo.modules.habitalarm

import android.content.Context
import android.content.Intent
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * One scheduled ring. `id` is unique per ring (a habit with a 14-day window has
 * 14 of them), and snoozes get their own id so JS rescheduling can leave them be.
 */
data class Alarm(
  val id: String,
  val activityId: String,
  val title: String,
  val message: String,
  val triggerAt: Long,
  val snooze: Boolean = false,
) {
  fun toJson(): JSONObject = JSONObject()
    .put("id", id)
    .put("activityId", activityId)
    .put("title", title)
    .put("message", message)
    .put("triggerAt", triggerAt)
    .put("snooze", snooze)

  fun writeTo(intent: Intent): Intent = intent.putExtra(EXTRA_ALARM, toJson().toString())

  companion object {
    private const val EXTRA_ALARM = "expo.modules.habitalarm.ALARM"

    fun fromJson(json: JSONObject) = Alarm(
      id = json.getString("id"),
      activityId = json.getString("activityId"),
      title = json.getString("title"),
      message = json.optString("message", ""),
      triggerAt = json.getLong("triggerAt"),
      snooze = json.optBoolean("snooze", false),
    )

    fun readFrom(intent: Intent?): Alarm? =
      intent?.getStringExtra(EXTRA_ALARM)?.let { fromJson(JSONObject(it)) }
  }
}

/**
 * SharedPreferences-backed state. It has to outlive the JS runtime: alarms are
 * re-armed after a reboot with no JS running, and "Mark done" taps are queued
 * here until the app next comes to the foreground and the user confirms them.
 */
object AlarmStore {
  private const val PREFS = "expo.modules.habitalarm"
  private const val KEY_ALARMS = "alarms"
  private const val KEY_PENDING_DONE = "pendingDone"

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun getAlarms(context: Context): List<Alarm> {
    val raw = prefs(context).getString(KEY_ALARMS, null) ?: return emptyList()
    val array = JSONArray(raw)
    return (0 until array.length()).map { Alarm.fromJson(array.getJSONObject(it)) }
  }

  fun setAlarms(context: Context, alarms: List<Alarm>) {
    val array = JSONArray()
    alarms.forEach { array.put(it.toJson()) }
    prefs(context).edit().putString(KEY_ALARMS, array.toString()).apply()
  }

  fun remove(context: Context, id: String) {
    setAlarms(context, getAlarms(context).filterNot { it.id == id })
  }

  private fun localDate(at: Date) = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(at)

  private fun pendingArray(context: Context): JSONArray =
    prefs(context).getString(KEY_PENDING_DONE, null)?.let { JSONArray(it) } ?: JSONArray()

  /**
   * Queues a "Mark done" tap with the moment it happened, so a log confirmed
   * hours (or days) later still lands on the right day at the right time, and
   * a time window is judged against the tap rather than the app opening.
   */
  fun addPendingDone(context: Context, activityId: String) {
    val now = Date()
    val array = pendingArray(context)
    array.put(
      JSONObject()
        .put("id", "$activityId:${now.time}")
        .put("activityId", activityId)
        .put("date", localDate(now))
        .put("time", SimpleDateFormat("HH:mm", Locale.US).format(now))
        .put("tappedAt", now.time)
        .put("tz", TimeZone.getDefault().id),
    )
    prefs(context).edit().putString(KEY_PENDING_DONE, array.toString()).apply()
  }

  /**
   * The queued taps, left in place: they're only removed once the user has
   * answered for them, so a confirmation cut short by the app closing asks again.
   */
  fun getPendingDone(context: Context): List<Map<String, Any>> {
    val array = pendingArray(context)
    return (0 until array.length()).map {
      val entry = array.getJSONObject(it)
      val activityId = entry.getString("activityId")
      // Taps queued before they carried a time have only their date to go on.
      val tappedAt = entry.optLong("tappedAt", 0L)
      mapOf(
        "id" to entry.optString("id", "$activityId:${entry.getString("date")}"),
        "activityId" to activityId,
        "date" to entry.getString("date"),
        "time" to entry.optString("time", ""),
        "tappedAt" to tappedAt.toDouble(),
        "tz" to entry.optString("tz", ""),
      )
    }
  }

  fun removePendingDone(context: Context, ids: Set<String>) {
    val array = pendingArray(context)
    val kept = JSONArray()
    for (i in 0 until array.length()) {
      val entry = array.getJSONObject(i)
      val id = entry.optString("id", "${entry.getString("activityId")}:${entry.getString("date")}")
      if (id !in ids) kept.put(entry)
    }
    prefs(context).edit().putString(KEY_PENDING_DONE, kept.toString()).apply()
  }

  /** Whether `activityId` was marked done today and the tap is still waiting on the app. */
  fun hasPendingDoneToday(context: Context, activityId: String): Boolean {
    val today = localDate(Date())
    val array = pendingArray(context)
    return (0 until array.length()).any {
      val entry = array.getJSONObject(it)
      entry.getString("activityId") == activityId && entry.getString("date") == today
    }
  }
}
