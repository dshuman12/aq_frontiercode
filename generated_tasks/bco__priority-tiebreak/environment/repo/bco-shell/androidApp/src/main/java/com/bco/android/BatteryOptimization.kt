package com.bco.android

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.PowerManager
import android.provider.Settings
import com.bco.android.logging.BCOLogger

private const val TAG = "BatteryOpt"

fun Context.isIgnoringBatteryOptimizations(): Boolean {
    val pm = getSystemService(PowerManager::class.java) ?: return true
    return pm.isIgnoringBatteryOptimizations(packageName)
}

/**
 * Opens the system dialog to exempt this app from battery optimizations ([Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS]).
 */
fun Activity.launchIgnoreBatteryOptimizationsSettings() {
    val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
        data = Uri.parse("package:$packageName")
    }
    try {
        startActivity(intent)
    } catch (e: ActivityNotFoundException) {
        BCOLogger.w(TAG, "Battery optimization request not available on this device", e)
    }
}
