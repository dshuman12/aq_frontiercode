package com.bco.android.prefs

import android.app.Application
import android.content.Context
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [33], application = Application::class)
class DevicePreferencesTest {

    private lateinit var context: Context

    @Before
    fun setup() {
        context = ApplicationProvider.getApplicationContext()
        context.getSharedPreferences(DevicePreferences.PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .clear()
            .apply()
    }

    @Test
    fun missingTargetDevice_allGettersNull() {
        val prefs = DevicePreferences(context)
        assertNull(prefs.targetBTAddress)
        assertNull(prefs.targetBTName)
        assertNull(prefs.lastSelectedAt)
    }

    @Test
    fun targetDeviceFields_roundTrip() {
        val prefs = DevicePreferences(context)
        prefs.targetBTAddress = "AA:BB:CC:11:22:33"
        prefs.targetBTName = "My Headset"
        prefs.lastSelectedAt = "2026-03-31T12:00:00Z"

        val loaded = DevicePreferences(context)
        assertEquals("AA:BB:CC:11:22:33", loaded.targetBTAddress)
        assertEquals("My Headset", loaded.targetBTName)
        assertEquals("2026-03-31T12:00:00Z", loaded.lastSelectedAt)
    }

    @Test
    fun targetBTAddress_normalizesHyphenLowercaseFromMacOSPeer() {
        val prefs = DevicePreferences(context)
        prefs.targetBTAddress = "78-c1-1d-46-28-b4"

        assertEquals("78:C1:1D:46:28:B4", DevicePreferences(context).targetBTAddress)
    }

    @Test
    fun targetBTAddress_readPathRecoversLegacyHyphenLowercaseValue() {
        // Simulate a value stored before the normalization fix landed (e.g. from HEADSET_AUTO_SYNC).
        context.getSharedPreferences(DevicePreferences.PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(DevicePreferences.KEY_TARGET_BT_ADDRESS, "78-c1-1d-46-28-b4")
            .apply()

        assertEquals("78:C1:1D:46:28:B4", DevicePreferences(context).targetBTAddress)
    }

    @Test
    fun saveTargetDevice_writesTargetFieldsTogetherAndNormalizesAddress() {
        val prefs = DevicePreferences(context)

        prefs.saveTargetDevice(
            address = "78-c1-1d-46-28-b4",
            name = "Peer Headset",
            lastSelectedAt = "2026-04-25T05:00:00Z",
        )

        val loaded = DevicePreferences(context)
        assertEquals("78:C1:1D:46:28:B4", loaded.targetBTAddress)
        assertEquals("Peer Headset", loaded.targetBTName)
        assertEquals("2026-04-25T05:00:00Z", loaded.lastSelectedAt)
    }

    @Test
    fun clearTargetDevice_removesAllTargetFields() {
        val prefs = DevicePreferences(context)
        prefs.targetBTAddress = "01:02:03:04:05:06"
        prefs.targetBTName = "Unit"
        prefs.lastSelectedAt = "epoch"

        prefs.clearTargetDevice()

        assertNull(prefs.targetBTAddress)
        assertNull(prefs.targetBTName)
        assertNull(prefs.lastSelectedAt)
    }

    @Test
    fun clearTargetDevice_doesNotClearAutoStartOrBatteryOptFlag() {
        val prefs = DevicePreferences(context)
        prefs.targetBTAddress = "AA:AA:AA:AA:AA:AA"
        prefs.autoStart = true
        prefs.hasPromptedBatteryOptimizationExemption = true

        prefs.clearTargetDevice()

        assertTrue(prefs.autoStart)
        assertTrue(prefs.hasPromptedBatteryOptimizationExemption)
    }

    @Test
    fun autoStart_defaultsFalseAndPersists() {
        val first = DevicePreferences(context)
        assertFalse(first.autoStart)

        first.autoStart = true
        assertTrue(DevicePreferences(context).autoStart)

        first.autoStart = false
        assertFalse(DevicePreferences(context).autoStart)
    }

    @Test
    fun localPaused_defaultsFalseAndPersists() {
        val first = DevicePreferences(context)
        assertFalse(first.localPaused)

        first.localPaused = true
        assertTrue(DevicePreferences(context).localPaused)

        first.localPaused = false
        assertFalse(DevicePreferences(context).localPaused)
    }

    @Test
    fun batteryOptimizationPrompted_defaultsFalseAndPersists() {
        val first = DevicePreferences(context)
        assertFalse(first.hasPromptedBatteryOptimizationExemption)

        first.hasPromptedBatteryOptimizationExemption = true
        assertTrue(DevicePreferences(context).hasPromptedBatteryOptimizationExemption)
    }

    @Test
    fun themePreference_defaultsDarkAndPersists() {
        val first = DevicePreferences(context)
        assertEquals(DevicePreferences.THEME_DARK, first.themePreference)

        first.themePreference = DevicePreferences.THEME_LIGHT
        assertEquals(DevicePreferences.THEME_LIGHT, DevicePreferences(context).themePreference)

        first.themePreference = DevicePreferences.THEME_SYSTEM
        assertEquals(DevicePreferences.THEME_SYSTEM, DevicePreferences(context).themePreference)
    }

    @Test
    fun notificationAndLogPrefs_defaultsAndPersist() {
        val prefs = DevicePreferences(context)
        assertTrue(prefs.detailedNotifications)
        assertTrue(prefs.peerEventSoundEnabled)
        assertEquals(DevicePreferences.CORE_LOG_LEVEL_INFO, prefs.coreLogLevel)

        prefs.detailedNotifications = false
        prefs.peerEventSoundEnabled = false
        prefs.coreLogLevel = DevicePreferences.CORE_LOG_LEVEL_DEBUG

        val loaded = DevicePreferences(context)
        assertFalse(loaded.detailedNotifications)
        assertFalse(loaded.peerEventSoundEnabled)
        assertEquals(DevicePreferences.CORE_LOG_LEVEL_DEBUG, loaded.coreLogLevel)
    }

    @Test
    fun coreLogLevel_clampsToValidRange() {
        val prefs = DevicePreferences(context)
        prefs.coreLogLevel = 99
        assertEquals(DevicePreferences.CORE_LOG_LEVEL_ERROR, prefs.coreLogLevel)
        prefs.coreLogLevel = -5
        assertEquals(DevicePreferences.CORE_LOG_LEVEL_DEBUG, prefs.coreLogLevel)
    }
}
