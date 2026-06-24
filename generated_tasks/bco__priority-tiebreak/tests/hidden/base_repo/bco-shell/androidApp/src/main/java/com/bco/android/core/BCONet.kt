package com.bco.android.core

import android.content.Context
import com.sun.jna.Pointer
import java.io.File

/**
 * Thin Kotlin wrapper over [LibBCONet]; all heap strings from the core are freed with [LibBCONet.BCOFreeString].
 */
class BCONet(
    deviceName: String,
    storagePath: String,
) {
    private val lib = LibBCONet.INSTANCE
    private val engineID: Int

    init {
        File(storagePath).mkdirs()
        engineID = lib.BCONewEngine(deviceName, storagePath)
    }

    /** True when [BCONewEngine] returned a positive handle. */
    val isReady: Boolean get() = engineID > 0

    /** Go engine handle for service status snapshots; 0 when not ready. */
    val engineId: Int get() = if (engineID > 0) engineID else 0

    constructor(context: Context, deviceName: String) : this(
        deviceName = deviceName,
        storagePath = File(context.filesDir, "bco").absolutePath + File.separator,
    )

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

    /**
     * Last error for this engine, or engine-creation errors when [engineID] is invalid.
     * Uses [BCOGetLastError] with `-1` when the handle is not ready, per C API contract.
     */
    fun getLastError(): String? {
        val id = if (engineID > 0) engineID else -1
        return takeString(lib.BCOGetLastError(id))
    }

    fun setLogLevel(level: Int) {
        if (engineID > 0) {
            lib.BCOSetLogLevel(engineID, level)
        }
    }

    fun stop() {
        if (engineID > 0) {
            lib.BCOStop(engineID)
        }
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

    private fun takeString(ptr: Pointer?): String? {
        if (ptr == null) return null
        return try {
            ptr.getString(0)
        } finally {
            lib.BCOFreeString(ptr)
        }
    }
}
