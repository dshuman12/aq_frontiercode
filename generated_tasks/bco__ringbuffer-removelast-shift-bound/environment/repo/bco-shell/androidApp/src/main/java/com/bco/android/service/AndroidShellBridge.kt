package com.bco.android.service

import com.bco.android.audio.AudioPlaybackMonitor
import com.bco.android.audio.CallAudioMonitor
import com.bco.android.bluetooth.BluetoothA2dpActuator
import com.bco.android.core.EngineEvent
import com.bco.android.logging.BCOLogger
import com.bco.shared.model.AudioState as ShellAudioState
import com.bco.shared.platform.BCOShellBridge
import com.bco.shared.platform.EngineBridge
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlin.coroutines.resume

internal class AndroidShellBridge(
    engine: EngineBridge,
    scope: CoroutineScope,
    private val bluetoothController: BluetoothA2dpActuator,
    private val audioMonitor: AudioPlaybackMonitor,
    private val callDetector: CallAudioMonitor,
    private val resolveHeadsetDisplayNameBlock: () -> String?,
    private val refreshStatusBlock: suspend () -> Unit,
    private val onPeerListAffectingEventBlock: (EngineEvent) -> Unit,
    private val handlePlatformEventBlock: suspend (EngineEvent) -> Unit,
    private val onBtActionErrorChanged: (String?) -> Unit,
    private val mapBtError: (String?) -> String?,
) : BCOShellBridge(engine) {
    override val bluetoothConnectedState: StateFlow<Boolean> = bluetoothController.btConnectedState

    override val audioState: StateFlow<ShellAudioState> = combine(
        audioMonitor.playbackState,
        callDetector.callAudioState,
    ) { playback, call ->
        mergeCallAndPlayback(playback, call).toShellAudioState()
    }.stateIn(
        scope = scope,
        started = SharingStarted.Eagerly,
        initialValue = ShellAudioState.Idle,
    )

    override suspend fun connectBluetooth() {
        BCOLogger.i(
            "Handover",
            "Core chose this phone to hold the headset — running A2DP connect for the saved device",
        )
        withContext(Dispatchers.Main) {
            bluetoothController.requestProfileProxyIfNeeded()
            suspendCancellableCoroutine { cont ->
                bluetoothController.connectTarget {
                    val rawErr = bluetoothController.lastErrorMessage?.takeIf { it.isNotBlank() }
                    onBtActionErrorChanged(mapBtError(rawErr))
                    if (rawErr != null) {
                        BCOLogger.e("Service", "BT connect (CONNECT_BT) failed: $rawErr")
                    }
                    sendImmediateStateUpdate(hasBT = bluetoothController.isTargetA2dpConnected())
                    cont.resume(Unit)
                }
            }
        }
    }

    override suspend fun disconnectBluetooth() {
        BCOLogger.i(
            "Handover",
            "Core chose to release the headset from this phone — running A2DP disconnect",
        )
        withContext(Dispatchers.Main) {
            bluetoothController.requestProfileProxyIfNeeded()
            suspendCancellableCoroutine { cont ->
                bluetoothController.disconnectTarget {
                    val rawErr = bluetoothController.lastErrorMessage?.takeIf { it.isNotBlank() }
                    onBtActionErrorChanged(mapBtError(rawErr))
                    if (rawErr != null) {
                        BCOLogger.e("Service", "DISCONNECT_BT failed: $rawErr")
                    }
                    sendImmediateStateUpdate(hasBT = bluetoothController.isTargetA2dpConnected())
                    cont.resume(Unit)
                }
            }
        }
    }

    override fun repollBluetoothState() {
        bluetoothController.isTargetA2dpConnected()
    }

    override fun resolveHeadsetDisplayName(): String? = resolveHeadsetDisplayNameBlock()

    override suspend fun refreshStatus() = refreshStatusBlock()

    override fun onPeerListAffectingEvent(event: EngineEvent) {
        onPeerListAffectingEventBlock(event)
    }

    override suspend fun handlePlatformEvent(event: EngineEvent) {
        handlePlatformEventBlock(event)
    }

    companion object {
        fun AudioState.toShellAudioState(): ShellAudioState = when (this) {
            AudioState.IDLE -> ShellAudioState.Idle
            AudioState.MEDIA -> ShellAudioState.Media
            AudioState.INCOMING_CALL -> ShellAudioState.IncomingCall
            AudioState.ACTIVE_CALL -> ShellAudioState.ActiveCall
        }

        fun ShellAudioState.toServiceAudioState(): AudioState = when (this) {
            ShellAudioState.Idle -> AudioState.IDLE
            ShellAudioState.Media -> AudioState.MEDIA
            ShellAudioState.IncomingCall -> AudioState.INCOMING_CALL
            ShellAudioState.ActiveCall -> AudioState.ACTIVE_CALL
        }

        fun mergeCallAndPlayback(playback: AudioState, call: AudioState): AudioState =
            when {
                call == AudioState.INCOMING_CALL -> AudioState.INCOMING_CALL
                call == AudioState.ACTIVE_CALL -> AudioState.ACTIVE_CALL
                playback == AudioState.MEDIA -> AudioState.MEDIA
                else -> AudioState.IDLE
            }
    }
}
