package com.bco.shared.platform

import android.annotation.SuppressLint
import android.bluetooth.BluetoothA2dp
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.content.Context
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.coroutines.resume

class AndroidBluetoothA2dpTester(
    private val context: Context,
) : BluetoothA2dpTester {

    @SuppressLint("MissingPermission")
    override suspend fun testA2dpForAddress(
        address: String,
        errorBtOff: String,
        errorNotBonded: String,
        errorNoA2dp: String,
        errorNotConnected: String,
    ): BluetoothA2dpTestResult {
        val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
            ?: return BluetoothA2dpTestResult.Error(errorNoA2dp)
        val adapter = manager.adapter ?: return BluetoothA2dpTestResult.Error(errorNoA2dp)
        if (!adapter.isEnabled) return BluetoothA2dpTestResult.Error(errorBtOff)

        val bonded = adapter.bondedDevices?.find { it.address.equals(address, ignoreCase = true) }
            ?: return BluetoothA2dpTestResult.Error(errorNotBonded)

        val proxyResult = withTimeoutOrNull(5_000L) {
            suspendCancellableCoroutine<BluetoothA2dp?> { cont ->
                val listener = object : BluetoothProfile.ServiceListener {
                    override fun onServiceConnected(profile: Int, proxy: BluetoothProfile?) {
                        if (proxy is BluetoothA2dp && cont.isActive) {
                            cont.resume(proxy)
                        }
                    }

                    override fun onServiceDisconnected(profile: Int) {}
                }
                val requested = adapter.getProfileProxy(context, listener, BluetoothProfile.A2DP)
                if (!requested && cont.isActive) {
                    cont.resume(null)
                }
            }
        }

        if (proxyResult == null) return BluetoothA2dpTestResult.Error(errorNoA2dp)

        return try {
            val state = proxyResult.getConnectionState(bonded)
            if (state == BluetoothProfile.STATE_CONNECTED) {
                BluetoothA2dpTestResult.Success
            } else {
                BluetoothA2dpTestResult.Error(errorNotConnected)
            }
        } finally {
            adapter.closeProfileProxy(BluetoothProfile.A2DP, proxyResult)
        }
    }
}
