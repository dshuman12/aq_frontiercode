package com.bco.android.platform

import com.bco.android.prefs.DevicePreferences
import com.bco.shared.platform.PreferencesProvider
import kotlinx.coroutines.flow.Flow

/**
 * [PreferencesProvider] backed by app [DevicePreferences] (SharedPreferences).
 */
class AndroidPreferencesProvider(
    private val prefs: DevicePreferences,
) : PreferencesProvider {

    override val themePreferenceFlow: Flow<String>
        get() = prefs.themePreferenceFlow

    override val onboardingCompleteFlow: Flow<Boolean>
        get() = prefs.onboardingCompleteFlow

    override var themePreference: String
        get() = prefs.themePreference
        set(value) {
            prefs.themePreference = value
        }

    override var onboardingComplete: Boolean
        get() = prefs.onboardingComplete
        set(value) {
            prefs.onboardingComplete = value
        }

    override var targetBTAddress: String?
        get() = prefs.targetBTAddress
        set(value) {
            prefs.targetBTAddress = value
        }

    override var targetBTName: String?
        get() = prefs.targetBTName
        set(value) {
            prefs.targetBTName = value
        }

    override var lastSelectedAt: String?
        get() = prefs.lastSelectedAt
        set(value) {
            prefs.lastSelectedAt = value
        }

    override var autoStart: Boolean
        get() = prefs.autoStart
        set(value) {
            prefs.autoStart = value
        }

    override var coreLogLevel: Int
        get() = prefs.coreLogLevel
        set(value) {
            prefs.coreLogLevel = value
        }

    override var baseBias: Int
        get() = prefs.baseBias
        set(value) {
            prefs.baseBias = value
        }

    override var detailedNotifications: Boolean
        get() = prefs.detailedNotifications
        set(value) {
            prefs.detailedNotifications = value
        }

    override var peerEventSoundEnabled: Boolean
        get() = prefs.peerEventSoundEnabled
        set(value) {
            prefs.peerEventSoundEnabled = value
        }

    override var hasPromptedBatteryOptimizationExemption: Boolean
        get() = prefs.hasPromptedBatteryOptimizationExemption
        set(value) {
            prefs.hasPromptedBatteryOptimizationExemption = value
        }

    override var btUptimeDateKey: String?
        get() = prefs.btUptimeDateKey
        set(value) {
            prefs.btUptimeDateKey = value
        }

    override var btUptimeAccumulatedMs: Long
        get() = prefs.btUptimeAccumulatedMs
        set(value) {
            prefs.btUptimeAccumulatedMs = value
        }

    override var btUptimeConnectStartedAt: Long?
        get() = prefs.btUptimeConnectStartedAt
        set(value) {
            prefs.btUptimeConnectStartedAt = value
        }

    override fun clearTargetDevice() {
        prefs.clearTargetDevice()
    }
}
