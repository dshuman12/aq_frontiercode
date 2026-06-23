package com.bco.shared.platform

import androidx.compose.runtime.staticCompositionLocalOf

enum class AppPermission {
    Bluetooth,
    PhoneState,
    Notifications,
}

enum class PermissionStatus {
    Granted,
    Denied,
    DeniedPermanently,
    NotRequired,
}

interface PermissionHandler {
    fun getPermissionStatus(permission: AppPermission): PermissionStatus
    fun requestPermission(permission: AppPermission, onResult: (PermissionStatus) -> Unit)
    fun openAppSettings()
    fun openNotificationSettings()
}

val LocalPermissionHandler = staticCompositionLocalOf<PermissionHandler> {
    error("No PermissionHandler provided")
}
