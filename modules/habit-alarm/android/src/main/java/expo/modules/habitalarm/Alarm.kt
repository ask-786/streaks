package expo.modules.habitalarm

import android.content.Context
import android.content.Intent
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

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
 * here until the app next comes to the foreground and logs them.
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

  fun addPendingDone(context: Context, activityId: String) {
    val raw = prefs(context).getString(KEY_PENDING_DONE, null)
    val array = if (raw != null) JSONArray(raw) else JSONArray()
    val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
    array.put(JSONObject().put("activityId", activityId).put("date", today))
    prefs(context).edit().putString(KEY_PENDING_DONE, array.toString()).apply()
  }

  /** Returns and clears the queued "Mark done" taps. */
  fun consumePendingDone(context: Context): List<Map<String, String>> {
    val raw = prefs(context).getString(KEY_PENDING_DONE, null) ?: return emptyList()
    prefs(context).edit().remove(KEY_PENDING_DONE).apply()
    val array = JSONArray(raw)
    return (0 until array.length()).map {
      val entry = array.getJSONObject(it)
      mapOf("activityId" to entry.getString("activityId"), "date" to entry.getString("date"))
    }
  }
}
