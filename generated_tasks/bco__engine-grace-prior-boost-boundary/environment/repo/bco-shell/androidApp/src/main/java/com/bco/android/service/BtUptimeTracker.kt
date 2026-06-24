package com.bco.android.service

import com.bco.android.prefs.DevicePreferences
import java.time.Clock
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * Persists daily Bluetooth connection uptime in [DevicePreferences] ([DevicePreferences.PREFS_NAME]).
 * Resets accumulated time when the calendar day changes in [clock]'s zone.
 */
class BtUptimeTracker(
    private val preferences: DevicePreferences,
    private val clock: Clock = Clock.systemDefaultZone(),
) {

    fun onBluetoothConnected(nowMillis: Long = clock.instant().toEpochMilli()) {
        ensureSameDay(nowMillis)
        if (preferences.btUptimeConnectStartedAt != null) {
            return
        }
        preferences.btUptimeConnectStartedAt = nowMillis
    }

    fun onBluetoothDisconnected(nowMillis: Long = clock.instant().toEpochMilli()) {
        val started = preferences.btUptimeConnectStartedAt ?: return
        if (dateKeyForMillis(started) != dateKeyForMillis(nowMillis)) {
            preferences.btUptimeDateKey = dateKeyForMillis(nowMillis)
            val sod = startOfDayEpochMillis(nowMillis)
            preferences.btUptimeAccumulatedMs =
                maxOf(0L, nowMillis - maxOf(started, sod))
            preferences.btUptimeConnectStartedAt = null
        } else {
            ensureSameDay(nowMillis)
            preferences.btUptimeAccumulatedMs =
                preferences.btUptimeAccumulatedMs + (nowMillis - started)
            preferences.btUptimeConnectStartedAt = null
        }
    }

    fun ensureSameDay(nowMillis: Long) {
        val todayKey = dateKeyForMillis(nowMillis)
        val stored = preferences.btUptimeDateKey
        if (stored != null && stored == todayKey) {
            return
        }
        preferences.btUptimeDateKey = todayKey
        preferences.btUptimeAccumulatedMs = 0L
        val started = preferences.btUptimeConnectStartedAt
        if (started != null) {
            val clipped = maxOf(started, startOfDayEpochMillis(nowMillis))
            preferences.btUptimeConnectStartedAt =
                if (clipped >= nowMillis) null else clipped
        }
    }

    fun connectionMsToday(nowMillis: Long = clock.instant().toEpochMilli()): Long {
        ensureSameDay(nowMillis)
        val accumulated = preferences.btUptimeAccumulatedMs
        val startedAt = preferences.btUptimeConnectStartedAt
        val live =
            if (startedAt != null) {
                nowMillis - startedAt
            } else {
                0L
            }
        return accumulated + live
    }

    private fun dateKeyForMillis(millis: Long): String =
        Instant.ofEpochMilli(millis)
            .atZone(clock.zone)
            .toLocalDate()
            .format(DateTimeFormatter.ISO_LOCAL_DATE)

    /** Start of the local calendar day containing [millis], in [clock]'s zone. */
    private fun startOfDayEpochMillis(millis: Long): Long {
        val zone: ZoneId = clock.zone
        return Instant.ofEpochMilli(millis)
            .atZone(zone)
            .toLocalDate()
            .atStartOfDay(zone)
            .toInstant()
            .toEpochMilli()
    }
}
