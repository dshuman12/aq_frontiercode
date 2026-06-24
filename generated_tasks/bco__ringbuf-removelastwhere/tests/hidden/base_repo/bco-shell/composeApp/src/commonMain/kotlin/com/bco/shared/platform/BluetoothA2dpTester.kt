package com.bco.shared.platform

import androidx.compose.runtime.staticCompositionLocalOf

sealed class BluetoothA2dpTestResult {
    data object None : BluetoothA2dpTestResult()
    data object Testing : BluetoothA2dpTestResult()
    data object Success : BluetoothA2dpTestResult()
    data class Error(val message: String) : BluetoothA2dpTestResult()
}

/**
 * Verifies classic A2DP connection state for a bonded headset address (Android). Other targets
 * should return [BluetoothA2dpTestResult.Error].
 */
interface BluetoothA2dpTester {
    suspend fun testA2dpForAddress(
        address: String,
        errorBtOff: String,
        errorNotBonded: String,
        errorNoA2dp: String,
        errorNotConnected: String,
    ): BluetoothA2dpTestResult
}

val LocalBluetoothA2dpTester = staticCompositionLocalOf<BluetoothA2dpTester> {
    error("No BluetoothA2dpTester")
}
