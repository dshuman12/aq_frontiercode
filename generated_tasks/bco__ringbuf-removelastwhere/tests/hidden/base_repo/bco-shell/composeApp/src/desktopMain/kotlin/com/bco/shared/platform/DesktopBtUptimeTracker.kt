package com.bco.shared.platform

import java.time.Clock
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

internal class DesktopBtUptimeTracker(
    private val preferences: DesktopPreferencesProvider,
    private val clock: Clock = Clock.systemDefaultZone(),
) {
    fun onBluetoothConnected(nowMillis: Long = clock.instant().toEpochMilli()) {
        ensureSameDay(nowMillis)
        if (preferences.btUptimeConnectStartedAt != null) return
        preferences.btUptimeConnectStartedAt = nowMillis
    }

    fun onBluetoothDisconnected(nowMillis: Long = clock.instant().toEpochMilli()) {
        val started = preferences.btUptimeConnectStartedAt ?: return
        if (dateKeyForMillis(started) != dateKeyForMillis(nowMillis)) {
            preferences.btUptimeDateKey = dateKeyForMillis(nowMillis)
            val startOfDay = startOfDayEpochMillis(nowMillis)
            preferences.btUptimeAccumulatedMs = maxOf(0L, nowMillis - maxOf(started, startOfDay))
            preferences.btUptimeConnectStartedAt = null
            return
        }

        ensureSameDay(nowMillis)
        preferences.btUptimeAccumulatedMs += maxOf(0L, nowMillis - started)
        preferences.btUptimeConnectStartedAt = null
    }

    fun ensureSameDay(nowMillis: Long) {
        val todayKey = dateKeyForMillis(nowMillis)
        if (preferences.btUptimeDateKey == todayKey) return

        preferences.btUptimeDateKey = todayKey
        preferences.btUptimeAccumulatedMs = 0L
        val started = preferences.btUptimeConnectStartedAt ?: return
        val clipped = maxOf(started, startOfDayEpochMillis(nowMillis))
        preferences.btUptimeConnectStartedAt = if (clipped >= nowMillis) null else clipped
    }

    fun connectionMsToday(nowMillis: Long = clock.instant().toEpochMilli()): Long {
        ensureSameDay(nowMillis)
        val live = preferences.btUptimeConnectStartedAt?.let { maxOf(0L, nowMillis - it) } ?: 0L
        return preferences.btUptimeAccumulatedMs + live
    }

    private fun dateKeyForMillis(millis: Long): String =
        Instant.ofEpochMilli(millis)
            .atZone(clock.zone)
            .toLocalDate()
            .format(DateTimeFormatter.ISO_LOCAL_DATE)

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
