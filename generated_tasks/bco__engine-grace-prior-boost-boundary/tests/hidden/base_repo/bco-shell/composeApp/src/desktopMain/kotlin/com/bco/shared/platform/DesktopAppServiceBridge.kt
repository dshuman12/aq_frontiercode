package com.bco.shared.platform

import com.bco.shared.model.AudioState
import com.bco.shared.model.BcoJson
import com.bco.shared.model.ConnectionState
import com.bco.shared.model.EngineEvent
import com.bco.shared.model.PairingRequest
import com.bco.shared.model.PeerEntry
import com.bco.shared.model.ServiceUiState
import com.bco.shared.model.SwitchEvent
import com.bco.shared.model.toPairingRequestOrNull
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.SerializationException
import kotlinx.serialization.builtins.ListSerializer
import java.io.File
import java.net.InetAddress
import java.time.Instant

private const val DESKTOP_ACTIVITY_FEED_MAX_EVENTS = 50
private const val DESKTOP_SWITCH_STATS_WINDOW_MS = 86_400_000L
private const val DESKTOP_SWITCH_BUCKET_MS = 2L * 3_600L * 1_000L

private data class DesktopParsedSwitchHistory24h(
    val count: Int,
    val avgHoldMinutes: Int,
    val bucketCounts: List<Int>,
)

class DesktopAppServiceBridge(
    private val preferences: DesktopPreferencesProvider,
    private val helperClient: DesktopNativeHelperClient,
) : AppServiceBridge, AutoCloseable {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val serviceMutex = Mutex()

    private val _serviceUiState = MutableStateFlow(ServiceUiState())
    override val serviceUiState: StateFlow<ServiceUiState> = _serviceUiState.asStateFlow()

    private val _discoveredPeers = MutableStateFlow<List<PairingRequest>>(emptyList())
    override val discoveredPeers: StateFlow<List<PairingRequest>> = _discoveredPeers.asStateFlow()

    private val _btTestConnectFeedback = MutableSharedFlow<BtTestConnectUiFeedback>(
        replay = 0,
        extraBufferCapacity = 4,
        onBufferOverflow = BufferOverflow.DROP_OLDEST,
    )
    override val btTestConnectFeedback: SharedFlow<BtTestConnectUiFeedback> =
        _btTestConnectFeedback.asSharedFlow()

    private val _peerListRefreshEpoch = MutableStateFlow(0)
    override val peerListRefreshEpoch: StateFlow<Int> = _peerListRefreshEpoch.asStateFlow()

    private val btUptimeTracker = DesktopBtUptimeTracker(preferences)

    @Volatile
    private var engineBridge: EngineBridge? = null

    @Volatile
    private var serviceStartedAtMillis: Long? = null

    @Volatile
    private var shellBridge: DesktopShellBridge? = null

    @Volatile
    private var prevBtConnectedForTracker: Boolean? = null

    @Volatile
    private var eventLoopJob: kotlinx.coroutines.Job? = null

    @Volatile
    private var safetyNetJob: kotlinx.coroutines.Job? = null

    @Volatile
    private var stateSyncJob: kotlinx.coroutines.Job? = null

    private val preferenceListener: (String) -> Unit = { key ->
        scope.launch {
            handlePreferenceChanged(key)
        }
    }

    init {
        preferences.addChangeListener(preferenceListener)
        val helperStarted = helperClient.start()
        if (!helperStarted) {
            System.err.println("[DesktopAppServiceBridge] WARNING: native helper did not start — media detection will be unavailable")
        }

        scope.launch {
            helperClient.setTargetDevice(preferences.targetBTAddress, preferences.targetBTName)
        }
        scope.launch {
            helperClient.audioState.collectLatest { state ->
                handleHelperAudioState(state)
            }
        }
        scope.launch {
            helperClient.networkRefreshEvents.collectLatest {
                engineBridge?.triggerNetworkRefresh()
                refreshStatus()
            }
        }
        if (preferences.autoStart && preferences.onboardingComplete) {
            startService()
        }
    }

    override fun getPeerEntriesSnapshot(): List<PeerEntry> = fetchPeerEntriesForUi()

    override fun getLocalAddressSnapshot(): String? = fetchLocalAddressForUi()

    override fun connectPeerFromUi(addr: String): ConnectPeerOutcome {
        val net = engineBridge ?: return ConnectPeerOutcome.ServiceStopped
        if (!net.isReady) {
            val message = net.getLastError()?.trim()?.takeIf { it.isNotEmpty() }
            return if (message != null) ConnectPeerOutcome.Error(message) else ConnectPeerOutcome.ServiceStopped
        }
        return if (net.connectPeer(addr)) {
            ConnectPeerOutcome.Success
        } else {
            ConnectPeerOutcome.Error(net.getLastError()?.trim().orEmpty().ifBlank { "Could not connect" })
        }
    }

    override fun getLocalDeviceIdSnapshot(): String? = fetchLocalDeviceIdForUi()

    override fun pauseDeviceFromUi(deviceId: String): Boolean {
        val net = engineBridge ?: return false
        val ok = net.isReady && net.pauseDevice(deviceId)
        if (ok && getLocalDeviceIdSnapshot() == deviceId) {
            preferences.localPaused = true
        }
        if (ok) requestDashboardRefresh()
        return ok
    }

    override fun resumeDeviceFromUi(deviceId: String): Boolean {
        val net = engineBridge ?: return false
        val ok = net.isReady && net.resumeDevice(deviceId)
        if (ok && getLocalDeviceIdSnapshot() == deviceId) {
            preferences.localPaused = false
        }
        if (ok) requestDashboardRefresh()
        return ok
    }

    override fun forceConnectFromUi(): Boolean {
        val shell = shellBridge ?: return false
        val net = engineBridge ?: return false
        if (!net.isReady) return false
        val ok = shell.forceConnect()
        if (ok) {
            val headsetName = preferences.targetBTName?.trim()?.takeIf { it.isNotEmpty() } ?: "headset"
            val deviceName = resolveLocalDeviceName()
            net.recordActivity("force_connect", "$headsetName manually connected to $deviceName")
            requestDashboardRefresh()
        }
        return ok
    }

    override fun removePeerFromUi(deviceId: String): Boolean {
        val net = engineBridge ?: return false
        val ok = net.isReady && net.removePeer(deviceId)
        if (ok) requestDashboardRefresh()
        return ok
    }

    override fun requestDashboardRefresh() {
        scope.launch { refreshStatus() }
    }

    override fun enqueueTestBluetoothConnectFromUi(): Boolean {
        val address = preferences.targetBTAddress?.trim()?.takeIf { it.isNotEmpty() } ?: return false
        scope.launch {
            emitTestBluetoothResult(helperClient.testConnection(address))
        }
        return true
    }

    override fun requestTestBluetoothConnectFromUi() {
        if (!enqueueTestBluetoothConnectFromUi()) {
            _btTestConnectFeedback.tryEmit(
                BtTestConnectUiFeedback(
                    message = "Select a headset before running the Bluetooth test.",
                    isSuccess = false,
                ),
            )
        }
    }

    override fun applyCoreLogLevelFromUi(level: Int) {
        engineBridge?.setLogLevel(level)
    }

    override fun applyBaseBiasFromUi(bias: Int) {
        engineBridge?.setBaseBias(bias)
    }

    override fun updateNetworkSettingFromUi(key: String, value: Int) {
        engineBridge?.updateNetworkSetting(key, value)
    }

    override fun updateNetworkSettingStringFromUi(key: String, value: String) {
        engineBridge?.updateNetworkSettingString(key, value)
    }

    override fun getNetworkSettingsSnapshot(): String? = engineBridge?.getNetworkSettings()

    override fun startService() {
        scope.launch {
            startServiceInternal()
        }
    }

    override fun stopService() {
        scope.launch {
            stopServiceInternal()
        }
    }

    override fun approvePeer(peerId: String) {
        engineBridge?.approvePeer(peerId)
        _discoveredPeers.value = _discoveredPeers.value.filter { it.peerId != peerId }
    }

    override fun denyPeer(peerId: String) {
        engineBridge?.denyPeer(peerId)
        _discoveredPeers.value = _discoveredPeers.value.filter { it.peerId != peerId }
    }

    override fun bumpPeerListRefreshEpoch() {
        _peerListRefreshEpoch.value = _peerListRefreshEpoch.value + 1
    }

    override fun close() {
        preferences.removeChangeListener(preferenceListener)
        runBlocking {
            serviceMutex.withLock {
                val eventJob = eventLoopJob
                val safetyJob = safetyNetJob
                val stateJob = stateSyncJob
                eventLoopJob = null
                safetyNetJob = null
                stateSyncJob = null
                eventJob?.cancel()
                safetyJob?.cancel()
                stateJob?.cancel()
                if (prevBtConnectedForTracker == true) {
                    btUptimeTracker.onBluetoothDisconnected()
                }
                prevBtConnectedForTracker = null
                engineBridge?.stop()
                engineBridge = null
                shellBridge = null
                serviceStartedAtMillis = null
                _discoveredPeers.value = emptyList()
                _serviceUiState.value = ServiceUiState()
                helperClient.close()
                scope.cancel()
            }
        }
    }

    private suspend fun startServiceInternal() = serviceMutex.withLock {
        val existing = engineBridge
        if (existing != null && existing.isReady) return

        helperClient.start()
        helperClient.setTargetDevice(preferences.targetBTAddress, preferences.targetBTName)

        val core = DesktopBCONet(
            deviceName = resolveLocalDeviceName(),
            storagePath = DesktopPaths.engineStorageDir.toString() + File.separator,
        )
        val bridge = RealDesktopEngineBridge(core)
        if (!bridge.isReady) {
            engineBridge = bridge
            shellBridge = null
            refreshStatus()
            return
        }

        bridge.setLogLevel(preferences.coreLogLevel)
        bridge.setBaseBias(preferences.baseBias)

        val savedTargetAddr = preferences.targetBTAddress?.trim()?.takeIf { it.isNotEmpty() }
        val savedTargetName = preferences.targetBTName?.trim()?.takeIf { it.isNotEmpty() }
        if (savedTargetAddr != null && savedTargetName != null) {
            bridge.setTargetHeadset(
                savedTargetAddr,
                savedTargetName,
                parseSelectedAtMillis(preferences.lastSelectedAt) ?: System.currentTimeMillis(),
            )
        }

        engineBridge = bridge
        val shell = DesktopShellBridge(
            engine = bridge,
            connectBluetoothTarget = { address -> helperClient.connect(address) },
            disconnectBluetoothTarget = { address -> helperClient.disconnect(address) },
            preferences = preferences,
            refreshStatusBlock = { refreshStatus() },
            onPeerListAffectingEventBlock = { bumpPeerListRefreshEpoch() },
            handlePlatformEventBlock = { event -> handlePlatformShellEvent(event) },
        )
        shell.updateHelperAudioState(helperClient.audioState.value)
        shellBridge = shell
        serviceStartedAtMillis = System.currentTimeMillis()
        _discoveredPeers.value = emptyList()

        restoreLocalPausedState(bridge)
        shell.pushCurrentStateToEngine()
        refreshStatus()

        eventLoopJob?.cancel()
        safetyNetJob?.cancel()
        stateSyncJob?.cancel()
        eventLoopJob = scope.launch { shell.runEventLoop() }
        safetyNetJob = scope.launch { shell.runPeriodicSafetyNetRefresh() }
        stateSyncJob = scope.launch { shell.observeAndPushState() }
    }

    private suspend fun stopServiceInternal() = serviceMutex.withLock {
        eventLoopJob?.cancel()
        eventLoopJob = null
        safetyNetJob?.cancel()
        safetyNetJob = null
        stateSyncJob?.cancel()
        stateSyncJob = null

        if (prevBtConnectedForTracker == true) {
            btUptimeTracker.onBluetoothDisconnected()
        }
        prevBtConnectedForTracker = null

        engineBridge?.stop()
        engineBridge = null
        shellBridge = null
        serviceStartedAtMillis = null
        _discoveredPeers.value = emptyList()
        _serviceUiState.value = ServiceUiState()
    }

    private suspend fun handlePreferenceChanged(key: String) {
        when (key) {
            "bco.targetBTAddress", "bco.targetBTName", "bco.lastSelectedAt" -> {
                helperClient.setTargetDevice(preferences.targetBTAddress, preferences.targetBTName)
                val net = engineBridge
                val shell = shellBridge
                val addr = preferences.targetBTAddress?.trim()?.takeIf { it.isNotEmpty() }
                val name = preferences.targetBTName?.trim()?.takeIf { it.isNotEmpty() }
                if (net != null && net.isReady && addr != null && name != null) {
                    net.setTargetHeadset(
                        addr = addr,
                        name = name,
                        selectedAtMs = parseSelectedAtMillis(preferences.lastSelectedAt) ?: System.currentTimeMillis(),
                    )
                    net.pushHeadsetToPeers()
                }
                shell?.pushCurrentStateToEngine()
                refreshStatus()
            }

            "bco.coreLogLevel" -> engineBridge?.setLogLevel(preferences.coreLogLevel)
            "bco.baseBias" -> engineBridge?.setBaseBias(preferences.baseBias)
        }
    }

    private suspend fun handleHelperAudioState(state: HelperAudioState) {
        shellBridge?.updateHelperAudioState(state)
        syncBtUptimeTracker(state.hasBluetooth)
        refreshStatus()
    }

    private fun syncBtUptimeTracker(connected: Boolean) {
        when {
            prevBtConnectedForTracker == null -> {
                prevBtConnectedForTracker = connected
                if (connected) btUptimeTracker.onBluetoothConnected()
            }

            prevBtConnectedForTracker != connected -> {
                if (connected) {
                    btUptimeTracker.onBluetoothConnected()
                } else {
                    btUptimeTracker.onBluetoothDisconnected()
                }
                prevBtConnectedForTracker = connected
            }
        }
    }

    private fun restoreLocalPausedState(net: EngineBridge) {
        if (!preferences.localPaused) return
        val localId = fetchLocalDeviceIdForUi(net) ?: return
        if (net.pauseDevice(localId)) {
            preferences.localPaused = true
        }
    }

    private fun resolveLocalDeviceName(): String {
        val adapterName = runCatching {
            kotlinx.coroutines.runBlocking(Dispatchers.IO) {
                helperClient.getAdapterDisplayNameOrNull()
            }
        }.getOrNull()?.trim()?.takeIf { it.isNotEmpty() }
        if (adapterName != null) return adapterName

        return runCatching {
            InetAddress.getLocalHost().hostName
        }.getOrNull()?.trim()?.takeIf { it.isNotEmpty() }
            ?: System.getProperty("user.name")
            ?: "Mac"
    }

    private fun parseSelectedAtMillis(raw: String?): Long? {
        val text = raw?.trim()?.takeIf { it.isNotEmpty() } ?: return null
        return runCatching { Instant.parse(text).toEpochMilli() }.getOrNull()
    }

    private suspend fun handlePlatformShellEvent(event: EngineEvent) {
        when (event.type) {
            "PAIRING_REQUEST" -> {
                val request = event.toPairingRequestOrNull() ?: return
                val alreadyApproved = _serviceUiState.value.peers.any { it.peerId == request.peerId }
                if (alreadyApproved) {
                    engineBridge?.approvePeer(request.peerId)
                } else if (_discoveredPeers.value.none { it.peerId == request.peerId }) {
                    _discoveredPeers.value = _discoveredPeers.value + request
                }
            }

            "PAIRING_WITHDRAWN" -> {
                val id = event.peerId?.trim()?.takeIf { it.isNotEmpty() } ?: return
                _discoveredPeers.value = _discoveredPeers.value.filter { it.peerId != id }
            }

            "PEER_JOINED", "PEER_LEFT", "PEER_PAUSED", "PEER_RESUMED", "PEER_REMOVED", "HEADSET_UPDATE_RECEIVED" -> {
                refreshStatus()
            }
            "HEADSET_AUTO_SYNC" -> {
                val headset = event.headset ?: return
                if (headset.addr.isBlank()) return
                preferences.targetBTAddress = headset.addr
                if (headset.name.isNotBlank()) {
                    preferences.targetBTName = headset.name
                }
                preferences.lastSelectedAt = Instant.ofEpochMilli(headset.selectedAt).toString()
                engineBridge?.setTargetHeadset(headset.addr, headset.name, headset.selectedAt)
                engineBridge?.recordActivity(
                    eventType = "headset_sync",
                    message = "Headset auto-updated to ${headset.name} (synced from ${event.peerName ?: "Peer"})",
                    peerName = event.peerName,
                )
                shellBridge?.pushCurrentStateToEngine()
                refreshStatus()
            }
        }
    }

    private suspend fun refreshStatus() {
        val net = engineBridge
        if (net == null) {
            _serviceUiState.value = ServiceUiState()
            return
        }
        if (!net.isReady) {
            _serviceUiState.value = ServiceUiState(
                serviceRunning = false,
                connectionState = ConnectionState.Connecting,
            )
            return
        }
        _serviceUiState.value = buildServiceUiState(net)
    }

    private fun buildServiceUiState(net: EngineBridge): ServiceUiState {
        val now = System.currentTimeMillis()
        val local = parseLocalStateJson(net.getLocalState())
        val peers = fetchPeerEntriesForUi(net)
        val shell = shellBridge
        val currentAudioState = shell?.currentAudioState ?: AudioState.Idle
        val localBtConnected = shell?.currentBluetoothConnected ?: (local?.hasBluetoothConnection == true)
        val holder = resolveHeadsetHolder(
            local = local,
            peers = peers,
            localBtConnected = localBtConnected,
            localFallbackName = "This Mac",
            remoteFallbackName = "Peer",
            currentAudioState = currentAudioState,
        )
        val switchHistory = parseSwitchHistoryWindow(net, now)
        val activityEvents = parseActivityFeedJson(net.getActivityFeed(DESKTOP_ACTIVITY_FEED_MAX_EVENTS))
        val connectionState = when {
            !net.isReady -> ConnectionState.Connecting
            peers.isEmpty() || peers.any { it.connected } -> ConnectionState.Connected
            else -> ConnectionState.Disconnected
        }
        return ServiceUiState(
            serviceRunning = true,
            serviceStartedAt = serviceStartedAtMillis,
            connectionState = connectionState,
            headsetName = preferences.targetBTName?.trim()?.takeIf { it.isNotEmpty() },
            headsetMac = preferences.targetBTAddress?.trim()?.takeIf { it.isNotEmpty() },
            audioState = currentAudioState,
            currentHolderName = holder.first,
            currentHolderAudioState = holder.second,
            localHoldsBluetooth = localBtConnected,
            paused = local?.paused == true,
            peers = peers.map { it.toPeerUiState() },
            activityEvents = activityEvents,
            switchCount24h = switchHistory.count,
            avgHoldTimeMinutes = switchHistory.avgHoldMinutes,
            switchBucketCounts = switchHistory.bucketCounts,
            btConnectionTimeToday = btUptimeTracker.connectionMsToday(now),
            localCoreVersion = DesktopCoreMetadata.getCoreVersionOrNull(),
            localHeadsetAddr = preferences.targetBTAddress?.trim()?.takeIf { it.isNotEmpty() },
        )
    }

    private fun fetchPeerEntriesForUi(net: EngineBridge? = engineBridge): List<PeerEntry> {
        val activeNet = net ?: return emptyList()
        if (!activeNet.isReady) return emptyList()
        return parsePeerEntriesJson(activeNet.getPeerStates())
    }

    private fun fetchLocalAddressForUi(): String? {
        val net = engineBridge ?: return null
        if (!net.isReady) return null
        net.getLocalMultiaddr()?.trim()?.takeIf { it.isNotEmpty() }?.let { return it }
        val local = parseLocalStateJson(net.getLocalState()) ?: return null
        return local.preferredMultiaddr
    }

    private fun fetchLocalDeviceIdForUi(net: EngineBridge? = engineBridge): String? {
        val activeNet = net ?: return null
        val local = parseLocalStateJson(activeNet.getLocalState()) ?: return null
        return local.deviceId.trim().takeIf { it.isNotEmpty() }
    }

    private fun parseSwitchHistoryWindow(net: EngineBridge, nowMillis: Long): DesktopParsedSwitchHistory24h {
        val zeros = List(12) { 0 }
        if (!net.isReady) return DesktopParsedSwitchHistory24h(0, 0, zeros)
        val raw = net.getSwitchHistory()?.trim()?.takeIf { it.isNotEmpty() }
            ?: return DesktopParsedSwitchHistory24h(0, 0, zeros)
        val events = try {
            BcoJson.decodeFromString(ListSerializer(SwitchEvent.serializer()), raw)
        } catch (_: SerializationException) {
            return DesktopParsedSwitchHistory24h(0, 0, zeros)
        } catch (_: IllegalArgumentException) {
            return DesktopParsedSwitchHistory24h(0, 0, zeros)
        }

        val cutoff = nowMillis - DESKTOP_SWITCH_STATS_WINDOW_MS
        val windowed = events.filter { it.timestamp >= cutoff }.sortedBy { it.timestamp }
        val buckets = IntArray(12)
        for (event in windowed) {
            val ageMs = (nowMillis - event.timestamp).coerceAtLeast(0L)
            val coarse = (ageMs / DESKTOP_SWITCH_BUCKET_MS).toInt().coerceIn(0, 11)
            val bucketIndex = 11 - coarse
            buckets[bucketIndex]++
        }

        if (windowed.size < 2) {
            return DesktopParsedSwitchHistory24h(windowed.size, 0, buckets.toList())
        }

        var sumDelta = 0L
        var intervals = 0
        for (index in 0 until windowed.lastIndex) {
            val delta = windowed[index + 1].timestamp - windowed[index].timestamp
            if (delta >= 0L) {
                sumDelta += delta
                intervals++
            }
        }
        if (intervals == 0) {
            return DesktopParsedSwitchHistory24h(windowed.size, 0, buckets.toList())
        }
        val avgMinutes = (sumDelta / intervals / 60_000L).toInt().coerceAtLeast(0)
        return DesktopParsedSwitchHistory24h(windowed.size, avgMinutes, buckets.toList())
    }

    private fun emitTestBluetoothResult(result: HelperOperationResult) {
        val (message, isSuccess) = when (result.code) {
            "success", "already_connected", "connected" ->
                "Test connect succeeded. The headset is available on this Mac." to true

            "not_paired" ->
                (result.message ?: "The selected headset is not paired with this Mac.") to false

            "not_audio" ->
                (result.message ?: "The selected device is not an audio headset.") to false

            "bluetooth_unavailable" ->
                (result.message ?: "Bluetooth is unavailable. Turn it on and try again.") to false

            else ->
                (result.message ?: "Test connect failed.") to false
        }
        _btTestConnectFeedback.tryEmit(BtTestConnectUiFeedback(message, isSuccess))
    }
}

