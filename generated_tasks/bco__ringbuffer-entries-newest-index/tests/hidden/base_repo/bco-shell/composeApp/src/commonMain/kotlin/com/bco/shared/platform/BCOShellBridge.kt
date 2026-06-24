package com.bco.shared.platform

import com.bco.shared.model.AudioState
import com.bco.shared.model.BcoJson
import com.bco.shared.model.EngineEvent
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.isActive
import kotlinx.serialization.SerializationException
import kotlin.coroutines.coroutineContext
import kotlin.time.Duration.Companion.seconds
import kotlin.time.TimeMark
import kotlin.time.TimeSource

/**
 * Shared shell orchestration between the native Go engine and platform-specific BT/audio adapters.
 *
 * Platforms provide the actual BT/audio integration; this class owns the event loop, state pushing,
 * CONNECT_BT / DISCONNECT_BT dispatch, and manual-connect override detection.
 */
abstract class BCOShellBridge(
    protected val engine: EngineBridge,
) {
    abstract val bluetoothConnectedState: StateFlow<Boolean>
    abstract val audioState: StateFlow<AudioState>

    protected var latestAudioState: AudioState = AudioState.Idle
        private set
    protected var latestBluetoothConnected: Boolean = false
        private set

    private var pendingEngineInitiatedBtConnectMark: TimeMark? = null

    val currentAudioState: AudioState get() = latestAudioState
    val currentBluetoothConnected: Boolean get() = latestBluetoothConnected

    protected abstract suspend fun connectBluetooth()
    protected abstract suspend fun disconnectBluetooth()
    protected abstract fun resolveHeadsetDisplayName(): String?
    protected abstract suspend fun refreshStatus()

    /** Re-query the platform BT stack so [bluetoothConnectedState] reflects reality. */
    protected open fun repollBluetoothState() {}

    protected open fun onPeerListAffectingEvent(event: EngineEvent) {}

    protected open suspend fun handlePlatformEvent(event: EngineEvent) {
        refreshStatus()
    }

    suspend fun runEventLoop() {
        while (coroutineContext.isActive) {
            if (!engine.isReady) {
                delay(EVENT_LOOP_IDLE_MS_WHEN_NO_ENGINE)
                continue
            }
            val payload = engine.waitForEvent(WAIT_FOR_EVENT_TIMEOUT_MS) ?: continue
            handleEnginePayload(payload)
        }
    }

    suspend fun observeAndPushState() {
        var previousBtConnected = latestBluetoothConnected
        combine(audioState, bluetoothConnectedState) { audio, bt -> audio to bt }
            .distinctUntilChanged()
            .collect { (audio, bt) ->
                updateLatestObservedState(audio = audio, hasBT = bt)
                if (bt && !previousBtConnected) {
                    if (!consumePendingEngineInitiatedBtConnect()) {
                        engine.setManualConnectOverride(true)
                    }
                }
                previousBtConnected = bt
                engine.sendStateUpdate(audio.toCoreAudioPriority(), bt, resolveHeadsetDisplayName())
                refreshStatus()
            }
    }

    suspend fun runPeriodicSafetyNetRefresh() {
        while (coroutineContext.isActive) {
            delay(SAFETY_NET_REFRESH_MS)
            if (engine.isReady) {
                repollBluetoothState()
                refreshStatus()
            }
        }
    }

    protected fun sendImmediateStateUpdate(
        audio: AudioState = latestAudioState,
        hasBT: Boolean = latestBluetoothConnected,
    ) {
        updateLatestObservedState(audio = audio, hasBT = hasBT)
        engine.sendStateUpdate(audio.toCoreAudioPriority(), hasBT, resolveHeadsetDisplayName())
    }

    fun pushCurrentStateToEngine() {
        val audio = audioState.value
        val hasBT = bluetoothConnectedState.value
        updateLatestObservedState(audio = audio, hasBT = hasBT)
        engine.sendStateUpdate(
            priority = audio.toCoreAudioPriority(),
            hasBT = hasBT,
            headsetDisplayName = resolveHeadsetDisplayName(),
        )
    }

    protected suspend fun handleEnginePayload(payload: String) {
        val event = try {
            BcoJson.decodeFromString(EngineEvent.serializer(), payload)
        } catch (_: SerializationException) {
            return
        } catch (_: IllegalArgumentException) {
            return
        }

        if (event.type in PEER_LIST_AFFECTING_EVENT_TYPES) {
            onPeerListAffectingEvent(event)
        }

        when (event.type) {
            "STATE_CHANGED", "FORCE_CONNECT_RESULT" -> refreshStatus()
            "CONNECT_BT" -> {
                markPendingEngineInitiatedBtConnect()
                connectBluetooth()
                refreshStatus()
            }
            "DISCONNECT_BT" -> {
                clearPendingEngineInitiatedBtConnect()
                disconnectBluetooth()
                refreshStatus()
            }
            else -> handlePlatformEvent(event)
        }
    }

    fun forceConnect(): Boolean = engine.forceConnect()

    protected fun updateLatestObservedState(
        audio: AudioState = latestAudioState,
        hasBT: Boolean = latestBluetoothConnected,
    ) {
        latestAudioState = audio
        latestBluetoothConnected = hasBT
    }

    private fun markPendingEngineInitiatedBtConnect() {
        pendingEngineInitiatedBtConnectMark = TimeSource.Monotonic.markNow()
    }

    private fun clearPendingEngineInitiatedBtConnect() {
        pendingEngineInitiatedBtConnectMark = null
    }

    private fun consumePendingEngineInitiatedBtConnect(): Boolean {
        val mark = pendingEngineInitiatedBtConnectMark ?: return false
        pendingEngineInitiatedBtConnectMark = null
        return mark.elapsedNow() < ENGINE_INITIATED_BT_CONNECT_GRACE
    }

    private fun AudioState.toCoreAudioPriority(): Int = when (this) {
        AudioState.Idle -> 0
        AudioState.Media -> 100
        AudioState.IncomingCall -> 200
        AudioState.ActiveCall -> 300
    }

    private companion object {
        private val PEER_LIST_AFFECTING_EVENT_TYPES = setOf(
            "PEER_JOINED",
            "PEER_LEFT",
            "PEER_REMOVED",
            "PEER_PAUSED",
            "PEER_RESUMED",
        )

        private const val EVENT_LOOP_IDLE_MS_WHEN_NO_ENGINE = 500L
        private const val WAIT_FOR_EVENT_TIMEOUT_MS = 1_000
        private const val SAFETY_NET_REFRESH_MS = 30_000L
        private val ENGINE_INITIATED_BT_CONNECT_GRACE = 10.seconds
    }
}
