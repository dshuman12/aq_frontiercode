package com.bco.android.bluetooth

import kotlinx.coroutines.flow.StateFlow

/**
 * Surface [BCOService] needs from [BluetoothController] for A2DP target connect/disconnect.
 * Constants live on the interface so fakes and callers share stable tokens without a concrete type.
 */
interface BluetoothA2dpActuator {
    val lastErrorMessage: String?
    val isSupported: Boolean

    /**
     * Emits the current BT connection state of the saved target device.
     * Updated reactively via system broadcasts rather than polling.
     */
    val btConnectedState: StateFlow<Boolean>

    fun requestProfileProxyIfNeeded()
    fun connectTarget(done: (() -> Unit)?)
    fun disconnectTarget(done: (() -> Unit)?)
    fun isTargetA2dpConnected(): Boolean
    fun release()

    companion object {
        const val ERROR_UNSUPPORTED: String = "Bluetooth A2DP connect/disconnect not available via reflection"
        const val ERROR_NO_TARGET: String = "No target Bluetooth device saved"
        const val ERROR_BAD_ADDRESS: String = "Invalid Bluetooth address"
        const val ERROR_NOT_BONDED: String = "Target device is not paired"
        const val ERROR_CORE_REJECTED: String = "Engine rejected BT progress report"
        const val ERROR_BLUETOOTH_OFF: String = "Bluetooth adapter is off"
        const val ERROR_NO_BT_CONNECT_PERMISSION: String = "BLUETOOTH_CONNECT permission denied"
        const val ERROR_CONNECT_RETURNED_FALSE: String = "Bluetooth connect request was rejected"
        const val ERROR_RECONNECT_DISCONNECT_TIMEOUT: String = "Bluetooth did not finish disconnecting before reconnect"
    }
}
