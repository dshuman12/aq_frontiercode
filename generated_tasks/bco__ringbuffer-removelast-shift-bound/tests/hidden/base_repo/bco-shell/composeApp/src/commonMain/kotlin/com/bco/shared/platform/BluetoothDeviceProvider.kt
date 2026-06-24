package com.bco.shared.platform

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.runtime.staticCompositionLocalOf
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

enum class BluetoothHeadsetIconKind {
    Headphones,
    PortableSpeaker,
    CarAudio,
}

data class BluetoothDeviceInfo(
    val name: String,
    val address: String,
    val majorClass: Int,
    val isConnected: Boolean = false,
    /** True when the stack reports this bond as Low Energy only (no classic BR/EDR on this address). */
    val isLeOnly: Boolean = false,
    val headsetIconKind: BluetoothHeadsetIconKind = BluetoothHeadsetIconKind.Headphones,
)

interface BluetoothDeviceProvider {
    suspend fun getBondedAudioDevices(): List<BluetoothDeviceInfo>
    /** Local Bluetooth adapter display name, when available (e.g. phone name). */
    suspend fun getAdapterDisplayNameOrNull(): String?
}

@Composable
fun rememberBondedAudioDevices(
    refreshKey: Any? = null,
    provider: BluetoothDeviceProvider = LocalBluetoothDeviceProvider.current,
): List<BluetoothDeviceInfo> {
    val devices by produceState(
        initialValue = emptyList(),
        key1 = provider,
        key2 = refreshKey,
    ) {
        value = withContext(Dispatchers.Default) {
            provider.getBondedAudioDevices()
        }
    }
    return devices
}

@Composable
fun rememberAdapterDisplayNameOrNull(
    refreshKey: Any? = null,
    provider: BluetoothDeviceProvider = LocalBluetoothDeviceProvider.current,
): String? {
    val adapterName by produceState<String?>(
        initialValue = null,
        key1 = provider,
        key2 = refreshKey,
    ) {
        value = withContext(Dispatchers.Default) {
            provider.getAdapterDisplayNameOrNull()
        }
    }
    return adapterName
}

val LocalBluetoothDeviceProvider = staticCompositionLocalOf<BluetoothDeviceProvider> {
    error("No BluetoothDeviceProvider provided")
}
