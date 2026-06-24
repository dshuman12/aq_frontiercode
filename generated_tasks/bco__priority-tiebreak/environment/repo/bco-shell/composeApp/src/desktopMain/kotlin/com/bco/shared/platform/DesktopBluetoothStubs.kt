package com.bco.shared.platform

import androidx.compose.ui.graphics.ImageBitmap

class DesktopBluetoothDeviceProvider(
    private val helperClient: DesktopNativeHelperClient,
) : BluetoothDeviceProvider {
    override suspend fun getBondedAudioDevices(): List<BluetoothDeviceInfo> {
        return helperClient.listAudioDevices()
    }

    override suspend fun getAdapterDisplayNameOrNull(): String? {
        return helperClient.getAdapterDisplayNameOrNull()
    }
}

object NoOpQrCodeProvider : QrCodeProvider {
    override fun generateQrBitmap(
        content: String,
        size: Int,
        foregroundArgb: Long,
        backgroundArgb: Long,
    ): ImageBitmap? = null
}

class DesktopBluetoothA2dpTester(
    private val helperClient: DesktopNativeHelperClient,
) : BluetoothA2dpTester {
    override suspend fun testA2dpForAddress(
        address: String,
        errorBtOff: String,
        errorNotBonded: String,
        errorNoA2dp: String,
        errorNotConnected: String,
    ): BluetoothA2dpTestResult {
        val result = helperClient.testConnection(address)
        return when (result.code) {
            "success", "already_connected", "connected" -> BluetoothA2dpTestResult.Success
            "not_paired" -> BluetoothA2dpTestResult.Error(errorNotBonded)
            "not_audio" -> BluetoothA2dpTestResult.Error(errorNoA2dp)
            "bluetooth_unavailable" -> BluetoothA2dpTestResult.Error(errorBtOff)
            "not_connected" -> BluetoothA2dpTestResult.Error(errorNotConnected)
            else -> BluetoothA2dpTestResult.Error(result.message ?: errorNoA2dp)
        }
    }
}
