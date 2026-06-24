package com.bco.shared.platform

import androidx.compose.runtime.staticCompositionLocalOf
import com.bco.shared.model.PairingRequest
import com.bco.shared.model.PeerEntry
import com.bco.shared.model.ServiceUiState
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow

data class BtTestConnectUiFeedback(val message: String, val isSuccess: Boolean)

sealed class ConnectPeerOutcome {
    data object Success : ConnectPeerOutcome()
    data object ServiceStopped : ConnectPeerOutcome()
    data class Error(val message: String) : ConnectPeerOutcome()
}

/**
 * Shared UI-facing service facade for Android and desktop Compose UI.
 *
 * UI depends on these immutable flows and user-action methods. Implementations may talk to
 * [BCOShellBridge], platform adapters, or [EngineBridge], but those lower-level details stay behind
 * this facade so screens do not depend on the Go/C bridge surface.
 */
interface DashboardAppService {
    val serviceUiState: StateFlow<ServiceUiState>
    val peerListRefreshEpoch: StateFlow<Int>

    fun getPeerEntriesSnapshot(): List<PeerEntry>
    fun getLocalAddressSnapshot(): String?
    fun getLocalDeviceIdSnapshot(): String?
    fun forceConnectFromUi(): Boolean
    fun requestDashboardRefresh()
    fun bumpPeerListRefreshEpoch()
}

interface PairingAppService {
    val discoveredPeers: StateFlow<List<PairingRequest>>

    fun approvePeer(peerId: String)
    fun denyPeer(peerId: String)
}

interface PeerManagementAppService {
    fun connectPeerFromUi(addr: String): ConnectPeerOutcome
    fun pauseDeviceFromUi(deviceId: String): Boolean
    fun resumeDeviceFromUi(deviceId: String): Boolean
    fun removePeerFromUi(deviceId: String): Boolean
}

interface HeadsetAppService {
    val btTestConnectFeedback: SharedFlow<BtTestConnectUiFeedback>

    fun enqueueTestBluetoothConnectFromUi(): Boolean

    /** Enqueues the test if the service is running; otherwise asks the platform to start and run it. */
    fun requestTestBluetoothConnectFromUi()
}

interface SettingsAppService {
    fun applyCoreLogLevelFromUi(level: Int)
    fun applyBaseBiasFromUi(bias: Int)
    fun updateNetworkSettingFromUi(key: String, value: Int)
    fun updateNetworkSettingStringFromUi(key: String, value: String)
    fun getNetworkSettingsSnapshot(): String?
}

interface ServiceLifecycleAppService {
    fun startService()
    fun stopService()
}

interface AppServiceBridge :
    DashboardAppService,
    PairingAppService,
    PeerManagementAppService,
    HeadsetAppService,
    SettingsAppService,
    ServiceLifecycleAppService

val LocalAppServiceBridge = staticCompositionLocalOf<AppServiceBridge> {
    error("No AppServiceBridge provided")
}
