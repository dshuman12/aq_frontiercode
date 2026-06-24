package com.bco.android.service

import android.Manifest
import android.annotation.SuppressLint
import android.app.Service
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.bco.android.R
import com.bco.android.audio.AudioMonitor
import com.bco.android.audio.AudioPlaybackMonitor
import com.bco.android.audio.CallAudioMonitor
import com.bco.android.audio.CallDetector
import com.bco.android.bluetooth.BluetoothA2dpActuator
import com.bco.android.bluetooth.BluetoothController
import com.bco.android.bluetooth.MacAddress
import com.bco.android.core.BCONet
import com.bco.android.core.BcoCoreMetadata
import com.bco.android.core.BcoJson
import com.bco.android.core.ConnectionState as CoreConnectionState
import com.bco.android.core.RealEngineBridge
import com.bco.android.core.EngineEvent
import com.bco.android.core.LocalState
import com.bco.android.core.PeerEntry
import com.bco.android.core.PairingRequest
import com.bco.android.core.ServiceUiState
import com.bco.android.core.SwitchEvent
import com.bco.android.core.toPairingRequestOrNull
import com.bco.android.logging.BCOLogger
import com.bco.android.network.MulticastLockManager
import com.bco.android.network.NetworkChangeListener
import com.bco.android.network.NetworkMonitor
import com.bco.android.network.NetworkSnapshot
import com.bco.android.prefs.DevicePreferences
import com.bco.shared.model.AudioState as ShellAudioState
import com.bco.shared.platform.ConnectPeerOutcome
import com.bco.shared.platform.EngineBridge
import com.bco.shared.platform.parseActivityFeedJson
import com.bco.shared.platform.parseLocalStateJson
import com.bco.shared.platform.parsePeerEntriesJson
import com.bco.shared.platform.resolveHeadsetHolder
import com.bco.shared.platform.toPeerUiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerializationException
import kotlinx.serialization.builtins.ListSerializer
import kotlin.coroutines.resume
import java.io.File
import java.time.Instant

private const val ACTIVITY_FEED_MAX_EVENTS = 50
private const val SWITCH_STATS_WINDOW_MS = 86_400_000L
private const val SWITCH_BUCKET_MS = 2L * 3_600L * 1_000L
private const val STARTUP_BT_RESYNC_DELAY_MS = 2_000L

private data class ParsedSwitchHistory24h(
    val count: Int,
    val avgHoldMinutes: Int,
    val bucketCounts: List<Int>,
)

/** Settings “Test Bluetooth connect” outcome for in-app UI (e.g. Snackbar). */
typealias BtTestConnectUiFeedback = com.bco.shared.platform.BtTestConnectUiFeedback

/**
 * Foreground service shell for BCO networking (US3); full event dispatch lands in US5–US7.
 */
class BCOService : Service() {

    private val remotePeerActivityEventTypes = setOf(
        "STATE_CHANGED",
        "PEER_JOINED",
        "PEER_LEFT",
        "PEER_REMOVED",
        "PEER_PAUSED",
        "PEER_RESUMED",
    )

    private val serviceJob = SupervisorJob()
    private val serviceScope = CoroutineScope(serviceJob + Dispatchers.IO)

    @Volatile
    private var engineBridge: EngineBridge? = null

    @Volatile
    private var serviceStatus: ServiceStatus = ServiceStatus()

    @Volatile
    private var pendingBtError: String? = null

    private var btController: BluetoothA2dpActuator? = null
    private var shellBridge: AndroidShellBridge? = null

    /** Last logged activity signature per remote [PeerEntry.deviceId] (audio / BT / pause / connected). */
    private val remotePeerFingerprints = mutableMapOf<String, String>()

    private lateinit var audioMonitor: AudioPlaybackMonitor
    private lateinit var callDetector: CallAudioMonitor

    private lateinit var multicastLockManager: MulticastLockManager
    private lateinit var networkMonitor: NetworkMonitor

    @Volatile
    private var lastNetworkSnapshot: NetworkSnapshot = NetworkSnapshot(false, false)

    private var multicastHeldForDiscovery: Boolean = false

    private lateinit var devicePreferences: DevicePreferences
    private lateinit var btUptimeTracker: BtUptimeTracker
    private var serviceStartedAtMillis: Long? = null

    private var targetDevicePrefsRegistered: Boolean = false
    @Volatile
    private var suppressTargetDevicePrefsListener: Boolean = false

    private val targetDevicePrefsListener =
        SharedPreferences.OnSharedPreferenceChangeListener { _, key ->
            if (suppressTargetDevicePrefsListener) return@OnSharedPreferenceChangeListener
            if (key != DevicePreferences.KEY_TARGET_BT_NAME &&
                key != DevicePreferences.KEY_TARGET_BT_ADDRESS &&
                key != DevicePreferences.KEY_LAST_SELECTED_AT
            ) {
                return@OnSharedPreferenceChangeListener
            }
            serviceScope.launch {
                applyPersistedTargetHeadsetSideEffects(pushToPeers = true)
            }
        }

    /** Last A2DP target connection, for [BtUptimeTracker]; null until first [refreshStatusAndNotify]. */
    private var prevBtConnectedForTracker: Boolean? = null

    private var userPresentReceiverRegistered: Boolean = false
    private val userPresentReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (Intent.ACTION_USER_PRESENT != intent?.action) return
            lastNetworkSnapshot = readDefaultNetworkSnapshot(applicationContext)
            serviceScope.launch {
                engineBridge?.takeIf { it.isReady }?.triggerNetworkRefresh()
                withContext(Dispatchers.Main) {
                    syncMulticastLockForDiscovery()
                }
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        multicastLockManager = MulticastLockManager(this)
        networkMonitor = NetworkMonitor(this)
        lastNetworkSnapshot = readDefaultNetworkSnapshot(applicationContext)
        attachRunningInstance(this)
        devicePreferences = DevicePreferences(this)
        btUptimeTracker = BtUptimeTracker(devicePreferences)
        serviceStartedAtMillis = System.currentTimeMillis()
        val deviceLabel = resolveLocalDeviceNameForCore()
        val storage = File(filesDir, "bco").apply { mkdirs() }
        val net = BCONet(deviceLabel, storage.absolutePath + File.separator)
        if (!net.isReady) {
            BCOLogger.e("Service", "BCONewEngine failed: ${net.getLastError() ?: "unknown"}")
        }
        val bridge = RealEngineBridge(net)
        engineBridge = bridge
        bridge.setLogLevel(devicePreferences.coreLogLevel)
        bridge.setBaseBias(devicePreferences.baseBias)
        applyTargetHeadsetToEngine(bridge)
        btController = BluetoothController(this, bridge, devicePreferences)
        audioMonitor = AudioMonitor(this)
        callDetector = CallDetector(this)
        val shell = btController?.let { controller ->
            AndroidShellBridge(
                engine = bridge,
                scope = serviceScope,
                bluetoothController = controller,
                audioMonitor = audioMonitor,
                callDetector = callDetector,
                resolveHeadsetDisplayNameBlock = { resolveHeadsetDisplayNameForCore() },
                refreshStatusBlock = { refreshStatusAndNotify() },
                onPeerListAffectingEventBlock = { bumpPeerListRefreshEpoch() },
                handlePlatformEventBlock = { event -> handlePlatformShellEvent(event) },
                onBtActionErrorChanged = { pendingBtError = it },
                mapBtError = { raw -> userVisibleBtError(raw) },
            )
        }
        if (shell == null) {
            BCOLogger.e("Service", "Bluetooth controller unavailable; continuing without shell bridge")
            pendingBtError = getString(R.string.error_bt_unexpected, "Bluetooth controller unavailable")
        }
        shellBridge = shell
        restoreLocalPausedState(bridge)
        networkMonitor.listener = NetworkChangeListener { snap ->
            lastNetworkSnapshot = snap
            serviceScope.launch {
                engineBridge?.takeIf { it.isReady }?.triggerNetworkRefresh()
                withContext(Dispatchers.Main) {
                    syncMulticastLockForDiscovery()
                }
            }
        }
        networkMonitor.start()
        registerUserPresentReceiver()
        registerTargetDevicePrefsListener()
        if (shell != null) {
            serviceScope.launch { shell.runEventLoop() }
            serviceScope.launch { shell.observeAndPushState() }
            serviceScope.launch { shell.runPeriodicSafetyNetRefresh() }
        }
        NotificationHelper.startForegroundWithTemplate(this, NotificationHelper.initialForegroundTemplate(this))
        startAudioMonitors()
        serviceScope.launch {
            shell?.pushCurrentStateToEngine()
            refreshStatusAndNotify()
        }
        serviceScope.launch {
            delay(STARTUP_BT_RESYNC_DELAY_MS)
            btController?.isTargetA2dpConnected()
            shell?.pushCurrentStateToEngine()
            refreshStatusAndNotify()
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_PAIRING_APPROVE, ACTION_PAIRING_DENY -> {
                val peerId = intent.getStringExtra(EXTRA_PAIRING_PEER_ID)?.trim()?.takeIf { it.isNotEmpty() }
                if (peerId == null) {
                    BCOLogger.w("Service", "pairing action missing peer id")
                } else {
                    val net = engineBridge
                    when (intent.action) {
                        ACTION_PAIRING_APPROVE -> net?.approvePeer(peerId)
                        ACTION_PAIRING_DENY -> net?.denyPeer(peerId)
                    }
                    NotificationManagerCompat.from(this).cancel(NotificationHelper.pairingNotificationId(peerId))
                    _discoveredPeers.value = _discoveredPeers.value.filter { it.peerId != peerId }
                }
                return START_STICKY
            }
            else -> {
                if (intent?.getBooleanExtra(EXTRA_RUN_BT_CONNECT_TEST, false) == true) {
                    enqueueBluetoothConnectTestFromUi()
                }
                return START_STICKY
            }
        }
    }

    override fun onDestroy() {
        unregisterTargetDevicePrefsListener()
        unregisterUserPresentReceiver()
        networkMonitor.stop()
        multicastLockManager.shutdown()
        multicastHeldForDiscovery = false
        detachRunningInstance(this)
        stopAudioMonitors()
        if (prevBtConnectedForTracker == true) {
            btUptimeTracker.onBluetoothDisconnected()
        }
        prevBtConnectedForTracker = null
        btController?.release()
        btController = null
        shellBridge = null
        engineBridge?.stop()
        engineBridge = null
        _discoveredPeers.value = emptyList()
        _serviceUiState.value = ServiceUiState()
        serviceStartedAtMillis = null
        serviceScope.cancel()
        super.onDestroy()
    }

    /**
     * Human label for **this phone** in the Go engine ([LocalState.deviceName], peer list, activity copy).
     * Must not use the saved headset name — that is only [resolveHeadsetDisplayNameForCore].
     */
    private fun resolveLocalDeviceNameForCore(): String {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N_MR1) {
            runCatching {
                Settings.Global.getString(contentResolver, Settings.Global.DEVICE_NAME)
                    ?.trim()
                    ?.takeIf { it.isNotEmpty() }
            }.getOrNull()?.let { return it }
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) ==
            PackageManager.PERMISSION_GRANTED
        ) {
            val adapter = getSystemService(BluetoothManager::class.java)?.adapter
            adapter?.name?.trim()?.takeIf { it.isNotEmpty() }?.let { return it }
        }
        val model = Build.MODEL.trim().takeIf { it.isNotEmpty() }
        if (model != null) {
            val man = Build.MANUFACTURER.trim().takeIf { it.isNotEmpty() }
            return if (man != null && !model.startsWith(man, ignoreCase = true)) {
                "$man $model"
            } else {
                model
            }
        }
        return DEFAULT_DEVICE_LABEL
    }

    /**
     * User-visible saved-headset label for Go [LocalState.headsetDisplayName] (008 / T005).
     * Prefers [DevicePreferences.targetBTName], else bonded device alias/name for the saved address.
     */
    private fun resolveHeadsetDisplayNameForCore(): String? {
        devicePreferences.targetBTName?.trim()?.takeIf { it.isNotEmpty() }?.let { return it }
        val addr = devicePreferences.targetBTAddress?.trim()?.takeIf { it.isNotEmpty() } ?: return null
        return readBondedDeviceDisplayName(addr)
    }

    /**
     * Pushes the persisted target headset (address, name, ISO `lastSelectedAt`) into the Go engine
     * so `local.TargetHeadsetAddr` is non-empty from process start. Without this, peers exclude the
     * phone from headset-group arbitration until [HEADSET_AUTO_SYNC] fires from a peer broadcast.
     * Returns true when a target was applied.
     */
    private fun applyTargetHeadsetToEngine(bridge: EngineBridge): Boolean {
        val addr = devicePreferences.targetBTAddress?.trim()?.takeIf { it.isNotEmpty() } ?: return false
        val name = devicePreferences.targetBTName?.trim()?.takeIf { it.isNotEmpty() } ?: return false
        val selectedAtMs = parseSelectedAtMillis(devicePreferences.lastSelectedAt) ?: System.currentTimeMillis()
        bridge.setTargetHeadset(addr, name, selectedAtMs)
        return true
    }

    private suspend fun applyPersistedTargetHeadsetSideEffects(pushToPeers: Boolean) {
        val bridge = engineBridge
        if (bridge != null && bridge.isReady && applyTargetHeadsetToEngine(bridge) && pushToPeers) {
            bridge.pushHeadsetToPeers()
        }
        shellBridge?.pushCurrentStateToEngine()
        refreshStatusAndNotify()
    }

    private fun saveAutoSyncedTargetHeadset(addr: String, name: String, selectedAt: Long) {
        val selectedAtIso = selectedAt.takeIf { it > 0L }?.let { Instant.ofEpochMilli(it).toString() }
        suppressTargetDevicePrefsListener = true
        try {
            devicePreferences.saveTargetDevice(
                address = addr,
                name = name.takeIf { it.isNotBlank() },
                lastSelectedAt = selectedAtIso,
            )
        } finally {
            suppressTargetDevicePrefsListener = false
        }
    }

    private fun restoreLocalPausedState(bridge: EngineBridge) {
        if (!devicePreferences.localPaused) return
        val localId = fetchLocalDeviceIdForUi() ?: return
        if (!bridge.pauseDevice(localId)) {
            BCOLogger.w("Service", "Could not restore local pause state: ${bridge.getLastError() ?: "unknown"}")
        }
    }

    private fun parseSelectedAtMillis(raw: String?): Long? {
        val text = raw?.trim()?.takeIf { it.isNotEmpty() } ?: return null
        return runCatching { Instant.parse(text).toEpochMilli() }.getOrNull()
    }

    @SuppressLint("MissingPermission")
    private fun readBondedDeviceDisplayName(macAddress: String): String? {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            return null
        }
        @Suppress("DEPRECATION")
        val adapter = BluetoothAdapter.getDefaultAdapter() ?: return null
        val device = adapter.bondedDevices
            ?.firstOrNull { MacAddress.sameDevice(it.address, macAddress) } ?: return null
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            device.alias?.trim()?.takeIf { it.isNotEmpty() }?.let { return it }
        }
        return device.name?.trim()?.takeIf { it.isNotEmpty() }
    }

    private fun currentServiceAudioState(): AudioState = when (shellBridge?.currentAudioState ?: ShellAudioState.Idle) {
        ShellAudioState.Idle -> AudioState.IDLE
        ShellAudioState.Media -> AudioState.MEDIA
        ShellAudioState.IncomingCall -> AudioState.INCOMING_CALL
        ShellAudioState.ActiveCall -> AudioState.ACTIVE_CALL
    }

    /**
     * Call from the main thread only (BT connect/disconnect callbacks).
     * Uses [isTargetA2dpConnected] directly because the system broadcast may not have
     * delivered yet right after a connect/disconnect completes.
     */
    private fun sendCoreStateUpdateToEngineOnMain() {
        val net = engineBridge ?: return
        if (!net.isReady) return
        val bt = btController?.isTargetA2dpConnected() ?: net.snapshotServiceStatus(running = true).btConnected
        net.sendStateUpdate(currentServiceAudioState().toCoreAudioPriority(), bt, resolveHeadsetDisplayNameForCore())
    }

    private fun registerTargetDevicePrefsListener() {
        if (targetDevicePrefsRegistered) return
        applicationContext.getSharedPreferences(DevicePreferences.PREFS_NAME, Context.MODE_PRIVATE)
            .registerOnSharedPreferenceChangeListener(targetDevicePrefsListener)
        targetDevicePrefsRegistered = true
    }

    private fun unregisterTargetDevicePrefsListener() {
        if (!targetDevicePrefsRegistered) return
        applicationContext.getSharedPreferences(DevicePreferences.PREFS_NAME, Context.MODE_PRIVATE)
            .unregisterOnSharedPreferenceChangeListener(targetDevicePrefsListener)
        targetDevicePrefsRegistered = false
    }

    private fun applyCoreLogLevel(level: Int) {
        engineBridge?.setLogLevel(level)
    }

    private fun startAudioMonitors() {
        audioMonitor.start()
        callDetector.start()
    }

    private fun stopAudioMonitors() {
        audioMonitor.stop()
        callDetector.stop()
    }

    private suspend fun handlePlatformShellEvent(event: EngineEvent) {
        android.util.Log.d("BCO.Trace", "[Trace] handlePlatformShellEvent: type=${event.type}")
        when (event.type) {
            "PAIRING_REQUEST" -> {
                val req = event.toPairingRequestOrNull()
                if (req == null) {
                    BCOLogger.w("Service", "PAIRING_REQUEST missing name/id/code/fingerprint")
                } else {
                    val alreadyApproved = _serviceUiState.value.peers.any { it.peerId == req.peerId }
                    if (alreadyApproved) {
                        BCOLogger.i("Service", "PAIRING_REQUEST from already-approved peer ${req.peerId}, auto-approving")
                        engineBridge?.approvePeer(req.peerId)
                    } else {
                        withContext(Dispatchers.Main) {
                            NotificationHelper.notifyPairingRequest(this@BCOService, req)
                            val current = _discoveredPeers.value
                            if (current.none { it.peerId == req.peerId }) {
                                _discoveredPeers.value = current + req
                            }
                        }
                    }
                }
            }
            "PAIRING_WITHDRAWN" -> {
                val id = event.peerId?.trim()?.takeIf { it.isNotEmpty() } ?: return
                withContext(Dispatchers.Main) {
                    NotificationManagerCompat.from(this@BCOService).cancel(NotificationHelper.pairingNotificationId(id))
                    _discoveredPeers.value = removeWithdrawnPairingRequest(_discoveredPeers.value, id)
                }
            }
            "PEER_JOINED", "PEER_LEFT", "PEER_REMOVED", "PEER_PAUSED", "PEER_RESUMED" -> {
                refreshStatusAndNotify()
            }
            "HEADSET_UPDATE_RECEIVED" -> {
                val hs = event.headset
                val peer = event.peerName ?: "Peer"
                if (hs != null && hs.addr.isNotBlank()) {
                    BCOLogger.i("Headset", "Peer $peer changed headset to ${hs.name} (${hs.addr})")
                }
                refreshStatusAndNotify()
            }
            "HEADSET_AUTO_SYNC" -> {
                val hs = event.headset
                val peer = event.peerName ?: "Peer"
                if (hs != null && hs.addr.isNotBlank()) {
                    // Peers (notably macOS' IOBluetooth) broadcast MACs as `aa-bb-cc-dd-ee-ff`;
                    // canonicalize before persisting/pushing so Android BluetoothAdapter accepts them.
                    val canonicalAddr = MacAddress.canonicalize(hs.addr) ?: hs.addr
                    BCOLogger.i("Headset", "Auto-syncing headset to ${hs.name} from $peer")
                    saveAutoSyncedTargetHeadset(canonicalAddr, hs.name, hs.selectedAt)
                    engineBridge?.recordActivity(
                        "headset_sync",
                        "Headset auto-updated to ${hs.name} (synced from $peer)",
                        peer,
                    )
                }
                applyPersistedTargetHeadsetSideEffects(pushToPeers = true)
            }
            else -> {
                // … — US7+
            }
        }
        if (event.type in remotePeerActivityEventTypes) {
            logRemotePeerActivitySnapshot(event)
        }
    }

    private fun remotePeerActivityFingerprint(p: PeerEntry): String = RemotePeerSig.fromPeer(p).fingerprint()

    private fun remotePeerAudioLabel(priority: Int): String = when (priority) {
        100 -> "Media"
        200 -> "Incoming call"
        300 -> "Active call"
        else -> "Idle"
    }

    private data class RemotePeerSig(
        val audioPriority: Int,
        val hasBt: Boolean,
        val paused: Boolean,
        val connected: Boolean,
    ) {
        fun fingerprint(): String = "$audioPriority|$hasBt|$paused|$connected"

        companion object {
            fun fromPeer(e: PeerEntry) = RemotePeerSig(
                e.audioPriority,
                e.hasBluetoothConnection,
                e.paused,
                e.connected,
            )

            fun fromFingerprint(fp: String): RemotePeerSig? {
                val p = fp.split('|')
                if (p.size != 4) return null
                val ap = p[0].toIntOrNull() ?: return null
                return RemotePeerSig(
                    audioPriority = ap,
                    hasBt = p[1] == "true",
                    paused = p[2] == "true",
                    connected = p[3] == "true",
                )
            }
        }
    }

    /** Human-readable delta for logcat; explains what the *other* device is doing vs last snapshot. */
    private fun describeRemotePeerTransition(peer: PeerEntry, prevFp: String?): String {
        val now = RemotePeerSig.fromPeer(peer)
        val prev = prevFp?.let { RemotePeerSig.fromFingerprint(it) }
        fun audio(p: Int) = remotePeerAudioLabel(p)
        fun bt(b: Boolean) = if (b) "their headset A2DP on" else "their headset A2DP off"
        fun role(paused: Boolean) = if (paused) "paused in group" else "active in group"
        if (prev == null) {
            return """first snapshot: audio ${audio(now.audioPriority)}, ${bt(now.hasBt)}, ${role(now.paused)}"""
        }
        val parts = mutableListOf<String>()
        if (prev.audioPriority != now.audioPriority) {
            parts += "audio ${audio(prev.audioPriority)} → ${audio(now.audioPriority)}"
        }
        if (prev.hasBt != now.hasBt) {
            parts += "${bt(prev.hasBt)} → ${bt(now.hasBt)}"
        }
        if (prev.paused != now.paused) {
            parts += "pause state changed"
        }
        if (prev.connected != now.connected) {
            parts += "mesh reachability changed"
        }
        val hint = when {
            prev.audioPriority != now.audioPriority && now.audioPriority >= 100 ->
                " — peer wants audio; core may move the headset off this phone"
            prev.audioPriority != now.audioPriority && now.audioPriority == 0 && prev.audioPriority >= 100 ->
                " — peer ended high-priority audio"
            else -> ""
        }
        val body = if (parts.isEmpty()) "snapshot tweak (same activity)" else parts.joinToString("; ")
        return "$body$hint"
    }

    /**
     * Logs join/leave/removal and any change in remote peers' audio (e.g. Mac playing media), headset link, or pause.
     * Tag: `BCO.Remote` in logcat. Use `adb logcat -s BCO.Remote BCO.Handover` for a readable handover story.
     */
    private fun logRemotePeerActivitySnapshot(event: EngineEvent) {
        when (event.type) {
            "PEER_JOINED" -> {
                val name = event.peerName?.trim()?.takeIf { it.isNotEmpty() } ?: "Peer"
                val id = event.peerId?.trim()?.takeIf { it.isNotEmpty() } ?: "?"
                BCOLogger.i("Remote", "Peer joined: \"$name\" ($id)")
            }
            "PEER_LEFT" -> {
                val name = event.peerName?.trim()?.takeIf { it.isNotEmpty() } ?: "Peer"
                val id = event.peerId?.trim()?.takeIf { it.isNotEmpty() } ?: "?"
                BCOLogger.i("Remote", "Peer left: \"$name\" ($id)")
                if (id != "?") remotePeerFingerprints.remove(id)
            }
            "PEER_REMOVED" -> {
                val name = event.peerName?.trim()?.takeIf { it.isNotEmpty() } ?: "Peer"
                val id = event.peerId?.trim()?.takeIf { it.isNotEmpty() } ?: "?"
                BCOLogger.i("Remote", "Peer removed from group: \"$name\" ($id)")
                if (id != "?") remotePeerFingerprints.remove(id)
            }
            else -> Unit
        }
        val net = engineBridge ?: return
        if (!net.isReady) return
        val json = net.getPeerStates()?.trim()?.takeIf { it.isNotEmpty() } ?: "[]"
        val peers = parsePeerEntriesJson(json)
        val currentIds = peers.map { it.deviceId }.toSet()
        remotePeerFingerprints.keys.retainAll { it in currentIds }
        for (p in peers) {
            val fp = remotePeerActivityFingerprint(p)
            val prev = remotePeerFingerprints[p.deviceId]
            if (prev != fp) {
                remotePeerFingerprints[p.deviceId] = fp
                val detail = describeRemotePeerTransition(p, prev)
                BCOLogger.i(
                    "Remote",
                    """Peer "${p.deviceName}" (${p.platform}): $detail""",
                )
            }
        }
    }

    /**
     * Shared path for engine [CONNECT_BT] and settings “test connect”. Runs on main thread inside.
     */
    private suspend fun runBluetoothConnectSequence(logLabel: String, showResultToast: Boolean) {
        withContext(Dispatchers.Main) {
            val c = btController
            val n = engineBridge
            if (c == null || n == null || !n.isReady) {
                BCOLogger.w("Service", "BT connect ($logLabel) ignored: engine or controller unavailable")
                if (showResultToast) {
                    emitBtTestConnectFeedback(
                        getString(R.string.bt_test_connect_engine_unavailable),
                        isSuccess = false,
                    )
                }
                return@withContext
            }
            c.requestProfileProxyIfNeeded()
            suspendCancellableCoroutine { cont ->
                c.connectTarget {
                    val rawErr = c.lastErrorMessage?.takeIf { it.isNotBlank() }
                    pendingBtError = userVisibleBtError(rawErr)
                    if (rawErr != null) {
                        BCOLogger.e("Service", "BT connect ($logLabel) failed: $rawErr")
                    }
                    if (showResultToast) {
                        when {
                            rawErr == null -> {
                                emitBtTestConnectFeedback(
                                    getString(R.string.bt_test_connect_result_success),
                                    isSuccess = true,
                                )
                            }
                            rawErr == BluetoothA2dpActuator.ERROR_UNSUPPORTED -> {
                                emitBtTestConnectFeedback(
                                    getString(R.string.bt_auto_switch_unsupported),
                                    isSuccess = false,
                                )
                            }
                            else -> {
                                val ui = userVisibleBtError(rawErr) ?: rawErr
                                emitBtTestConnectFeedback(
                                    getString(R.string.bt_test_connect_result_failure, ui),
                                    isSuccess = false,
                                )
                            }
                        }
                    }
                    sendCoreStateUpdateToEngineOnMain()
                    cont.resume(Unit)
                }
            }
        }
    }

    internal fun enqueueBluetoothConnectTestFromUi() {
        serviceScope.launch {
            runBluetoothConnectSequence(logLabel = "manual test", showResultToast = true)
            val headsetName = devicePreferences.targetBTName?.trim()?.takeIf { it.isNotEmpty() } ?: "headset"
            val deviceName = android.os.Build.MODEL ?: "this device"
            engineBridge?.recordActivity(
                "force_connect",
                "$headsetName manually connected to $deviceName",
            )
            refreshStatusAndNotify()
        }
    }

    /** Maps controller internal messages to localized copy (US5 / T037 / T051). */
    private fun userVisibleBtError(raw: String?): String? {
        val r = raw?.takeIf { it.isNotBlank() } ?: return null
        return when (r) {
            BluetoothA2dpActuator.ERROR_UNSUPPORTED -> getString(R.string.bt_auto_switch_unsupported)
            BluetoothA2dpActuator.ERROR_NO_TARGET -> getString(R.string.error_bt_no_target)
            BluetoothA2dpActuator.ERROR_BAD_ADDRESS -> getString(R.string.error_bt_bad_address)
            BluetoothA2dpActuator.ERROR_NOT_BONDED -> getString(R.string.error_bt_not_bonded)
            BluetoothA2dpActuator.ERROR_CORE_REJECTED -> getString(R.string.error_bt_core_rejected)
            BluetoothA2dpActuator.ERROR_BLUETOOTH_OFF -> getString(R.string.error_bt_off)
            BluetoothA2dpActuator.ERROR_NO_BT_CONNECT_PERMISSION -> getString(R.string.error_bt_no_connect_permission)
            BluetoothA2dpActuator.ERROR_CONNECT_RETURNED_FALSE -> getString(R.string.error_bt_connect_rejected)
            BluetoothA2dpActuator.ERROR_RECONNECT_DISCONNECT_TIMEOUT ->
                getString(R.string.error_bt_reconnect_disconnect_timeout)
            else -> getString(R.string.error_bt_unexpected, r)
        }
    }

    internal fun fetchPeerEntriesForUi(): List<PeerEntry> {
        val net = engineBridge ?: return emptyList()
        if (!net.isReady) return emptyList()
        val json = net.getPeerStates()?.trim()?.takeIf { it.isNotEmpty() } ?: return emptyList()
        android.util.Log.d("BCO.Trace", "[Trace] fetchPeerEntriesForUi raw JSON: ${json.take(500)}")
        return parsePeerEntriesJson(json)
    }

    /** Attempt outbound dial to [addr] (trimmed by caller). */
    internal fun connectPeerFromUiBlocking(addr: String): ConnectPeerOutcome {
        val net = engineBridge ?: return ConnectPeerOutcome.ServiceStopped
        if (!net.isReady) {
            val msg = net.getLastError()?.trim()?.takeIf { it.isNotEmpty() }
            return if (msg != null) ConnectPeerOutcome.Error(msg) else ConnectPeerOutcome.ServiceStopped
        }
        val ok = net.connectPeer(addr)
        return if (ok) {
            ConnectPeerOutcome.Success
        } else {
            val msg = net.getLastError()?.trim()?.takeIf { it.isNotEmpty() }
                ?: getString(R.string.error_generic)
            ConnectPeerOutcome.Error(msg)
        }
    }

    /** Dialable / shareable listen address while the engine is running (US7). */
    internal fun fetchLocalAddressForUi(): String? {
        val net = engineBridge ?: return null
        if (!net.isReady) return null
        net.getLocalMultiaddr()?.trim()?.takeIf { it.isNotEmpty() }?.let { return it }
        val ls = net.getLocalState()?.trim()?.takeIf { it.isNotEmpty() } ?: return null
        return try {
            parseLocalStateJson(ls)?.preferredMultiaddr
        } catch (_: SerializationException) {
            null
        } catch (_: IllegalArgumentException) {
            null
        }
    }

    internal fun fetchLocalDeviceIdForUi(): String? {
        val net = engineBridge ?: return null
        if (!net.isReady) return null
        val json = net.getLocalState()?.trim()?.takeIf { it.isNotEmpty() } ?: return null
        return try {
            parseLocalStateJson(json)?.deviceId?.trim()?.takeIf { it.isNotEmpty() }
        } catch (_: SerializationException) {
            null
        } catch (_: IllegalArgumentException) {
            null
        }
    }

    internal fun pauseDeviceFromUi(deviceId: String): Boolean {
        val net = engineBridge ?: return false
        val ok = net.isReady && net.pauseDevice(deviceId)
        if (ok && fetchLocalDeviceIdForUi() == deviceId) {
            devicePreferences.localPaused = true
        }
        if (ok) launchRefreshStatusAndNotify()
        return ok
    }

    internal fun resumeDeviceFromUi(deviceId: String): Boolean {
        val net = engineBridge ?: return false
        val ok = net.isReady && net.resumeDevice(deviceId)
        if (ok && fetchLocalDeviceIdForUi() == deviceId) {
            devicePreferences.localPaused = false
        }
        if (ok) launchRefreshStatusAndNotify()
        return ok
    }

    internal fun forceConnectFromUi(): Boolean {
        val shell = shellBridge ?: return false
        val net = engineBridge ?: return false
        if (!net.isReady) return false
        val ok = shell.forceConnect()
        if (ok) {
            val headsetName = devicePreferences.targetBTName?.trim()?.takeIf { it.isNotEmpty() } ?: "headset"
            val deviceName = android.os.Build.MODEL ?: "this device"
            net.recordActivity("force_connect", "$headsetName manually connected to $deviceName")
        }
        launchRefreshStatusAndNotify()
        return ok
    }

    internal fun removePeerFromUi(deviceId: String): Boolean {
        val net = engineBridge ?: return false
        return net.isReady && net.removePeer(deviceId)
    }

    private suspend fun refreshStatusAndNotify() {
        val net = engineBridge ?: return
        withContext(Dispatchers.Main) {
            val c = btController
            val base = net.snapshotServiceStatus(running = true).copy(
                audioState = currentServiceAudioState(),
                btActionError = pendingBtError,
            )
            val platformBtConnected = c?.btConnectedState?.value
            val snapshot = base.copy(
                btConnected = platformBtConnected ?: base.coreBtConnected,
                platformObservedBtConnected = platformBtConnected,
            )
            serviceStatus = snapshot
            syncBtUptimeTracker(snapshot.btConnected)
            _serviceUiState.value = buildServiceUiState(net, snapshot)
            NotificationHelper.notifyForegroundTemplate(
                this@BCOService,
                snapshot.toForegroundTemplate(this@BCOService),
            )
            syncMulticastLockForDiscovery()
        }
    }

    private fun launchRefreshStatusAndNotify() {
        serviceScope.launch {
            refreshStatusAndNotify()
        }
    }

    private fun syncBtUptimeTracker(connected: Boolean) {
        when {
            prevBtConnectedForTracker == null -> {
                prevBtConnectedForTracker = connected
                if (connected) {
                    btUptimeTracker.onBluetoothConnected()
                }
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

    private fun buildServiceUiState(net: EngineBridge, snapshot: ServiceStatus): ServiceUiState {
        val now = System.currentTimeMillis()
        val local = parseLocalStateJson(net.getLocalState())
        val peers = fetchPeerEntriesForUi()
        val localBtConnected = snapshot.btConnected
        android.util.Log.i("BCO.Trace", "[Trace] buildServiceUiState: localBtConnected=$localBtConnected, " +
            "coreBtConnected=${snapshot.coreBtConnected}, " +
            "platformObservedBtConnected=${snapshot.platformObservedBtConnected}, " +
            "local.hasBT=${local?.hasBluetoothConnection}, " +
            "local.audio=${local?.audioPriority}, " +
            "local.target=${local?.targetHeadsetAddr.orEmpty()}, " +
            "peers=${peers.map { "${it.deviceName}(bt=${it.hasBluetoothConnection},audio=${it.audioPriority},paused=${it.paused},target=${it.targetHeadsetAddr.orEmpty()})" }}")
        val (holderName, holderAudio) = resolveHeadsetHolder(
            local = local,
            peers = peers,
            localBtConnected = localBtConnected,
            localFallbackName = getString(R.string.peer_row_this_device),
            remoteFallbackName = getString(R.string.force_connect_default_peer_name),
        )
        android.util.Log.i("BCO.Trace", "[Trace] resolveHeadsetHolder → holderName=$holderName holderAudio=$holderAudio")
        val switchHistory = parseSwitchHistoryWindow(net, now)
        val activityJson = if (net.isReady) {
            net.getActivityFeed(ACTIVITY_FEED_MAX_EVENTS)
        } else {
            null
        }
        val activityEvents = parseActivityFeedJson(activityJson)
        val conn = when {
            !net.isReady -> CoreConnectionState.Connecting
            peers.isEmpty() || peers.any { it.connected } -> CoreConnectionState.Connected
            else -> CoreConnectionState.Disconnected
        }
        val localCoreVersion = BcoCoreMetadata.getCoreVersionOrNull()
        return ServiceUiState(
            serviceRunning = true,
            serviceStartedAt = serviceStartedAtMillis,
            connectionState = conn,
            headsetName = devicePreferences.targetBTName?.trim()?.takeIf { it.isNotEmpty() },
            headsetMac = devicePreferences.targetBTAddress?.trim()?.takeIf { it.isNotEmpty() },
            audioState = snapshot.audioState.toCore(),
            currentHolderName = holderName,
            currentHolderAudioState = holderAudio,
            localHoldsBluetooth = localBtConnected,
            paused = local?.paused == true,
            peers = peers.map { it.toPeerUiState() },
            activityEvents = activityEvents,
            switchCount24h = switchHistory.count,
            avgHoldTimeMinutes = switchHistory.avgHoldMinutes,
            switchBucketCounts = switchHistory.bucketCounts,
            btConnectionTimeToday = btUptimeTracker.connectionMsToday(now),
            localCoreVersion = localCoreVersion,
            localHeadsetAddr = devicePreferences.targetBTAddress?.trim()?.takeIf { it.isNotEmpty() },
        )
    }


    /**
     * Parses [EngineBridge.getSwitchHistory] once: 24h window stats, average gap between switches,
     * and 12×2h bucket counts. Bucket index **0** is the oldest interval (≈22–24h ago), **11** the newest (≈0–2h ago).
     */
    private fun parseSwitchHistoryWindow(net: EngineBridge, nowMillis: Long): ParsedSwitchHistory24h {
        val zeros = List(12) { 0 }
        if (!net.isReady) return ParsedSwitchHistory24h(0, 0, zeros)
        val raw = net.getSwitchHistory()?.trim()?.takeIf { it.isNotEmpty() }
            ?: return ParsedSwitchHistory24h(0, 0, zeros)
        val events = try {
            BcoJson.decodeFromString(ListSerializer(SwitchEvent.serializer()), raw)
        } catch (_: SerializationException) {
            return ParsedSwitchHistory24h(0, 0, zeros)
        } catch (_: IllegalArgumentException) {
            return ParsedSwitchHistory24h(0, 0, zeros)
        }
        val cutoff = nowMillis - SWITCH_STATS_WINDOW_MS
        val windowed = events.filter { it.timestamp >= cutoff }.sortedBy { it.timestamp }
        val count = windowed.size
        val buckets = IntArray(12)
        for (e in windowed) {
            val ageMs = (nowMillis - e.timestamp).coerceAtLeast(0L)
            val coarse = (ageMs / SWITCH_BUCKET_MS).toInt().coerceIn(0, 11)
            val bucketIndex = 11 - coarse
            buckets[bucketIndex]++
        }
        if (count < 2) {
            return ParsedSwitchHistory24h(count, 0, buckets.toList())
        }
        var sumDelta = 0L
        var intervals = 0
        for (i in 0 until windowed.lastIndex) {
            val dt = windowed[i + 1].timestamp - windowed[i].timestamp
            if (dt >= 0L) {
                sumDelta += dt
                intervals++
            }
        }
        if (intervals == 0) {
            return ParsedSwitchHistory24h(count, 0, buckets.toList())
        }
        val avgMinutes = (sumDelta / intervals / 60_000L).toInt().coerceAtLeast(0)
        return ParsedSwitchHistory24h(count, avgMinutes, buckets.toList())
    }

    private fun registerUserPresentReceiver() {
        if (userPresentReceiverRegistered) return
        val filter = IntentFilter(Intent.ACTION_USER_PRESENT)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(userPresentReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("DEPRECATION")
            registerReceiver(userPresentReceiver, filter)
        }
        userPresentReceiverRegistered = true
    }

    private fun unregisterUserPresentReceiver() {
        if (!userPresentReceiverRegistered) return
        unregisterReceiver(userPresentReceiver)
        userPresentReceiverRegistered = false
    }

    /**
     * FR-016 / SC-008: hold multicast lock only while the engine is up, no peers yet, and a default
     * data network exists (active mDNS discovery window).
     */
    private fun syncMulticastLockForDiscovery() {
        val net = engineBridge
        val running = net != null && net.isReady
        val peerCount = if (running) net!!.snapshotServiceStatus(running = true).peerCount else 0
        val discoveryExpected = running && peerCount == 0 && lastNetworkSnapshot.isDefaultNetworkConnected
        if (discoveryExpected && !multicastHeldForDiscovery) {
            multicastLockManager.acquire()
            multicastHeldForDiscovery = true
            BCOLogger.d("Service", "multicast lock acquired (discovery, peerCount=0)")
        } else if (!discoveryExpected && multicastHeldForDiscovery) {
            multicastLockManager.release()
            multicastHeldForDiscovery = false
            BCOLogger.d("Service", "multicast lock released")
        }
    }

    companion object {
        private val _serviceUiState = MutableStateFlow(ServiceUiState())

        /** Aggregated dashboard model; resets when the service is destroyed. */
        val serviceUiState: StateFlow<ServiceUiState> = _serviceUiState.asStateFlow()

        private val _discoveredPeers = MutableStateFlow<List<PairingRequest>>(emptyList())

        /** Discovered-but-not-yet-approved peers accumulated from PAIRING_REQUEST engine events. */
        val discoveredPeers: StateFlow<List<PairingRequest>> = _discoveredPeers.asStateFlow()

        private val _btTestConnectFeedback = MutableSharedFlow<BtTestConnectUiFeedback>(
            replay = 0,
            extraBufferCapacity = 4,
            onBufferOverflow = BufferOverflow.DROP_OLDEST,
        )

        /** Emitted when the user runs “Test Bluetooth connect” from settings (success or failure text). */
        val btTestConnectFeedback: SharedFlow<BtTestConnectUiFeedback> =
            _btTestConnectFeedback.asSharedFlow()

        private val _peerListRefreshEpoch = MutableStateFlow(0)

        /** Bumped when peer membership/pause engine events arrive so [PeerListSection] refreshes promptly. */
        val peerListRefreshEpoch: StateFlow<Int> = _peerListRefreshEpoch.asStateFlow()

        @Volatile
        private var runningInstance: BCOService? = null

        internal fun attachRunningInstance(s: BCOService) {
            runningInstance = s
        }

        internal fun detachRunningInstance(s: BCOService) {
            if (runningInstance === s) {
                runningInstance = null
            }
        }

        internal fun bumpPeerListRefreshEpoch() {
            val cur = _peerListRefreshEpoch.value
            _peerListRefreshEpoch.value = cur + 1
        }

        private fun emitBtTestConnectFeedback(message: String, isSuccess: Boolean) {
            _btTestConnectFeedback.tryEmit(BtTestConnectUiFeedback(message, isSuccess))
        }

        /** Snapshot of [EngineBridge.getPeerStates] for UI; empty when the service is not running. */
        fun getPeerEntriesSnapshot(): List<PeerEntry> {
            return runningInstance?.fetchPeerEntriesForUi().orEmpty()
        }

        /** Local multiaddr from [EngineBridge.getLocalMultiaddr] or [LocalState.multiaddr]; null if the service is stopped. */
        fun getLocalAddressSnapshot(): String? {
            return runningInstance?.fetchLocalAddressForUi()
        }

        /** Manual connect from settings (US7). */
        fun connectPeerFromUi(addr: String): ConnectPeerOutcome {
            return runningInstance?.connectPeerFromUiBlocking(addr) ?: ConnectPeerOutcome.ServiceStopped
        }

        /** Local [LocalState.deviceId] for marking the self row in the peer list. */
        fun getLocalDeviceIdSnapshot(): String? {
            return runningInstance?.fetchLocalDeviceIdForUi()
        }

        fun pauseDeviceFromUi(deviceId: String): Boolean {
            return runningInstance?.pauseDeviceFromUi(deviceId) == true
        }

        fun resumeDeviceFromUi(deviceId: String): Boolean {
            return runningInstance?.resumeDeviceFromUi(deviceId) == true
        }

        fun forceConnectFromUi(): Boolean {
            return runningInstance?.forceConnectFromUi() == true
        }

        fun removePeerFromUi(deviceId: String): Boolean {
            return runningInstance?.removePeerFromUi(deviceId) == true
        }

        /** Triggers a full service UI refresh (peers, switch stats, activity feed). Main-safe; no-op if stopped. */
        fun requestDashboardRefresh() {
            runningInstance?.launchRefreshStatusAndNotify()
        }

        /**
         * Runs the same A2DP connect sequence as a [CONNECT_BT] engine event (saved headset).
         * Returns false if the service is not running; start the foreground service with
         * [EXTRA_RUN_BT_CONNECT_TEST] true to run the test from [onStartCommand].
         */
        fun enqueueTestBluetoothConnectFromUi(): Boolean {
            val s = runningInstance ?: return false
            s.enqueueBluetoothConnectTestFromUi()
            return true
        }

        /** Applies [DevicePreferences.coreLogLevel] to the running engine; no-op if the service is stopped. */
        fun applyCoreLogLevelFromUi(level: Int) {
            runningInstance?.applyCoreLogLevel(level)
        }

        /** Applies base bias from settings UI. */
        fun applyBaseBiasFromUi(bias: Int) {
            runningInstance?.engineBridge?.setBaseBias(bias)
        }

        /** Updates a network-wide int setting from UI. */
        fun updateNetworkSettingFromUi(key: String, value: Int) {
            runningInstance?.engineBridge?.updateNetworkSetting(key, value)
        }

        /** Updates a network-wide string setting from UI. */
        fun updateNetworkSettingStringFromUi(key: String, value: String) {
            runningInstance?.engineBridge?.updateNetworkSettingString(key, value)
        }

        /** Returns current network settings JSON from the core. */
        fun getNetworkSettingsSnapshot(): String? {
            return runningInstance?.engineBridge?.getNetworkSettings()
        }

        fun notifyPermissionsChanged() {
            val detector = runningInstance?.callDetector
            if (detector is CallDetector) {
                detector.onPermissionsChanged()
            }
        }

        /** When true on the service start [Intent], [onStartCommand] runs the settings BT test connect path. */
        const val EXTRA_RUN_BT_CONNECT_TEST: String = "com.bco.android.extra.RUN_BT_CONNECT_TEST"

        const val ACTION_STOP: String = "com.bco.android.action.STOP_SERVICE"

        /** Start commands from pairing notification; handled in [onStartCommand]. */
        const val ACTION_PAIRING_APPROVE: String = "com.bco.android.action.PAIRING_APPROVE"
        const val ACTION_PAIRING_DENY: String = "com.bco.android.action.PAIRING_DENY"
        const val EXTRA_PAIRING_PEER_ID: String = "com.bco.android.extra.PAIRING_PEER_ID"

        private const val DEFAULT_DEVICE_LABEL = "Android"
    }
}

/** Aligns with [NetworkMonitor] defaults for first frame before callbacks fire (US8 T047). */
private fun readDefaultNetworkSnapshot(context: Context): NetworkSnapshot {
    val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    val network = cm.activeNetwork ?: return NetworkSnapshot(false, false)
    val caps = cm.getNetworkCapabilities(network) ?: return NetworkSnapshot(false, false)
    val hasInternet = caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    val validated = caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    return NetworkSnapshot(
        isDefaultNetworkConnected = true,
        hasValidatedInternet = hasInternet && validated,
    )
}
