package com.bco.shared.platform

import androidx.compose.runtime.staticCompositionLocalOf
import kotlinx.coroutines.flow.Flow

interface PreferencesProvider {
    val themePreferenceFlow: Flow<String>
    val onboardingCompleteFlow: Flow<Boolean>

    var themePreference: String
    var onboardingComplete: Boolean
    var targetBTAddress: String?
    var targetBTName: String?
    var lastSelectedAt: String?
    var autoStart: Boolean
    var coreLogLevel: Int
    var baseBias: Int
    var detailedNotifications: Boolean
    var peerEventSoundEnabled: Boolean
    var hasPromptedBatteryOptimizationExemption: Boolean
    var btUptimeDateKey: String?
    var btUptimeAccumulatedMs: Long
    var btUptimeConnectStartedAt: Long?

    fun clearTargetDevice()

    companion object {
        const val THEME_DARK: String = "dark"
        const val THEME_LIGHT: String = "light"
        const val THEME_SYSTEM: String = "system"

        const val CORE_LOG_LEVEL_DEBUG: Int = 0
        const val CORE_LOG_LEVEL_INFO: Int = 1
        const val CORE_LOG_LEVEL_WARN: Int = 2
        const val CORE_LOG_LEVEL_ERROR: Int = 3
    }
}

val LocalPreferencesProvider = staticCompositionLocalOf<PreferencesProvider> {
    error("No PreferencesProvider provided")
}
