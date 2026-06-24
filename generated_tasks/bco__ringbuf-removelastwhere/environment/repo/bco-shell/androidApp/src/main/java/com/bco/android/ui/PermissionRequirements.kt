package com.bco.android.ui

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat

internal val bcoBluetoothPermissions: Array<String> = arrayOf(
    Manifest.permission.BLUETOOTH_CONNECT,
)

fun Context.hasBluetoothRuntimePermissions(): Boolean =
    bcoBluetoothPermissions.all {
        ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
    }

fun Context.hasReadPhoneStateRuntimePermission(): Boolean =
    ContextCompat.checkSelfPermission(
        this,
        Manifest.permission.READ_PHONE_STATE,
    ) == PackageManager.PERMISSION_GRANTED

fun Context.hasPostNotificationsIfRequired(): Boolean =
    if (Build.VERSION.SDK_INT >= 33) {
        ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED
    } else {
        true
    }

fun Context.hasAllBcoRuntimePermissions(): Boolean =
    hasBluetoothRuntimePermissions() &&
        hasPostNotificationsIfRequired()

/**
 * Permanent / "don’t ask again" style denial: denied and no rationale, only after [attemptedOnce]
 * so first launch before any system dialog does not look blocked.
 *
 * Bluetooth: if any required permission is denied without rationale after an attempt, treat the
 * whole step as blocked (user must use settings).
 */
internal fun Activity.isBluetoothPermissionStepBlocked(attemptedOnce: Boolean): Boolean {
    if (!attemptedOnce || hasBluetoothRuntimePermissions()) return false
    return bcoBluetoothPermissions.any { perm ->
        ContextCompat.checkSelfPermission(this, perm) == PackageManager.PERMISSION_DENIED &&
            !shouldShowRequestPermissionRationale(perm)
    }
}

internal fun Activity.isPhonePermissionStepBlocked(attemptedOnce: Boolean): Boolean {
    if (!attemptedOnce || hasReadPhoneStateRuntimePermission()) return false
    return ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) ==
        PackageManager.PERMISSION_DENIED &&
        !shouldShowRequestPermissionRationale(Manifest.permission.READ_PHONE_STATE)
}

internal fun Activity.isNotificationsPermissionStepBlocked(attemptedOnce: Boolean): Boolean {
    if (Build.VERSION.SDK_INT < 33) return false
    if (!attemptedOnce || hasPostNotificationsIfRequired()) return false
    return ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) ==
        PackageManager.PERMISSION_DENIED &&
        !shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS)
}
