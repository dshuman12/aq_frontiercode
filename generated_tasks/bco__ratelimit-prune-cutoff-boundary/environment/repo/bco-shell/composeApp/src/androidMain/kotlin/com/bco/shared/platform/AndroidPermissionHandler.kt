package com.bco.shared.platform

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.content.ContextCompat

/**
 * Called when READ_PHONE_STATE permission is newly granted so the running service
 * can register its TelephonyCallback. Set by the androidApp module at startup.
 */
var notifyServicePermissionsChanged: () -> Unit = {}

@Composable
fun rememberAndroidPermissionHandler(activity: ComponentActivity): PermissionHandler {
    val bluetoothPermissions = remember {
        arrayOf(Manifest.permission.BLUETOOTH_CONNECT)
    }

    var pendingBluetooth by remember { mutableStateOf<((PermissionStatus) -> Unit)?>(null) }
    var pendingNotifications by remember { mutableStateOf<((PermissionStatus) -> Unit)?>(null) }
    var pendingPhoneState by remember { mutableStateOf<((PermissionStatus) -> Unit)?>(null) }

    val bluetoothLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { _ ->
        val cb = pendingBluetooth ?: return@rememberLauncherForActivityResult
        pendingBluetooth = null
        cb(classifyBluetoothResult(activity, bluetoothPermissions))
    }

    val notificationsLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { _ ->
        val cb = pendingNotifications ?: return@rememberLauncherForActivityResult
        pendingNotifications = null
        cb(classifySinglePermissionResult(activity, Manifest.permission.POST_NOTIFICATIONS))
    }

    val phoneStateLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { _ ->
        val cb = pendingPhoneState ?: return@rememberLauncherForActivityResult
        pendingPhoneState = null
        val result = classifySinglePermissionResult(activity, Manifest.permission.READ_PHONE_STATE)
        if (result == PermissionStatus.Granted) {
            try {
                notifyServicePermissionsChanged()
            } catch (_: Exception) { }
        }
        cb(result)
    }

    return remember(
        activity,
        bluetoothLauncher,
        notificationsLauncher,
        phoneStateLauncher,
        bluetoothPermissions,
    ) {
        object : PermissionHandler {
            override fun getPermissionStatus(permission: AppPermission): PermissionStatus {
                return when (permission) {
                    AppPermission.Bluetooth -> {
                        if (bluetoothPermissions.all {
                                ContextCompat.checkSelfPermission(activity, it) ==
                                    PackageManager.PERMISSION_GRANTED
                            }
                        ) {
                            PermissionStatus.Granted
                        } else {
                            PermissionStatus.Denied
                        }
                    }
                    AppPermission.PhoneState -> {
                        if (ContextCompat.checkSelfPermission(
                                activity,
                                Manifest.permission.READ_PHONE_STATE,
                            ) == PackageManager.PERMISSION_GRANTED
                        ) {
                            PermissionStatus.Granted
                        } else {
                            PermissionStatus.Denied
                        }
                    }
                    AppPermission.Notifications -> {
                        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
                            PermissionStatus.NotRequired
                        } else if (ContextCompat.checkSelfPermission(
                                activity,
                                Manifest.permission.POST_NOTIFICATIONS,
                            ) == PackageManager.PERMISSION_GRANTED
                        ) {
                            PermissionStatus.Granted
                        } else {
                            PermissionStatus.Denied
                        }
                    }
                }
            }

            override fun requestPermission(
                permission: AppPermission,
                onResult: (PermissionStatus) -> Unit,
            ) {
                when (permission) {
                    AppPermission.Bluetooth -> {
                        pendingBluetooth = onResult
                        bluetoothLauncher.launch(bluetoothPermissions)
                    }
                    AppPermission.Notifications -> {
                        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
                            onResult(PermissionStatus.NotRequired)
                            return
                        }
                        pendingNotifications = onResult
                        notificationsLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                    }
                    AppPermission.PhoneState -> {
                        pendingPhoneState = onResult
                        phoneStateLauncher.launch(Manifest.permission.READ_PHONE_STATE)
                    }
                }
            }

            override fun openAppSettings() {
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.fromParts("package", activity.packageName, null)
                }
                activity.startActivity(intent)
            }

            override fun openNotificationSettings() {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                        putExtra(Settings.EXTRA_APP_PACKAGE, activity.packageName)
                    }
                    activity.startActivity(intent)
                } else {
                    openAppSettings()
                }
            }
        }
    }
}

private fun classifyBluetoothResult(
    activity: ComponentActivity,
    permissions: Array<String>,
): PermissionStatus {
    val allGranted = permissions.all {
        ContextCompat.checkSelfPermission(activity, it) == PackageManager.PERMISSION_GRANTED
    }
    if (allGranted) return PermissionStatus.Granted
    val permanentlyDenied = permissions.any { perm ->
        ContextCompat.checkSelfPermission(activity, perm) == PackageManager.PERMISSION_DENIED &&
            !activity.shouldShowRequestPermissionRationale(perm)
    }
    return if (permanentlyDenied) PermissionStatus.DeniedPermanently else PermissionStatus.Denied
}

private fun classifySinglePermissionResult(
    activity: ComponentActivity,
    permission: String,
): PermissionStatus {
    if (ContextCompat.checkSelfPermission(activity, permission) ==
        PackageManager.PERMISSION_GRANTED
    ) {
        return PermissionStatus.Granted
    }
    val permanentlyDenied = ContextCompat.checkSelfPermission(activity, permission) ==
        PackageManager.PERMISSION_DENIED &&
        !activity.shouldShowRequestPermissionRationale(permission)
    return if (permanentlyDenied) PermissionStatus.DeniedPermanently else PermissionStatus.Denied
}
