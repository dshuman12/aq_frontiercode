package com.bco.shared.platform

import com.bco.shared.model.AudioState
import com.bco.shared.model.PairingRequest
import com.bco.shared.model.PeerEntry
import com.bco.shared.model.ServiceUiState
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow

class FakeAppServiceBridge : AppServiceBridge {
    private val _serviceUiState = MutableStateFlow(ServiceUiState())
    override val serviceUiState: StateFlow<ServiceUiState> = _serviceUiState.asStateFlow()

    private val _discoveredPeers = MutableStateFlow<List<PairingRequest>>(emptyList())
    override val discoveredPeers: StateFlow<List<PairingRequest>> = _discoveredPeers.asStateFlow()

    private val _btTestConnectFeedback = MutableSharedFlow<BtTestConnectUiFeedback>(extraBufferCapacity = 4)
    override val btTestConnectFeedback: SharedFlow<BtTestConnectUiFeedback> =
        _btTestConnectFeedback.asSharedFlow()

    private val _peerListRefreshEpoch = MutableStateFlow(0)
    override val peerListRefreshEpoch: StateFlow<Int> = _peerListRefreshEpoch.asStateFlow()

    var peerEntriesSnapshotData: List<PeerEntry> = emptyList()
    var localAddressSnapshotData: String? = null
    var localDeviceIdSnapshotData: String? = null
    var connectPeerOutcome: ConnectPeerOutcome = ConnectPeerOutcome.Success
    var pauseDeviceResult: Boolean = true
    var resumeDeviceResult: Boolean = true
    var forceConnectResult: Boolean = true
    var removePeerResult: Boolean = true
    var enqueueTestBluetoothConnectResult: Boolean = true
    var networkSettingsSnapshotData: String? = null

    val connectedPeerAddresses = mutableListOf<String>()
    val pausedDeviceIds = mutableListOf<String>()
    val resumedDeviceIds = mutableListOf<String>()
    val removedPeerIds = mutableListOf<String>()
    val approvedPeerIds = mutableListOf<String>()
    val deniedPeerIds = mutableListOf<String>()
    val networkIntSettingUpdates = mutableListOf<Pair<String, Int>>()
    val networkStringSettingUpdates = mutableListOf<Pair<String, String>>()

    var dashboardRefreshCalls: Int = 0
        private set
    var requestTestBluetoothConnectCalls: Int = 0
        private set
    var applyCoreLogLevelCalls: List<Int> = emptyList()
        private set
    var applyBaseBiasCalls: List<Int> = emptyList()
        private set
    var startServiceCalls: Int = 0
        private set
    var stopServiceCalls: Int = 0
        private set

    fun updateServiceUiState(state: ServiceUiState) {
        _serviceUiState.value = state
    }

    fun updateDiscoveredPeers(peers: List<PairingRequest>) {
        _discoveredPeers.value = peers
    }

    fun emitTestBluetoothFeedback(feedback: BtTestConnectUiFeedback): Boolean =
        _btTestConnectFeedback.tryEmit(feedback)

    override fun getPeerEntriesSnapshot(): List<PeerEntry> = peerEntriesSnapshotData

    override fun getLocalAddressSnapshot(): String? = localAddressSnapshotData

    override fun connectPeerFromUi(addr: String): ConnectPeerOutcome {
        connectedPeerAddresses += addr
        return connectPeerOutcome
    }

    override fun getLocalDeviceIdSnapshot(): String? = localDeviceIdSnapshotData

    override fun pauseDeviceFromUi(deviceId: String): Boolean {
        pausedDeviceIds += deviceId
        return pauseDeviceResult
    }

    override fun resumeDeviceFromUi(deviceId: String): Boolean {
        resumedDeviceIds += deviceId
        return resumeDeviceResult
    }

    override fun forceConnectFromUi(): Boolean = forceConnectResult

    override fun removePeerFromUi(deviceId: String): Boolean {
        removedPeerIds += deviceId
        return removePeerResult
    }

    override fun requestDashboardRefresh() {
        dashboardRefreshCalls += 1
    }

    override fun enqueueTestBluetoothConnectFromUi(): Boolean = enqueueTestBluetoothConnectResult

    override fun requestTestBluetoothConnectFromUi() {
        requestTestBluetoothConnectCalls += 1
    }

    override fun applyCoreLogLevelFromUi(level: Int) {
        applyCoreLogLevelCalls = applyCoreLogLevelCalls + level
    }

    override fun applyBaseBiasFromUi(bias: Int) {
        applyBaseBiasCalls = applyBaseBiasCalls + bias
    }

    override fun updateNetworkSettingFromUi(key: String, value: Int) {
        networkIntSettingUpdates += key to value
    }

    override fun updateNetworkSettingStringFromUi(key: String, value: String) {
        networkStringSettingUpdates += key to value
    }

    override fun getNetworkSettingsSnapshot(): String? = networkSettingsSnapshotData

    override fun startService() {
        startServiceCalls += 1
    }

    override fun stopService() {
        stopServiceCalls += 1
    }

    override fun approvePeer(peerId: String) {
        approvedPeerIds += peerId
    }

    override fun denyPeer(peerId: String) {
        deniedPeerIds += peerId
    }

    override fun bumpPeerListRefreshEpoch() {
        _peerListRefreshEpoch.value += 1
    }
}

class FakeEngineBridge(
    override var isReady: Boolean = true,
    override var engineId: Int = 1,
) : EngineBridge {
    data class Invocation(val method: String, val args: List<Any?> = emptyList())

    val invocations = mutableListOf<Invocation>()
    private val eventQueue = ArrayDeque<String>()

    var peerStatesJson: String? = null
    var localStateJson: String? = null
    var localMultiaddrResult: String? = null
    var connectPeerResult: Boolean = true
    var removePeerResult: Boolean = true
    var pauseDeviceResult: Boolean = true
    var resumeDeviceResult: Boolean = true
    var forceConnectResult: Boolean = true
    var reportBTProgressResult: Boolean = true
    var lastErrorResult: String? = null
    var switchHistoryJson: String? = null
    var activityFeedJson: String? = null
    var baseBiasValue: Int = 0
    var networkSettingsJson: String? = null

    fun enqueueEvent(payload: String) {
        eventQueue.addLast(payload)
    }

    private fun record(method: String, vararg args: Any?) {
        invocations += Invocation(method, args.toList())
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
        return eventQueue.removeFirstOrNull()
    }

    override fun getPeerStates(): String? {
        record("getPeerStates")
        return peerStatesJson
    }

    override fun getLocalState(): String? {
        record("getLocalState")
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
        return switchHistoryJson
    }

    override fun recordActivity(eventType: String, message: String, peerName: String?) {
        record("recordActivity", eventType, message, peerName)
    }

    override fun getActivityFeed(maxEvents: Int): String? {
        record("getActivityFeed", maxEvents)
        return activityFeedJson
    }

    override fun setBaseBias(bias: Int) {
        record("setBaseBias", bias)
        baseBiasValue = bias
    }

    override fun getBaseBias(): Int {
        record("getBaseBias")
        return baseBiasValue
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
        return networkSettingsJson
    }

    override fun setTargetHeadset(addr: String, name: String, selectedAtMs: Long) {
        record("setTargetHeadset", addr, name, selectedAtMs)
    }

    override fun pushHeadsetToPeers() {
        record("pushHeadsetToPeers")
    }
}

class FakePlatformShellBridge(
    engine: EngineBridge = FakeEngineBridge(),
) : BCOShellBridge(engine) {
    private val _bluetoothConnectedState = MutableStateFlow(false)
    override val bluetoothConnectedState: StateFlow<Boolean> = _bluetoothConnectedState.asStateFlow()

    private val _audioState = MutableStateFlow(AudioState.Idle)
    override val audioState: StateFlow<AudioState> = _audioState.asStateFlow()

    var headsetDisplayName: String? = null
    var connectBluetoothCalls: Int = 0
        private set
    var disconnectBluetoothCalls: Int = 0
        private set
    var refreshStatusCalls: Int = 0
        private set
    var repollBluetoothStateCalls: Int = 0
        private set

    fun setBluetoothConnected(connected: Boolean) {
        _bluetoothConnectedState.value = connected
        updateLatestObservedState(hasBT = connected)
    }

    fun setAudioState(state: AudioState) {
        _audioState.value = state
        updateLatestObservedState(audio = state)
    }

    suspend fun handleEnginePayloadForTest(payload: String) {
        handleEnginePayload(payload)
    }

    override suspend fun connectBluetooth() {
        connectBluetoothCalls += 1
    }

    override suspend fun disconnectBluetooth() {
        disconnectBluetoothCalls += 1
    }

    override fun resolveHeadsetDisplayName(): String? = headsetDisplayName

    override suspend fun refreshStatus() {
        refreshStatusCalls += 1
    }

    override fun repollBluetoothState() {
        repollBluetoothStateCalls += 1
    }
}
