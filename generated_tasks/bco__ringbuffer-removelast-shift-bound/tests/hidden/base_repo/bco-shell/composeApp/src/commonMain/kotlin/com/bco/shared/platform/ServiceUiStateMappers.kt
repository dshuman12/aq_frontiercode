package com.bco.shared.platform

import com.bco.shared.model.ActivityEventUi
import com.bco.shared.model.AudioState
import com.bco.shared.model.BcoJson
import com.bco.shared.model.LocalState
import com.bco.shared.model.PeerEntry
import com.bco.shared.model.PeerPlatform
import com.bco.shared.model.PeerUiState
import kotlinx.serialization.SerializationException
import kotlinx.serialization.builtins.ListSerializer

fun parseLocalStateJson(json: String?): LocalState? {
    val raw = json?.trim()?.takeIf { it.isNotEmpty() } ?: return null
    return try {
        BcoJson.decodeFromString(LocalState.serializer(), raw)
    } catch (_: SerializationException) {
        null
    } catch (_: IllegalArgumentException) {
        null
    }
}

fun parsePeerEntriesJson(json: String?): List<PeerEntry> {
    val raw = json?.trim()?.takeIf { it.isNotEmpty() } ?: return emptyList()
    return try {
        BcoJson.decodeFromString(ListSerializer(PeerEntry.serializer()), raw)
    } catch (_: SerializationException) {
        emptyList()
    } catch (_: IllegalArgumentException) {
        emptyList()
    }
}

fun parseActivityFeedJson(json: String?): List<ActivityEventUi> {
    val raw = json?.trim()?.takeIf { it.isNotEmpty() } ?: return emptyList()
    return try {
        BcoJson.decodeFromString(ListSerializer(ActivityEventUi.serializer()), raw)
    } catch (_: SerializationException) {
        emptyList()
    } catch (_: IllegalArgumentException) {
        emptyList()
    }
}

fun Int.toUiAudioState(): AudioState = when (this) {
    100 -> AudioState.Media
    200 -> AudioState.IncomingCall
    300 -> AudioState.ActiveCall
    else -> AudioState.Idle
}

fun String.toPeerPlatformHeuristic(): PeerPlatform {
    val value = lowercase()
    return when {
        "android" in value -> PeerPlatform.Android
        "darwin" in value || "mac" in value || "osx" in value -> PeerPlatform.MacOS
        else -> PeerPlatform.Unknown
    }
}

fun PeerEntry.toPeerUiState(): PeerUiState = PeerUiState(
    peerId = deviceId,
    name = deviceName,
    platform = platform.toPeerPlatformHeuristic(),
    audioState = audioPriority.toUiAudioState(),
    holdsHeadset = hasBluetoothConnection,
    paused = paused,
    online = connected,
    priorityScore = audioPriority,
    coreVersion = coreVersion,
    targetHeadsetName = targetHeadsetName,
    targetHeadsetAddr = targetHeadsetAddr,
)

fun resolveHeadsetHolder(
    local: LocalState?,
    peers: List<PeerEntry>,
    localBtConnected: Boolean,
    localFallbackName: String,
    remoteFallbackName: String,
    currentAudioState: AudioState = AudioState.Idle,
): Pair<String?, AudioState?> {
    if (localBtConnected) {
        val name = local?.deviceName?.trim()?.takeIf { it.isNotEmpty() } ?: localFallbackName
        return name to (local?.audioPriority?.toUiAudioState() ?: currentAudioState)
    }
    val remote = peers.firstOrNull { it.hasBluetoothConnection }
    if (remote != null) {
        val name = remote.deviceName.trim().takeIf { it.isNotEmpty() } ?: remoteFallbackName
        return name to remote.audioPriority.toUiAudioState()
    }
    return null to null
}
