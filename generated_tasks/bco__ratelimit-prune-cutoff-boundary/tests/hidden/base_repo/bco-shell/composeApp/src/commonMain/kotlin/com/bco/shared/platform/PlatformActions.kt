package com.bco.shared.platform

import androidx.compose.runtime.staticCompositionLocalOf

interface PlatformActions {
    fun copyToClipboard(text: String, label: String = "")
    fun showToast(message: String)
    fun shareText(subject: String, text: String, chooserTitle: String? = null)
    fun openUrl(url: String)
    fun getAppVersion(): String
    fun getBuildDiagnosticText(): String
    /** Native core (`libbconet`) version when available; otherwise null. */
    fun getCoreVersionOrNull(): String?
}

val LocalPlatformActions = staticCompositionLocalOf<PlatformActions> {
    error("No PlatformActions provided")
}
