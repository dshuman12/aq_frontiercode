package com.bco.shared.platform

import com.bco.shared.model.AudioState
import com.bco.shared.model.EngineEvent
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

internal class DesktopShellBridge(
    engine: EngineBridge,
    private val connectBluetoothTarget: suspend (String) -> HelperOperationResult,
    private val disconnectBluetoothTarget: suspend (String) -> HelperOperationResult,
    private val preferences: DesktopPreferencesProvider,
    private val refreshStatusBlock: suspend () -> Unit,
    private val onPeerListAffectingEventBlock: (EngineEvent) -> Unit,
    private val handlePlatformEventBlock: suspend (EngineEvent) -> Unit,
) : BCOShellBridge(engine) {
    private val _audioState = MutableStateFlow(AudioState.Idle)
    override val audioState: StateFlow<AudioState> = _audioState.asStateFlow()

    private val _bluetoothConnectedState = MutableStateFlow(false)
    override val bluetoothConnectedState: StateFlow<Boolean> = _bluetoothConnectedState.asStateFlow()

    fun updateHelperAudioState(state: HelperAudioState) {
        val audio = state.priority.toShellAudioState()
        _audioState.value = audio
        _bluetoothConnectedState.value = state.hasBluetooth
        updateLatestObservedState(audio = audio, hasBT = state.hasBluetooth)
    }

    public override suspend fun connectBluetooth() {
        val address = preferences.targetBTAddress?.trim()?.takeIf { it.isNotEmpty() } ?: run {
            engine.reportBTProgress(3)
            sendImmediateStateUpdate()
            refreshStatus()
            return
        }
        if (!engine.reportBTProgress(1)) {
            refreshStatus()
            return
        }
        val result = connectBluetoothTarget(address)
        if (result.code == "success" || result.code == "already_connected") {
            engine.reportBTProgress(2)
        } else {
            engine.reportBTProgress(3)
        }
    }

    public override suspend fun disconnectBluetooth() {
        val address = preferences.targetBTAddress?.trim()?.takeIf { it.isNotEmpty() } ?: run {
            sendImmediateStateUpdate()
            refreshStatus()
            return
        }
        disconnectBluetoothTarget(address)
    }

    override fun resolveHeadsetDisplayName(): String? =
        preferences.targetBTName?.trim()?.takeIf { it.isNotEmpty() }

    override suspend fun refreshStatus() = refreshStatusBlock()

    override fun onPeerListAffectingEvent(event: EngineEvent) {
        onPeerListAffectingEventBlock(event)
    }

    override suspend fun handlePlatformEvent(event: EngineEvent) {
        handlePlatformEventBlock(event)
    }

    private fun Int.toShellAudioState(): AudioState = when (this) {
        100 -> AudioState.Media
        200 -> AudioState.IncomingCall
        300 -> AudioState.ActiveCall
        else -> AudioState.Idle
    }
}
