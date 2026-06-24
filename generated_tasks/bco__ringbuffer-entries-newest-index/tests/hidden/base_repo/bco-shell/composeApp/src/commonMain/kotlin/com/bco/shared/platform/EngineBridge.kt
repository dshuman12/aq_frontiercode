package com.bco.shared.platform

/**
 * Low-level abstraction over the native Go engine used by both Android and desktop shells.
 *
 * This mirrors the platform-specific native bridge for testability. Keep UI-facing workflows on
 * [AppServiceBridge] or narrower service facades rather than growing this into a screen API.
 */
interface EngineBridge {
    val isReady: Boolean
    val engineId: Int

    fun sendStateUpdate(priority: Int, hasBT: Boolean, headsetDisplayName: String? = null)
    fun reportBTProgress(status: Int): Boolean
    fun waitForEvent(timeoutMs: Int): String?
    fun getPeerStates(): String?
    fun getLocalState(): String?
    fun triggerNetworkRefresh()
    fun getLocalMultiaddr(): String?
    fun connectPeer(multiaddr: String): Boolean
    fun approvePeer(peerId: String)
    fun denyPeer(peerId: String)
    fun removePeer(peerId: String): Boolean
    fun pauseDevice(deviceId: String): Boolean
    fun resumeDevice(deviceId: String): Boolean

    /** Request immediate headset claim; see Go `BCOForceConnect`. */
    fun forceConnect(): Boolean
    fun getLastError(): String?
    fun setLogLevel(level: Int)
    fun stop()

    /** JSON array of switch history; null if unavailable. */
    fun getSwitchHistory(): String?

    /** Record a user-visible activity entry in the core's ring buffer. */
    fun recordActivity(eventType: String, message: String, peerName: String? = null)

    /** JSON array of activity feed events; null if unavailable. */
    fun getActivityFeed(maxEvents: Int): String?

    fun setBaseBias(bias: Int)
    fun getBaseBias(): Int
    fun setManualConnectOverride(override: Boolean)
    fun updateNetworkSetting(key: String, value: Int): Boolean
    fun updateNetworkSettingString(key: String, value: String): Boolean
    fun getNetworkSettings(): String?

    fun setTargetHeadset(addr: String, name: String, selectedAtMs: Long)
    fun pushHeadsetToPeers()
}
