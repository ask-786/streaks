package expo.modules.habitalarm

import android.app.Activity
import android.app.KeyguardManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.text.format.DateFormat
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import java.util.Date

/**
 * The ringing screen, shown over the lock screen: the time, the habit, its
 * message, and Mark done / Snooze / Dismiss. Built in code so the module needs
 * no resources of its own.
 */
class AlarmActivity : Activity() {
  private var alarm: Alarm? = null

  /** Set while this screen is handling an action itself, so its own close broadcast doesn't cut it short. */
  private var handling = false

  private lateinit var timeView: TextView
  private lateinit var titleView: TextView
  private lateinit var messageView: TextView

  private val closeReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
      if (!handling) finish()
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    showOverLockScreen()
    setContentView(buildLayout())
    ContextCompat.registerReceiver(
      this,
      closeReceiver,
      IntentFilter(AlarmActions.ACTION_CLOSE_SCREEN),
      ContextCompat.RECEIVER_NOT_EXPORTED,
    )
    handle(intent)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    handle(intent)
  }

  override fun onDestroy() {
    unregisterReceiver(closeReceiver)
    super.onDestroy()
  }

  @Deprecated("Still the callback on the Android versions this app targets")
  override fun onBackPressed() {
    // Like a clock app: back doesn't silence the alarm. Pick an action.
  }

  private fun handle(intent: Intent?) {
    val incoming = Alarm.readFrom(intent)
    if (incoming == null) {
      finish()
      return
    }
    alarm = incoming
    timeView.text = DateFormat.getTimeFormat(this).format(Date())
    titleView.text = incoming.title
    messageView.text = incoming.message
    messageView.visibility = if (incoming.message.isBlank()) View.GONE else View.VISIBLE

    // "Mark done" tapped on the notification lands here, since only an activity may open the app.
    if (intent?.action == AlarmActions.ACTION_DONE) markDone()
  }

  private fun markDone() {
    val current = alarm ?: return finish()
    handling = true
    AlarmActions.done(this, current)
    val keyguard = getSystemService(KeyguardManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && keyguard.isKeyguardLocked) {
      // Unlock first so the app can open; if the user backs out, the log is
      // still queued and happens next time the app opens.
      keyguard.requestDismissKeyguard(
        this,
        object : KeyguardManager.KeyguardDismissCallback() {
          override fun onDismissSucceeded() = openAppAndFinish()
          override fun onDismissCancelled() = finish()
          override fun onDismissError() = finish()
        },
      )
    } else {
      openAppAndFinish()
    }
  }

  private fun openAppAndFinish() {
    packageManager.getLaunchIntentForPackage(packageName)?.let {
      startActivity(it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
    finish()
  }

  private fun snooze() {
    val current = alarm ?: return finish()
    handling = true
    AlarmActions.snooze(this, current)
    finish()
  }

  private fun dismiss() {
    handling = true
    AlarmActions.dismiss(this)
    finish()
  }

  private fun showOverLockScreen() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
      )
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
  }

  // ─── Layout ────────────────────────────────────────────────────────────────

  private fun dp(value: Int) = TypedValue.applyDimension(
    TypedValue.COMPLEX_UNIT_DIP,
    value.toFloat(),
    resources.displayMetrics,
  ).toInt()

  private fun buildLayout(): View {
    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      setBackgroundColor(BACKGROUND)
      setPadding(dp(24), dp(96), dp(24), dp(48))
    }

    timeView = TextView(this).apply {
      setTextColor(Color.WHITE)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 64f)
      typeface = Typeface.create("sans-serif-light", Typeface.NORMAL)
      gravity = Gravity.CENTER
    }
    titleView = TextView(this).apply {
      setTextColor(Color.WHITE)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 28f)
      typeface = Typeface.DEFAULT_BOLD
      gravity = Gravity.CENTER
      setPadding(0, dp(32), 0, 0)
    }
    messageView = TextView(this).apply {
      setTextColor(MUTED_TEXT)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
      gravity = Gravity.CENTER
      setPadding(0, dp(12), 0, 0)
    }

    val spacer = View(this)

    val done = button("Mark done", PRIMARY, Color.WHITE) { markDone() }
    val snooze = button("Snooze ${AlarmScheduler.SNOOZE_MINUTES} min", TONAL, Color.WHITE) { snooze() }
    val dismiss = button("Dismiss", Color.TRANSPARENT, MUTED_TEXT) { dismiss() }

    root.addView(timeView)
    root.addView(titleView)
    root.addView(messageView)
    root.addView(spacer, LinearLayout.LayoutParams(0, 0, 1f))
    listOf(done, snooze, dismiss).forEach {
      root.addView(
        it,
        LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(56)).apply {
          topMargin = dp(12)
        },
      )
    }
    return root
  }

  private fun button(label: String, fill: Int, textColor: Int, onClick: () -> Unit) =
    Button(this).apply {
      text = label
      isAllCaps = false
      setTextColor(textColor)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 17f)
      typeface = Typeface.DEFAULT_BOLD
      stateListAnimator = null
      background = GradientDrawable().apply {
        setColor(fill)
        cornerRadius = dp(28).toFloat()
      }
      setOnClickListener { onClick() }
    }

  companion object {
    // Matches the app's brand indigo (#5D51E4) on a deep indigo background.
    private val BACKGROUND = Color.parseColor("#15122E")
    private val PRIMARY = Color.parseColor("#5D51E4")
    private val TONAL = Color.parseColor("#2C2757")
    private val MUTED_TEXT = Color.parseColor("#C8C4EE")

    fun intent(context: Context, alarm: Alarm): Intent = alarm.writeTo(
      Intent(context, AlarmActivity::class.java)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_USER_ACTION),
    )
  }
}
