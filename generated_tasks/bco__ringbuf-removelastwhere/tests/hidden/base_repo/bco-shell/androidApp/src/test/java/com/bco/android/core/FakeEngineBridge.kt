package com.bco.android.core

import com.bco.shared.platform.EngineBridge

/**
 * Test double for [EngineBridge]: records calls and returns deterministic values without native code.
 */
class FakeEngineBridge(
    override var isReady: Boolean = true,
    override var engineId: Int = 1,
) : EngineBridge {

    private val lock = Any()

    private val _invocations = mutableListOf<Invocation>()

    /** Snapshot of recorded calls (method name + positional args). */
    val invocations: List<Invocation>
        get() = synchronized(lock) { _invocations.toList() }

    private val waitForEventQueue = ArrayDeque<String>()
    private val peerStatesQueue = ArrayDeque<String>()
    private val localStateQueue = ArrayDeque<String>()

    /** Used when [waitForEventQueue] is empty. */
    var waitForEventJson: String? = null

    /** Used when [peerStatesQueue] is empty. */
    var peerStatesJson: String? = null

    /** Used when [localStateQueue] is empty. */
    var localStateJson: String? = null

    /** Value returned by [getLocalMultiaddr]. */
    var localMultiaddrResult: String? = null

    /** Value returned by [getLastError]. */
    var lastErrorResult: String? = null

    var reportBTProgressResult: Boolean = false
    var connectPeerResult: Boolean = false
    var removePeerResult: Boolean = false
    var pauseDeviceResult: Boolean = false
    var resumeDeviceResult: Boolean = false
    var forceConnectResult: Boolean = true

    data class Invocation(val method: String, val args: List<Any?>)

    private fun record(method: String, vararg args: Any?) {
        synchronized(lock) {
            _invocations.add(Invocation(method, args.toList()))
        }
    }

    fun clearInvocations() {
        synchronized(lock) { _invocations.clear() }
    }

    fun enqueueWaitForEvent(vararg json: String) {
        synchronized(lock) {
            json.forEach { waitForEventQueue.addLast(it) }
        }
    }

    fun enqueuePeerStates(vararg json: String) {
        synchronized(lock) {
            json.forEach { peerStatesQueue.addLast(it) }
        }
    }

    fun enqueueLocalState(vararg json: String) {
        synchronized(lock) {
            json.forEach { localStateQueue.addLast(it) }
        }
    }

    override fun sendStateUpdate(priority: Int, hasBT: Boolean, headsetDisplayName: String?) {
        record("sendStateUpdate", priority, hasBT, headsetDisplayName)
    }

    override fun reportBTProgress(status: Int): Boolean {
        record("reportBTProgress", status)
        return reportBTProgressResult
    }

    override fun waitForEvent(timeoutMs: Int): String? {
        record("waitForEvent", timeoutMs)
        synchronized(lock) {
            if (waitForEventQueue.isNotEmpty()) return waitForEventQueue.removeFirst()
        }
        return waitForEventJson
    }

    override fun getPeerStates(): String? {
        record("getPeerStates")
        synchronized(lock) {
            if (peerStatesQueue.isNotEmpty()) return peerStatesQueue.removeFirst()
        }
        return peerStatesJson
    }

    override fun getLocalState(): String? {
        record("getLocalState")
        synchronized(lock) {
            if (localStateQueue.isNotEmpty()) return localStateQueue.removeFirst()
        }
        return localStateJson
    }

    override fun triggerNetworkRefresh() {
        record("triggerNetworkRefresh")
    }

    override fun getLocalMultiaddr(): String? {
        record("getLocalMultiaddr")
        return localMultiaddrResult
    }

    override fun connectPeer(multiaddr: String): Boolean {
        record("connectPeer", multiaddr)
        return connectPeerResult
    }

    override fun approvePeer(peerId: String) {
        record("approvePeer", peerId)
    }

    override fun denyPeer(peerId: String) {
        record("denyPeer", peerId)
    }

    override fun removePeer(peerId: String): Boolean {
        record("removePeer", peerId)
        return removePeerResult
    }

    override fun pauseDevice(deviceId: String): Boolean {
        record("pauseDevice", deviceId)
        return pauseDeviceResult
    }

    override fun resumeDevice(deviceId: String): Boolean {
        record("resumeDevice", deviceId)
        return resumeDeviceResult
    }

    override fun forceConnect(): Boolean {
        record("forceConnect")
        return forceConnectResult
    }

    override fun getLastError(): String? {
        record("getLastError")
        return lastErrorResult
    }

    override fun setLogLevel(level: Int) {
        record("setLogLevel", level)
    }

    override fun stop() {
        record("stop")
    }

    override fun getSwitchHistory(): String? {
        record("getSwitchHistory")
        return null
    }

    override fun recordActivity(eventType: String, message: String, peerName: String?) {
        record("recordActivity", eventType, message, peerName)
    }

    override fun getActivityFeed(maxEvents: Int): String? {
        record("getActivityFeed", maxEvents)
        return null
    }

    override fun setBaseBias(bias: Int) {
        record("setBaseBias", bias)
    }

    override fun getBaseBias(): Int {
        record("getBaseBias")
        return 0
    }

    override fun setManualConnectOverride(override: Boolean) {
        record("setManualConnectOverride", override)
    }

    override fun updateNetworkSetting(key: String, value: Int): Boolean {
        record("updateNetworkSetting", key, value)
        return true
    }

    override fun updateNetworkSettingString(key: String, value: String): Boolean {
        record("updateNetworkSettingString", key, value)
        return true
    }

    override fun getNetworkSettings(): String? {
        record("getNetworkSettings")
        return null
    }

    override fun setTargetHeadset(addr: String, name: String, selectedAtMs: Long) {
        record("setTargetHeadset", addr, name, selectedAtMs)
    }

    override fun pushHeadsetToPeers() {
        record("pushHeadsetToPeers")
    }
}
