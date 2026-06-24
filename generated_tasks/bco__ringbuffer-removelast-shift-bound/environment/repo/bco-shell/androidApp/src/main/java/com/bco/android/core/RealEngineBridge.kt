package com.bco.android.core

import com.bco.shared.platform.EngineBridge

/**
 * Production [EngineBridge] that delegates every call to an inner [BCONet].
 */
class RealEngineBridge(
    private val bcoNet: BCONet,
) : EngineBridge {

    override val isReady: Boolean get() = bcoNet.isReady

    override val engineId: Int get() = bcoNet.engineId

    override fun sendStateUpdate(priority: Int, hasBT: Boolean, headsetDisplayName: String?) {
        bcoNet.sendStateUpdate(priority, hasBT, headsetDisplayName)
    }

    override fun reportBTProgress(status: Int): Boolean = bcoNet.reportBTProgress(status)

    override fun waitForEvent(timeoutMs: Int): String? = bcoNet.waitForEvent(timeoutMs)

    override fun getPeerStates(): String? = bcoNet.getPeerStates()

    override fun getLocalState(): String? = bcoNet.getLocalState()

    override fun triggerNetworkRefresh() {
        bcoNet.triggerNetworkRefresh()
    }

    override fun getLocalMultiaddr(): String? = bcoNet.getLocalMultiaddr()

    override fun connectPeer(multiaddr: String): Boolean = bcoNet.connectPeer(multiaddr)

    override fun approvePeer(peerId: String) {
        bcoNet.approvePeer(peerId)
    }

    override fun denyPeer(peerId: String) {
        bcoNet.denyPeer(peerId)
    }

    override fun removePeer(peerId: String): Boolean = bcoNet.removePeer(peerId)

    override fun pauseDevice(deviceId: String): Boolean = bcoNet.pauseDevice(deviceId)

    override fun resumeDevice(deviceId: String): Boolean = bcoNet.resumeDevice(deviceId)

    override fun forceConnect(): Boolean = bcoNet.forceConnect()

    override fun getLastError(): String? = bcoNet.getLastError()

    override fun setLogLevel(level: Int) {
        bcoNet.setLogLevel(level)
    }

    override fun stop() {
        bcoNet.stop()
    }

    override fun getSwitchHistory(): String? = bcoNet.getSwitchHistory()

    override fun recordActivity(eventType: String, message: String, peerName: String?) {
        bcoNet.recordActivity(eventType, message, peerName)
    }

    override fun getActivityFeed(maxEvents: Int): String? = bcoNet.getActivityFeed(maxEvents)

    override fun setBaseBias(bias: Int) { bcoNet.setBaseBias(bias) }
    override fun getBaseBias(): Int = bcoNet.getBaseBias()
    override fun setManualConnectOverride(override: Boolean) { bcoNet.setManualConnectOverride(override) }
    override fun updateNetworkSetting(key: String, value: Int): Boolean = bcoNet.updateNetworkSetting(key, value)
    override fun updateNetworkSettingString(key: String, value: String): Boolean = bcoNet.updateNetworkSettingString(key, value)
    override fun getNetworkSettings(): String? = bcoNet.getNetworkSettings()

    override fun setTargetHeadset(addr: String, name: String, selectedAtMs: Long) {
        bcoNet.setTargetHeadset(addr, name, selectedAtMs)
    }
    override fun pushHeadsetToPeers() { bcoNet.pushHeadsetToPeers() }
}
