package com.bco.shared.platform

import com.sun.jna.Library
import com.sun.jna.Native
import com.sun.jna.NativeLibrary
import com.sun.jna.Pointer

private interface DesktopLibBCONet : Library {
    fun BCONewEngine(deviceName: String, storagePath: String): Int
    fun BCOSendStateUpdate(engineID: Int, priority: Int, hasBT: Boolean, headsetDisplayName: String?)
    fun BCOReportBTProgress(engineID: Int, status: Int): Int
    fun BCOWaitForEvent(engineID: Int, timeoutMs: Int): Pointer?
    fun BCOGetPeerStates(engineID: Int): Pointer?
    fun BCOGetLocalState(engineID: Int): Pointer?
    fun BCOTriggerNetworkRefresh(engineID: Int)
    fun BCOGetLocalMultiaddr(engineID: Int): Pointer?
    fun BCOConnectPeer(engineID: Int, multiaddr: String): Int
    fun BCOApprovePeer(engineID: Int, peerId: String)
    fun BCODenyPeer(engineID: Int, peerId: String)
    fun BCORemovePeer(engineID: Int, peerId: String): Int
    fun BCOPauseDevice(engineID: Int, deviceId: String): Int
    fun BCOResumeDevice(engineID: Int, deviceId: String): Int
    fun BCOGetLastError(engineID: Int): Pointer?
    fun BCOGetCoreVersion(): Pointer?
    fun BCOSetLogLevel(engineID: Int, level: Int)
    fun BCOFreeString(pointer: Pointer)
    fun BCOGetSwitchHistory(engineID: Int): Pointer?
    fun BCORecordActivity(engineID: Int, eventType: String, message: String, peerName: String?)
    fun BCOGetActivityFeed(engineID: Int, maxEvents: Int): Pointer?
    fun BCOForceConnect(engineID: Int): Int
    fun BCOStop(engineID: Int)
    fun BCOSetBaseBias(engineID: Int, bias: Int)
    fun BCOGetBaseBias(engineID: Int): Int
    fun BCOSetManualConnectOverride(engineID: Int, override: Int)
    fun BCOUpdateNetworkSetting(engineID: Int, key: String, value: Int): Int
    fun BCOUpdateNetworkSettingString(engineID: Int, key: String, value: String): Int
    fun BCOGetNetworkSettings(engineID: Int): Pointer?
    fun BCOSetTargetHeadset(engineID: Int, addr: String?, name: String?, selectedAtMs: Long)
    fun BCOPushHeadsetToPeers(engineID: Int)
}

private object DesktopLibLoader {
    val lib: DesktopLibBCONet by lazy {
        val assets = DesktopNativeAssets.ensureExtracted()
        NativeLibrary.addSearchPath("bconet", assets.nativeLibDir.toString())
        Native.load("bconet", DesktopLibBCONet::class.java)
    }
}

object DesktopCoreMetadata {
    fun getCoreVersionOrNull(): String? = try {
        val p = DesktopLibLoader.lib.BCOGetCoreVersion() ?: return null
        try {
            p.getString(0)
        } finally {
            DesktopLibLoader.lib.BCOFreeString(p)
        }
    } catch (_: Throwable) {
        null
    }
}

internal class DesktopBCONet(
    deviceName: String,
    storagePath: String,
) {
    private val lib = DesktopLibLoader.lib
    private val engineID: Int

    init {
        java.io.File(storagePath).mkdirs()
        engineID = lib.BCONewEngine(deviceName, storagePath)
    }

    val isReady: Boolean get() = engineID > 0

    val engineId: Int get() = if (engineID > 0) engineID else 0

    fun sendStateUpdate(priority: Int, hasBT: Boolean, headsetDisplayName: String? = null) {
        if (engineID <= 0) return
        lib.BCOSendStateUpdate(engineID, priority, hasBT, headsetDisplayName)
    }

    fun reportBTProgress(status: Int): Boolean {
        if (engineID <= 0) return false
        return lib.BCOReportBTProgress(engineID, status) == 0
    }

    fun waitForEvent(timeoutMs: Int): String? {
        if (engineID <= 0) return null
        return takeString(lib.BCOWaitForEvent(engineID, timeoutMs))
    }

    fun getPeerStates(): String? {
        if (engineID <= 0) return null
        return takeString(lib.BCOGetPeerStates(engineID))
    }

    fun getLocalState(): String? {
        if (engineID <= 0) return null
        return takeString(lib.BCOGetLocalState(engineID))
    }

    fun triggerNetworkRefresh() {
        if (engineID <= 0) return
        lib.BCOTriggerNetworkRefresh(engineID)
    }

    fun getLocalMultiaddr(): String? {
        if (engineID <= 0) return null
        return takeString(lib.BCOGetLocalMultiaddr(engineID))
    }

    fun connectPeer(multiaddr: String): Boolean {
        if (engineID <= 0) return false
        return lib.BCOConnectPeer(engineID, multiaddr) == 0
    }

    fun approvePeer(peerId: String) {
        if (engineID <= 0) return
        lib.BCOApprovePeer(engineID, peerId)
    }

    fun denyPeer(peerId: String) {
        if (engineID <= 0) return
        lib.BCODenyPeer(engineID, peerId)
    }

    fun removePeer(peerId: String): Boolean {
        if (engineID <= 0) return false
        return lib.BCORemovePeer(engineID, peerId) == 0
    }

    fun pauseDevice(deviceId: String): Boolean {
        if (engineID <= 0) return false
        return lib.BCOPauseDevice(engineID, deviceId) == 0
    }

    fun resumeDevice(deviceId: String): Boolean {
        if (engineID <= 0) return false
        return lib.BCOResumeDevice(engineID, deviceId) == 0
    }

    fun getLastError(): String? {
        val id = if (engineID > 0) engineID else -1
        return takeString(lib.BCOGetLastError(id))
    }

    fun setLogLevel(level: Int) {
        if (engineID <= 0) return
        lib.BCOSetLogLevel(engineID, level)
    }

    fun stop() {
        if (engineID <= 0) return
        lib.BCOStop(engineID)
    }

    fun getSwitchHistory(): String? {
        if (engineID <= 0) return null
        return takeString(lib.BCOGetSwitchHistory(engineID))
    }

    fun recordActivity(eventType: String, message: String, peerName: String? = null) {
        if (engineID <= 0) return
        lib.BCORecordActivity(engineID, eventType, message, peerName)
    }

    fun getActivityFeed(maxEvents: Int): String? {
        if (engineID <= 0) return null
        return takeString(lib.BCOGetActivityFeed(engineID, maxEvents))
    }

    fun forceConnect(): Boolean {
        if (engineID <= 0) return false
        return lib.BCOForceConnect(engineID) == 0
    }

    fun setBaseBias(bias: Int) {
        if (engineID <= 0) return
        lib.BCOSetBaseBias(engineID, bias)
    }

    fun getBaseBias(): Int {
        if (engineID <= 0) return 0
        return lib.BCOGetBaseBias(engineID)
    }

    fun setManualConnectOverride(override: Boolean) {
        if (engineID <= 0) return
        lib.BCOSetManualConnectOverride(engineID, if (override) 1 else 0)
    }

    fun updateNetworkSetting(key: String, value: Int): Boolean {
        if (engineID <= 0) return false
        return lib.BCOUpdateNetworkSetting(engineID, key, value) == 0
    }

    fun updateNetworkSettingString(key: String, value: String): Boolean {
        if (engineID <= 0) return false
        return lib.BCOUpdateNetworkSettingString(engineID, key, value) == 0
    }

    fun getNetworkSettings(): String? {
        if (engineID <= 0) return null
        return takeString(lib.BCOGetNetworkSettings(engineID))
    }

    fun setTargetHeadset(addr: String, name: String, selectedAtMs: Long) {
        if (engineID <= 0) return
        lib.BCOSetTargetHeadset(engineID, addr, name, selectedAtMs)
    }

    fun pushHeadsetToPeers() {
        if (engineID <= 0) return
        lib.BCOPushHeadsetToPeers(engineID)
    }

    private fun takeString(pointer: Pointer?): String? {
        if (pointer == null) return null
        return try {
            pointer.getString(0)
        } finally {
            lib.BCOFreeString(pointer)
        }
    }
}

internal class RealDesktopEngineBridge(
    private val core: DesktopBCONet,
) : EngineBridge {
    override val isReady: Boolean get() = core.isReady
    override val engineId: Int get() = core.engineId

    override fun sendStateUpdate(priority: Int, hasBT: Boolean, headsetDisplayName: String?) {
        core.sendStateUpdate(priority, hasBT, headsetDisplayName)
    }

    override fun reportBTProgress(status: Int): Boolean = core.reportBTProgress(status)
    override fun waitForEvent(timeoutMs: Int): String? = core.waitForEvent(timeoutMs)
    override fun getPeerStates(): String? = core.getPeerStates()
    override fun getLocalState(): String? = core.getLocalState()
    override fun triggerNetworkRefresh() = core.triggerNetworkRefresh()
    override fun getLocalMultiaddr(): String? = core.getLocalMultiaddr()
    override fun connectPeer(multiaddr: String): Boolean = core.connectPeer(multiaddr)
    override fun approvePeer(peerId: String) = core.approvePeer(peerId)
    override fun denyPeer(peerId: String) = core.denyPeer(peerId)
    override fun removePeer(peerId: String): Boolean = core.removePeer(peerId)
    override fun pauseDevice(deviceId: String): Boolean = core.pauseDevice(deviceId)
    override fun resumeDevice(deviceId: String): Boolean = core.resumeDevice(deviceId)
    override fun forceConnect(): Boolean = core.forceConnect()
    override fun getLastError(): String? = core.getLastError()
    override fun setLogLevel(level: Int) = core.setLogLevel(level)
    override fun stop() = core.stop()
    override fun getSwitchHistory(): String? = core.getSwitchHistory()
    override fun recordActivity(eventType: String, message: String, peerName: String?) =
        core.recordActivity(eventType, message, peerName)
    override fun getActivityFeed(maxEvents: Int): String? = core.getActivityFeed(maxEvents)
    override fun setBaseBias(bias: Int) = core.setBaseBias(bias)
    override fun getBaseBias(): Int = core.getBaseBias()
    override fun setManualConnectOverride(override: Boolean) = core.setManualConnectOverride(override)
    override fun updateNetworkSetting(key: String, value: Int): Boolean = core.updateNetworkSetting(key, value)
    override fun updateNetworkSettingString(key: String, value: String): Boolean =
        core.updateNetworkSettingString(key, value)
    override fun getNetworkSettings(): String? = core.getNetworkSettings()
    override fun setTargetHeadset(addr: String, name: String, selectedAtMs: Long) =
        core.setTargetHeadset(addr, name, selectedAtMs)
    override fun pushHeadsetToPeers() = core.pushHeadsetToPeers()
}
