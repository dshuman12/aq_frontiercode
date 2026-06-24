package com.bco.android.fakes

import com.bco.android.bluetooth.BluetoothA2dpActuator
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** JVM-test double for [com.bco.android.bluetooth.BluetoothController]. */
class FakeBluetoothA2dpActuator : BluetoothA2dpActuator {
    private var lastErrorInternal: String? = null
    override val lastErrorMessage: String? get() = lastErrorInternal

    var supportedFlag: Boolean = true
    override val isSupported: Boolean get() = supportedFlag

    private val _btConnectedState = MutableStateFlow(false)
    override val btConnectedState: StateFlow<Boolean> = _btConnectedState.asStateFlow()

    var targetA2dpConnected: Boolean = false
        set(value) {
            field = value
            _btConnectedState.value = value
        }

    override fun requestProfileProxyIfNeeded() {}

    override fun connectTarget(done: (() -> Unit)?) {
        lastErrorInternal = null
        targetA2dpConnected = true
        done?.invoke()
    }

    override fun disconnectTarget(done: (() -> Unit)?) {
        lastErrorInternal = null
        targetA2dpConnected = false
        done?.invoke()
    }

    override fun isTargetA2dpConnected(): Boolean = targetA2dpConnected

    override fun release() {}

    fun setLastError(message: String?) {
        lastErrorInternal = message
    }
}
