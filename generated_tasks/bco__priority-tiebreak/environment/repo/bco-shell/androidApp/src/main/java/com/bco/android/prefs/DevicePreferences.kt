package com.bco.android.prefs

import android.content.Context
import android.content.SharedPreferences
import com.bco.android.bluetooth.MacAddress
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.distinctUntilChanged

/**
 * Persisted Bluetooth target device; prefs name `bco_preferences` per data-model.md.
 */
class DevicePreferences(context: Context) {

    private val prefs: SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    /**
     * Saved A2DP target MAC, canonicalized to Android's `AA:BB:CC:DD:EE:FF` form.
     *
     * `HEADSET_AUTO_SYNC` events from non-Android peers can arrive in `aa-bb-cc-dd-ee-ff` form
     * (macOS `IOBluetoothDevice.addressString`); canonicalizing on write keeps every consumer
     * (`BluetoothAdapter.getRemoteDevice`, broadcast filters, the Go core) format-agnostic.
     * Canonicalizing on read also auto-recovers any bad-format value already persisted before this fix.
     */
    var targetBTAddress: String?
        get() = MacAddress.canonicalize(prefs.getString(KEY_TARGET_BT_ADDRESS, null))
            ?: prefs.getString(KEY_TARGET_BT_ADDRESS, null)
        set(value) {
            val canonical = MacAddress.canonicalize(value) ?: value
            prefs.edit().putString(KEY_TARGET_BT_ADDRESS, canonical).apply()
        }

    var targetBTName: String?
        get() = prefs.getString(KEY_TARGET_BT_NAME, null)
        set(value) {
            prefs.edit().putString(KEY_TARGET_BT_NAME, value).apply()
        }

    var lastSelectedAt: String?
        get() = prefs.getString(KEY_LAST_SELECTED_AT, null)
        set(value) {
            prefs.edit().putString(KEY_LAST_SELECTED_AT, value).apply()
        }

    fun saveTargetDevice(address: String, name: String?, lastSelectedAt: String?) {
        val canonical = MacAddress.canonicalize(address) ?: address
        prefs.edit().apply {
            putString(KEY_TARGET_BT_ADDRESS, canonical)
            if (name != null) {
                putString(KEY_TARGET_BT_NAME, name)
            }
            if (lastSelectedAt != null) {
                putString(KEY_LAST_SELECTED_AT, lastSelectedAt)
            }
        }.apply()
    }

    fun clearTargetDevice() {
        prefs.edit()
            .remove(KEY_TARGET_BT_ADDRESS)
            .remove(KEY_TARGET_BT_NAME)
            .remove(KEY_LAST_SELECTED_AT)
            .apply()
    }

    /**
     * When true, [com.bco.android.service.BootReceiver] may start [com.bco.android.service.BCOService]
     * after device boot (see receiver for full policy).
     */
    var autoStart: Boolean
        get() = prefs.getBoolean(KEY_AUTO_START, false)
        set(value) {
            prefs.edit().putBoolean(KEY_AUTO_START, value).apply()
        }

    /**
     * Set after we show [android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS] once
     * from [com.bco.android.MainActivity] so we do not loop the system dialog on every resume.
     */
    var hasPromptedBatteryOptimizationExemption: Boolean
        get() = prefs.getBoolean(KEY_BATTERY_OPT_PROMPTED, false)
        set(value) {
            prefs.edit().putBoolean(KEY_BATTERY_OPT_PROMPTED, value).apply()
        }

    var onboardingComplete: Boolean
        get() = prefs.getBoolean(KEY_ONBOARDING_COMPLETE, false)
        set(value) {
            prefs.edit().putBoolean(KEY_ONBOARDING_COMPLETE, value).apply()
        }

    /**
     * Emits [onboardingComplete] on subscribe and whenever it changes.
     */
    val onboardingCompleteFlow: Flow<Boolean> = callbackFlow {
        val listener = SharedPreferences.OnSharedPreferenceChangeListener { _, key ->
            if (key == KEY_ONBOARDING_COMPLETE) {
                trySend(onboardingComplete)
            }
        }
        prefs.registerOnSharedPreferenceChangeListener(listener)
        trySend(onboardingComplete)
        awaitClose { prefs.unregisterOnSharedPreferenceChangeListener(listener) }
    }.distinctUntilChanged()

    /**
     * UI theme: [THEME_DARK], [THEME_LIGHT], or [THEME_SYSTEM] (see theme-colors.md).
     */
    var themePreference: String
        get() = prefs.getString(KEY_THEME_PREFERENCE, THEME_DARK) ?: THEME_DARK
        set(value) {
            prefs.edit().putString(KEY_THEME_PREFERENCE, value).apply()
        }

    /**
     * Emits the current [themePreference] on subscribe and whenever it changes.
     */
    val themePreferenceFlow: Flow<String> = callbackFlow {
        val listener = SharedPreferences.OnSharedPreferenceChangeListener { _, key ->
            if (key == KEY_THEME_PREFERENCE) {
                trySend(themePreference)
            }
        }
        prefs.registerOnSharedPreferenceChangeListener(listener)
        trySend(themePreference)
        awaitClose { prefs.unregisterOnSharedPreferenceChangeListener(listener) }
    }.distinctUntilChanged()

    /** ISO `YYYY-MM-DD` for which [btUptimeAccumulatedMs] applies; null if unset or cleared. */
    var btUptimeDateKey: String?
        get() = prefs.getString(KEY_BT_UPTIME_DATE_KEY, null)?.takeUnless { it.isEmpty() }
        set(value) {
            prefs.edit().apply {
                if (value.isNullOrEmpty()) {
                    remove(KEY_BT_UPTIME_DATE_KEY)
                } else {
                    putString(KEY_BT_UPTIME_DATE_KEY, value)
                }
            }.apply()
        }

    var btUptimeAccumulatedMs: Long
        get() = prefs.getLong(KEY_BT_UPTIME_ACCUMULATED_MS, 0L)
        set(value) {
            prefs.edit().putLong(KEY_BT_UPTIME_ACCUMULATED_MS, value).apply()
        }

    /** System clock millis when the current BT session started; null when disconnected. */
    var btUptimeConnectStartedAt: Long?
        get() =
            if (prefs.contains(KEY_BT_UPTIME_CONNECT_STARTED_AT)) {
                prefs.getLong(KEY_BT_UPTIME_CONNECT_STARTED_AT, 0L)
            } else {
                null
            }
        set(value) {
            prefs.edit().apply {
                if (value == null) {
                    remove(KEY_BT_UPTIME_CONNECT_STARTED_AT)
                } else {
                    putLong(KEY_BT_UPTIME_CONNECT_STARTED_AT, value)
                }
            }.apply()
        }

    var localPaused: Boolean
        get() = prefs.getBoolean(KEY_LOCAL_PAUSED, false)
        set(value) {
            prefs.edit().putBoolean(KEY_LOCAL_PAUSED, value).apply()
        }

    /**
     * Richer foreground notification layout when true; compact summary when false.
     */
    var detailedNotifications: Boolean
        get() = prefs.getBoolean(KEY_DETAILED_NOTIFICATIONS, true)
        set(value) {
            prefs.edit().putBoolean(KEY_DETAILED_NOTIFICATIONS, value).apply()
        }

    /** Sound / haptic for pairing request notifications. */
    var peerEventSoundEnabled: Boolean
        get() = prefs.getBoolean(KEY_PEER_EVENT_SOUND, true)
        set(value) {
            prefs.edit().putBoolean(KEY_PEER_EVENT_SOUND, value).apply()
        }

    /**
     * Go core minimum log level: [CORE_LOG_LEVEL_DEBUG] … [CORE_LOG_LEVEL_ERROR] (see bco-core/logger.go).
     */
    var coreLogLevel: Int
        get() = prefs.getInt(KEY_CORE_LOG_LEVEL, CORE_LOG_LEVEL_INFO)
        set(value) {
            val clamped = value.coerceIn(CORE_LOG_LEVEL_DEBUG, CORE_LOG_LEVEL_ERROR)
            prefs.edit().putInt(KEY_CORE_LOG_LEVEL, clamped).apply()
        }

    /** Per-device static priority boost (sent on wire via DeviceState.baseBias). */
    var baseBias: Int
        get() = prefs.getInt(KEY_BASE_BIAS, 0)
        set(value) {
            prefs.edit().putInt(KEY_BASE_BIAS, value).apply()
        }

    companion object {
        const val PREFS_NAME: String = "bco_preferences"
        const val KEY_THEME_PREFERENCE: String = "theme_preference"
        const val THEME_DARK: String = "dark"
        const val THEME_LIGHT: String = "light"
        const val THEME_SYSTEM: String = "system"
        const val KEY_TARGET_BT_ADDRESS: String = "bco.targetBTAddress"
        const val KEY_TARGET_BT_NAME: String = "bco.targetBTName"
        const val KEY_LAST_SELECTED_AT: String = "bco.lastSelectedAt"
        const val KEY_AUTO_START: String = "bco.autoStart"
        const val KEY_BATTERY_OPT_PROMPTED: String = "bco.batteryOptPrompted"
        const val KEY_ONBOARDING_COMPLETE: String = "bco.onboardingComplete"
        const val KEY_BT_UPTIME_DATE_KEY: String = "bco.btUptimeDateKey"
        const val KEY_BT_UPTIME_ACCUMULATED_MS: String = "bco.btUptimeAccumulatedMs"
        const val KEY_BT_UPTIME_CONNECT_STARTED_AT: String = "bco.btUptimeConnectStartedAt"
        const val KEY_LOCAL_PAUSED: String = "bco.localPaused"
        const val KEY_DETAILED_NOTIFICATIONS: String = "bco.detailedNotifications"
        const val KEY_PEER_EVENT_SOUND: String = "bco.peerEventSound"
        const val KEY_CORE_LOG_LEVEL: String = "bco.coreLogLevel"
        const val KEY_BASE_BIAS: String = "bco.baseBias"

        /** Matches Go [bco-core/logger.go] LogLevelDebug … LogLevelError. */
        const val CORE_LOG_LEVEL_DEBUG: Int = 0
        const val CORE_LOG_LEVEL_INFO: Int = 1
        const val CORE_LOG_LEVEL_WARN: Int = 2
        const val CORE_LOG_LEVEL_ERROR: Int = 3
    }
}
