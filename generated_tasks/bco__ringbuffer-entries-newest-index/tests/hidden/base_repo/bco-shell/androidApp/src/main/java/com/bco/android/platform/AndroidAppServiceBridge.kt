package com.bco.android.platform

import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import com.bco.android.service.BCOService
import com.bco.shared.model.PairingRequest
import com.bco.shared.model.PeerEntry
import com.bco.shared.model.ServiceUiState
import com.bco.shared.platform.AppServiceBridge
import com.bco.shared.platform.BtTestConnectUiFeedback
import com.bco.shared.platform.ConnectPeerOutcome
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow

class AndroidAppServiceBridge(
    private val context: Context,
) : AppServiceBridge {

    override val serviceUiState: StateFlow<ServiceUiState> = BCOService.serviceUiState
    override val discoveredPeers: StateFlow<List<PairingRequest>> = BCOService.discoveredPeers
    override val btTestConnectFeedback: SharedFlow<BtTestConnectUiFeedback> =
        BCOService.btTestConnectFeedback
    override val peerListRefreshEpoch: StateFlow<Int> = BCOService.peerListRefreshEpoch

    override fun getPeerEntriesSnapshot(): List<PeerEntry> = BCOService.getPeerEntriesSnapshot()

    override fun getLocalAddressSnapshot(): String? = BCOService.getLocalAddressSnapshot()

    override fun connectPeerFromUi(addr: String): ConnectPeerOutcome =
        BCOService.connectPeerFromUi(addr)

    override fun getLocalDeviceIdSnapshot(): String? = BCOService.getLocalDeviceIdSnapshot()

    override fun pauseDeviceFromUi(deviceId: String): Boolean =
        BCOService.pauseDeviceFromUi(deviceId)

    override fun resumeDeviceFromUi(deviceId: String): Boolean =
        BCOService.resumeDeviceFromUi(deviceId)

    override fun forceConnectFromUi(): Boolean = BCOService.forceConnectFromUi()

    override fun removePeerFromUi(deviceId: String): Boolean =
        BCOService.removePeerFromUi(deviceId)

    override fun requestDashboardRefresh() = BCOService.requestDashboardRefresh()

    override fun enqueueTestBluetoothConnectFromUi(): Boolean =
        BCOService.enqueueTestBluetoothConnectFromUi()

    override fun requestTestBluetoothConnectFromUi() {
        if (!enqueueTestBluetoothConnectFromUi()) {
            ContextCompat.startForegroundService(
                context,
                Intent(context, BCOService::class.java).apply {
                    putExtra(BCOService.EXTRA_RUN_BT_CONNECT_TEST, true)
                },
            )
        }
    }

    override fun applyCoreLogLevelFromUi(level: Int) = BCOService.applyCoreLogLevelFromUi(level)

    override fun applyBaseBiasFromUi(bias: Int) = BCOService.applyBaseBiasFromUi(bias)

    override fun updateNetworkSettingFromUi(key: String, value: Int) =
        BCOService.updateNetworkSettingFromUi(key, value)

    override fun updateNetworkSettingStringFromUi(key: String, value: String) =
        BCOService.updateNetworkSettingStringFromUi(key, value)

    override fun getNetworkSettingsSnapshot(): String? = BCOService.getNetworkSettingsSnapshot()

    override fun startService() {
        ContextCompat.startForegroundService(
            context,
            Intent(context, BCOService::class.java),
        )
    }

    override fun stopService() {
        context.startService(
            Intent(context, BCOService::class.java).apply {
                action = BCOService.ACTION_STOP
            },
        )
    }

    override fun approvePeer(peerId: String) {
        context.startService(
            Intent(context, BCOService::class.java).apply {
                action = BCOService.ACTION_PAIRING_APPROVE
                putExtra(BCOService.EXTRA_PAIRING_PEER_ID, peerId)
            },
        )
    }

    override fun denyPeer(peerId: String) {
        context.startService(
            Intent(context, BCOService::class.java).apply {
                action = BCOService.ACTION_PAIRING_DENY
                putExtra(BCOService.EXTRA_PAIRING_PEER_ID, peerId)
            },
        )
    }

    override fun bumpPeerListRefreshEpoch() = BCOService.bumpPeerListRefreshEpoch()
}
