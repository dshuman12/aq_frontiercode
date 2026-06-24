package com.bco.android.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import com.bco.android.prefs.DevicePreferences

/**
 * Reacts to [Intent.ACTION_BOOT_COMPLETED].
 *
 * **Policy**: Start [BCOService] as a foreground service only when the user opted in via
 * [DevicePreferences.autoStart] **and** a target headset is saved ([DevicePreferences.targetBTAddress]
 * non-null). That matches Settings: the Start button stays disabled until a device is selected, so we
 * avoid launching the engine on boot with nothing to connect to. If [DevicePreferences.autoStart] is
 * false, we no-op.
 *
 * Manifest registration and `RECEIVE_BOOT_COMPLETED` are added in task T049.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != Intent.ACTION_BOOT_COMPLETED) return
        val prefs = DevicePreferences(context)
        if (!prefs.autoStart) return
        if (prefs.targetBTAddress.isNullOrBlank()) return
        val serviceIntent = Intent(context, BCOService::class.java)
        ContextCompat.startForegroundService(context, serviceIntent)
    }
}
