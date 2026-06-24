package com.bco.shared.model

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class HeadsetConfig(
    val addr: String = "",
    val name: String = "",
    val selectedAt: Long = 0L,
)

@Serializable
data class EngineEvent(
    val type: String,
    val peerName: String? = null,
    val peerId: String? = null,
    val reason: String? = null,
    val compareCode: String? = null,
    val fingerprint: String? = null,
    val platform: String? = null,
    val targetBtDevice: String? = null,
    val headset: HeadsetConfig? = null,
)

@Serializable
data class PeerState(
    val deviceId: String,
    val deviceName: String,
    val audioPriority: Int,
    val hasBluetoothConnection: Boolean,
    val platform: String,
    val paused: Boolean,
    val coreVersion: String? = null,
    val targetHeadsetAddr: String? = null,
    val targetHeadsetName: String? = null,
    val headsetSelectedAt: Long = 0L,
)

@Serializable
data class LocalState(
    val deviceId: String,
    val deviceName: String,
    val audioPriority: Int,
    val hasBluetoothConnection: Boolean,
    val paused: Boolean,
    // Go core emits the host's listen addresses as a JSON array (`listenMultiaddrs`);
    // older shells used `multiaddr`, so accept either for back-compat.
    val listenMultiaddrs: List<String> = emptyList(),
    val multiaddr: String? = null,
    val seq: Long = 0L,
    val platform: String? = null,
    val coreVersion: String? = null,
    val targetHeadsetAddr: String? = null,
    val targetHeadsetName: String? = null,
    val headsetSelectedAt: Long = 0L,
    val headsetDisplayName: String? = null,
) {
    /** Preferred dial address for sharing — first listen multiaddr, falling back to legacy field. */
    val preferredMultiaddr: String?
        get() = listenMultiaddrs.firstOrNull { it.isNotBlank() }
            ?: multiaddr?.takeIf { it.isNotBlank() }
}

@Serializable
data class PeerEntry(
    val deviceId: String,
    val deviceName: String,
    val platform: String,
    val audioPriority: Int,
    val hasBluetoothConnection: Boolean,
    val paused: Boolean,
    val connected: Boolean = false,
    val coreVersion: String? = null,
    val targetHeadsetAddr: String? = null,
    val targetHeadsetName: String? = null,
    val headsetSelectedAt: Long = 0L,
)

@Serializable
data class PairingRequest(
    val peerName: String,
    val peerId: String,
    val compareCode: String,
    val fingerprint: String,
    val platform: String? = null,
    val targetBtDevice: String? = null,
)

@Serializable
data class SwitchEvent(
    val timestamp: Long = 0L,
    val fromPeerId: String = "",
    val fromPeerName: String = "",
    val toPeerId: String = "",
    val toPeerName: String = "",
    val trigger: String = "",
)

@Serializable
data class ActivityEventUi(
    val id: String,
    val timestamp: Long,
    val type: String,
    val message: String,
    val peerName: String? = null,
)

@Serializable
enum class ConnectionState {
    Connected,
    Disconnected,
    Connecting,
}

@Serializable
enum class AudioState {
    Idle,
    Media,
    IncomingCall,
    ActiveCall,
}

@Serializable
enum class PeerPlatform {
    Android,
    MacOS,
    Unknown,
}

@Serializable
enum class SubscriptionTier {
    Free,
    Pro,
    Premium,
}

@Serializable
data class SubscriptionPlan(
    val tier: SubscriptionTier,
    val maxPeers: Int,
    val switchHistoryDays: Int,
    val hasPriorityWeight: Boolean,
    val hasPerAppPriority: Boolean,
    val hasCloudSync: Boolean,
)

const val SubscriptionUnlimited: Int = -1

val FreeSubscriptionPlan = SubscriptionPlan(
    tier = SubscriptionTier.Free,
    maxPeers = 2,
    switchHistoryDays = 7,
    hasPriorityWeight = false,
    hasPerAppPriority = false,
    hasCloudSync = false,
)

val ProSubscriptionPlan = SubscriptionPlan(
    tier = SubscriptionTier.Pro,
    maxPeers = 5,
    switchHistoryDays = 30,
    hasPriorityWeight = true,
    hasPerAppPriority = true,
    hasCloudSync = true,
)

val PremiumSubscriptionPlan = SubscriptionPlan(
    tier = SubscriptionTier.Premium,
    maxPeers = SubscriptionUnlimited,
    switchHistoryDays = SubscriptionUnlimited,
    hasPriorityWeight = true,
    hasPerAppPriority = true,
    hasCloudSync = true,
)

val DefaultEffectiveSubscriptionPlan = PremiumSubscriptionPlan

@Serializable
data class PeerUiState(
    val peerId: String,
    val name: String,
    val platform: PeerPlatform,
    val audioState: AudioState,
    val holdsHeadset: Boolean,
    val paused: Boolean,
    val online: Boolean,
    val priorityScore: Int,
    val lastSeen: String? = null,
    val pairedDate: String? = null,
    val coreVersion: String? = null,
    val targetHeadsetName: String? = null,
    val targetHeadsetAddr: String? = null,
)

@Serializable
data class ServiceUiState(
    val serviceRunning: Boolean = false,
    val serviceStartedAt: Long? = null,
    val connectionState: ConnectionState = ConnectionState.Disconnected,
    val headsetName: String? = null,
    val headsetMac: String? = null,
    val audioState: AudioState = AudioState.Idle,
    val currentHolderName: String? = null,
    val currentHolderAudioState: AudioState? = null,
    val localHoldsBluetooth: Boolean = false,
    val paused: Boolean = false,
    val peers: List<PeerUiState> = emptyList(),
    val activityEvents: List<ActivityEventUi> = emptyList(),
    val switchCount24h: Int = 0,
    val avgHoldTimeMinutes: Int = 0,
    val switchBucketCounts: List<Int> = List(12) { 0 },
    val btConnectionTimeToday: Long = 0L,
    val localCoreVersion: String? = null,
    val localHeadsetAddr: String? = null,
)

val BcoJson: Json = Json {
    ignoreUnknownKeys = true
    isLenient = true
}

fun EngineEvent.toPairingRequestOrNull(): PairingRequest? {
    if (type != "PAIRING_REQUEST") return null
    val pn = peerName ?: return null
    val pid = peerId ?: return null
    val code = compareCode ?: return null
    val fp = fingerprint ?: return null
    return PairingRequest(pn, pid, code, fp, platform = platform, targetBtDevice = targetBtDevice)
}
