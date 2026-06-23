package com.bco.shared.platform

import java.awt.Desktop
import java.net.URI
import java.util.Locale

object DesktopPermissionHandler : PermissionHandler {
    override fun getPermissionStatus(permission: AppPermission): PermissionStatus =
        when (permission) {
            AppPermission.Notifications -> PermissionStatus.NotRequired
            AppPermission.PhoneState -> PermissionStatus.NotRequired
            else -> PermissionStatus.Granted
        }

    override fun requestPermission(permission: AppPermission, onResult: (PermissionStatus) -> Unit) {
        onResult(getPermissionStatus(permission))
    }

    override fun openAppSettings() {
        openSettings("bluetooth")
    }

    override fun openNotificationSettings() {
        openSettings("notifications")
    }

    private fun openSettings(kind: String) {
        val uri = resolveSettingsUri(kind)
        if (uri != null) {
            runCatching {
                if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
                    Desktop.getDesktop().browse(URI(uri))
                    return
                }
            }
        }
        System.err.println("BCO: no desktop settings launcher available for $kind")
    }

    private fun resolveSettingsUri(kind: String): String? {
        val osName = (System.getProperty("os.name") ?: "").lowercase(Locale.US)
        return when {
            osName.contains("mac") && kind == "bluetooth" ->
                "x-apple.systempreferences:com.apple.Bluetooth-Settings.extension"
            osName.contains("mac") && kind == "notifications" ->
                "x-apple.systempreferences:com.apple.Notifications-Settings.extension"
            osName.contains("win") && kind == "bluetooth" ->
                "ms-settings:bluetooth"
            osName.contains("win") && kind == "notifications" ->
                "ms-settings:notifications"
            else -> null
        }
    }
}
