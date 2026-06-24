package com.bco.android.service

import android.content.Context
import com.bco.android.R
import com.bco.android.core.AudioState as CoreAudioState
import com.bco.android.core.BcoJson
import com.bco.android.core.LocalState
import com.bco.android.core.PeerState
import com.bco.shared.platform.EngineBridge
import kotlinx.serialization.SerializationException
import kotlinx.serialization.builtins.ListSerializer

/** Local audio classification; priorities map per data-model.md (US4 will own detection). */
enum class AudioState {
    IDLE,
    MEDIA,
    INCOMING_CALL,
    ACTIVE_CALL,
}

private fun Int.toAudioState(): AudioState = when (this) {
    100 -> AudioState.MEDIA
    200 -> AudioState.INCOMING_CALL
    300 -> AudioState.ACTIVE_CALL
    else -> AudioState.IDLE
}

/** Priority for [com.bco.android.core.EngineBridge.sendStateUpdate] (data-model.md). */
internal fun AudioState.toCoreAudioPriority(): Int = when (this) {
    AudioState.IDLE -> 0
    AudioState.MEDIA -> 100
    AudioState.INCOMING_CALL -> 200
    AudioState.ACTIVE_CALL -> 300
}

internal fun AudioState.toCore(): CoreAudioState = when (this) {
    AudioState.IDLE -> CoreAudioState.Idle
    AudioState.MEDIA -> CoreAudioState.Media
    AudioState.INCOMING_CALL -> CoreAudioState.IncomingCall
    AudioState.ACTIVE_CALL -> CoreAudioState.ActiveCall
}

/** Maps [LocalState.audioPriority] / [PeerEntry.audioPriority] to dashboard [CoreAudioState]. */
internal fun Int.peerAudioPriorityToCore(): CoreAudioState = when (this) {
    100 -> CoreAudioState.Media
    200 -> CoreAudioState.IncomingCall
    300 -> CoreAudioState.ActiveCall
    else -> CoreAudioState.Idle
}

/**
 * In-memory snapshot for notifications / future UI binding (data-model.md).
 */
data class ServiceStatus(
    val running: Boolean = false,
    val audioState: AudioState = AudioState.IDLE,
    /** Effective local Bluetooth state used by notification/UI; prefers platform observation when available. */
    val btConnected: Boolean = false,
    /** Last Bluetooth state published by, or read back from, the Go core. */
    val coreBtConnected: Boolean = btConnected,
    /** Fresh local platform observation; null when the Android Bluetooth adapter has not reported one. */
    val platformObservedBtConnected: Boolean? = null,
    val peerCount: Int = 0,
    val engineId: Int = 0,
    /** Shown as notification summary when non-null (US5 BT actuator errors). */
    val btActionError: String? = null,
) {
    fun toForegroundTemplate(context: Context): NotificationHelper.ForegroundTemplate {
        val audioLabel = context.getString(
            when (audioState) {
                AudioState.IDLE -> R.string.audio_state_idle
                AudioState.MEDIA -> R.string.audio_state_media
                AudioState.INCOMING_CALL -> R.string.audio_state_incoming
                AudioState.ACTIVE_CALL -> R.string.audio_state_active
            },
        )
        val btLabel = context.getString(
            if (btConnected) R.string.bt_state_connected else R.string.bt_state_disconnected,
        )
        val summary = when {
            !btActionError.isNullOrBlank() -> btActionError
            running -> context.getString(R.string.notification_status_summary_running, peerCount)
            else -> context.getString(R.string.notification_foreground_text_placeholder)
        }
        return NotificationHelper.ForegroundTemplate(
            audioState = audioLabel,
            bluetoothStatus = btLabel,
            peerSummary = peerCount.toString(),
            statusLine = summary,
        )
    }
}

internal fun parsePeerListSize(json: String?): Int {
    if (json.isNullOrBlank()) return 0
    return try {
        BcoJson.decodeFromString(ListSerializer(PeerState.serializer()), json).size
    } catch (_: SerializationException) {
        0
    } catch (_: IllegalArgumentException) {
        0
    }
}

internal fun EngineBridge.snapshotServiceStatus(running: Boolean): ServiceStatus {
    if (!isReady) {
        return ServiceStatus(running = running, engineId = 0)
    }
    val localJson = getLocalState()
    val local = try {
        if (localJson != null) {
            BcoJson.decodeFromString(LocalState.serializer(), localJson)
        } else {
            null
        }
    } catch (_: SerializationException) {
        null
    } catch (_: IllegalArgumentException) {
        null
    }
    val coreBtConnected = local?.hasBluetoothConnection ?: false
    return ServiceStatus(
        running = running,
        audioState = local?.audioPriority?.toAudioState() ?: AudioState.IDLE,
        btConnected = coreBtConnected,
        coreBtConnected = coreBtConnected,
        peerCount = parsePeerListSize(getPeerStates()),
        engineId = engineId,
    )
}
