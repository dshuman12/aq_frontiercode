package com.bco.android.core

import com.sun.jna.Library
import com.sun.jna.Native
import com.sun.jna.Pointer

/**
 * JNA mapping for [specs/002-android-app-shell/contracts/c-api-surface.md].
 * Every `char*` return is [Pointer?]; callers must [BCOFreeString] after [Pointer.getString].
 */
interface LibBCONet : Library {
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
    fun BCOFreeString(p: Pointer)
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

    companion object {
        val INSTANCE: LibBCONet by lazy {
            Native.load("bconet", LibBCONet::class.java)
        }
    }
}
