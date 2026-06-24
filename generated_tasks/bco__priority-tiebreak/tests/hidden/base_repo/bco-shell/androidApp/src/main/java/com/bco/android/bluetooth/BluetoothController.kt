package com.bco.android.bluetooth

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothProfile
import android.bluetooth.BluetoothA2dp
import android.bluetooth.BluetoothHeadset
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import androidx.core.content.ContextCompat
import com.bco.android.logging.BCOLogger
import com.bco.android.prefs.DevicePreferences
import com.bco.shared.platform.EngineBridge
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.lang.reflect.Method
import java.util.ArrayDeque

/**
 * Drives A2DP connect/disconnect for the saved [DevicePreferences] target via hidden
 * [BluetoothA2dp] APIs (reflection). Reports progress to the Go core (US5 / T035).
 *
 * Profile proxy and callbacks must run on the process main thread ([android.os.Looper.getMainLooper]).
 */
class BluetoothController(
    context: Context,
    private val engineBridge: EngineBridge,
    private val prefs: DevicePreferences,
) : BluetoothA2dpActuator {
    private val appContext = context.applicationContext

    @Suppress("DEPRECATION")
    private val adapter: BluetoothAdapter? = BluetoothAdapter.getDefaultAdapter()

    @Volatile
    private var a2dp: BluetoothA2dp? = null

    /** HFP proxy — used to disconnect calls profile so the OS actually drops the headset, not only A2DP. */
    @Volatile
    private var headset: BluetoothHeadset? = null

    @Volatile
    private var a2dpBindRequested: Boolean = false

    @Volatile
    private var headsetBindRequested: Boolean = false

    private val pendingMainActions: ArrayDeque<() -> Unit> = ArrayDeque()

    private var connectMethod: Method? = null
    private var disconnectMethod: Method? = null
    private var headsetDisconnectMethod: Method? = null

    /** True after reflection locates hidden `connect` / `disconnect` on [BluetoothA2dp]. */
    @Volatile
    private var supportedFlag: Boolean = false
    override val isSupported: Boolean get() = supportedFlag

    /**
     * Last stable answer for whether the saved target has an active audio profile (A2DP or HFP).
     * Used so [isTargetA2dpConnected] does not briefly report false during CONNECTING/DISCONNECTING
     * or while the A2DP proxy is rebound ([BluetoothProfile.ServiceListener] timing).
     */
    @Volatile
    private var lastStableTargetAudioConnected: Boolean = false

    /** Monotonic deadline ([SystemClock.elapsedRealtime]) to keep reporting connected after A2DP proxy drops. */
    @Volatile
    private var holdTargetAudioConnectedUntilElapsed: Long = 0L

    /** User- or developer-visible explanation of the last failed operation, if any. */
    @Volatile
    private var lastErrorInternal: String? = null
    override val lastErrorMessage: String? get() = lastErrorInternal

    private val _btConnectedState = MutableStateFlow(false)
    override val btConnectedState: StateFlow<Boolean> = _btConnectedState.asStateFlow()

    private var btStateReceiverRegistered = false

    @SuppressLint("MissingPermission")
    private val btStateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val action = intent?.action ?: return
            when (action) {
                BluetoothAdapter.ACTION_STATE_CHANGED -> {
                    val adapterState = intent.getIntExtra(BluetoothAdapter.EXTRA_STATE, BluetoothAdapter.ERROR)
                    android.util.Log.i("BCO.Trace", "[Trace] BT adapter state changed: $adapterState")
                    when (adapterState) {
                        BluetoothAdapter.STATE_OFF, BluetoothAdapter.STATE_TURNING_OFF -> {
                            lastStableTargetAudioConnected = false
                            holdTargetAudioConnectedUntilElapsed = 0L
                            _btConnectedState.value = false
                        }
                        BluetoothAdapter.STATE_ON -> {
                            isTargetA2dpConnected()
                            requestProfileProxyIfNeeded()
                        }
                    }
                }
                BluetoothA2dp.ACTION_CONNECTION_STATE_CHANGED,
                BluetoothHeadset.ACTION_CONNECTION_STATE_CHANGED -> {
                    val device = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE, BluetoothDevice::class.java)
                    } else {
                        @Suppress("DEPRECATION")
                        intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
                    }
                    val targetAddr = prefs.targetBTAddress?.trim()?.takeIf { it.isNotEmpty() }
                    val newState = intent.getIntExtra(BluetoothProfile.EXTRA_STATE, -1)
                    val prevState = intent.getIntExtra(BluetoothProfile.EXTRA_PREVIOUS_STATE, -1)
                    android.util.Log.i("BCO.Trace", "[Trace] BT broadcast: action=$action device=${device?.address} " +
                        "state=$prevState→$newState targetAddr=$targetAddr")
                    if (targetAddr != null && device != null &&
                        MacAddress.sameDevice(device.address, targetAddr)
                    ) {
                        val connected = isTargetA2dpConnected()
                        android.util.Log.i("BCO.Trace", "[Trace] BT target match: connected=$connected (flow was ${_btConnectedState.value})")
                    }
                }
            }
        }
    }

    private val serviceListener = object : BluetoothProfile.ServiceListener {
        override fun onServiceConnected(profile: Int, proxy: BluetoothProfile?) {
            when (profile) {
                BluetoothProfile.A2DP -> {
                    if (proxy !is BluetoothA2dp) return
                    a2dp = proxy
                    cacheHiddenMethods()
                    drainPending()
                    isTargetA2dpConnected()
                }
                BluetoothProfile.HEADSET -> {
                    if (proxy !is BluetoothHeadset) return
                    headset = proxy
                    cacheHeadsetDisconnectMethod()
                }
                else -> Unit
            }
        }

        override fun onServiceDisconnected(profile: Int) {
            when (profile) {
                BluetoothProfile.A2DP -> {
                    if (lastStableTargetAudioConnected) {
                        holdTargetAudioConnectedUntilElapsed =
                            SystemClock.elapsedRealtime() + PROXY_LOSS_HOLD_MS
                    }
                    a2dp = null
                    supportedFlag = false
                    connectMethod = null
                    disconnectMethod = null
                }
                BluetoothProfile.HEADSET -> {
                    headset = null
                    headsetDisconnectMethod = null
                }
                else -> Unit
            }
        }
    }

    init {
        requestProfileProxyIfNeeded()
        registerBtStateReceiver()
    }

    private fun registerBtStateReceiver() {
        if (btStateReceiverRegistered) return
        val filter = IntentFilter().apply {
            addAction(BluetoothAdapter.ACTION_STATE_CHANGED)
            addAction(BluetoothA2dp.ACTION_CONNECTION_STATE_CHANGED)
            addAction(BluetoothHeadset.ACTION_CONNECTION_STATE_CHANGED)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            appContext.registerReceiver(btStateReceiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            @Suppress("DEPRECATION")
            appContext.registerReceiver(btStateReceiver, filter)
        }
        btStateReceiverRegistered = true
    }

    private fun unregisterBtStateReceiver() {
        if (!btStateReceiverRegistered) return
        appContext.unregisterReceiver(btStateReceiver)
        btStateReceiverRegistered = false
    }

    private fun hasBtConnectPermission(): Boolean =
        ContextCompat.checkSelfPermission(appContext, Manifest.permission.BLUETOOTH_CONNECT) ==
            PackageManager.PERMISSION_GRANTED

    /**
     * Ensures A2DP proxy is requested. Safe to call multiple times. Must run on main thread.
     */
    override fun requestProfileProxyIfNeeded() {
        val ad = adapter ?: return
        if (!hasBtConnectPermission()) {
            BCOLogger.w("BluetoothController", "Skipping profile proxy — BLUETOOTH_CONNECT not granted")
            return
        }
        try {
            if (!a2dpBindRequested) {
                a2dpBindRequested = true
                ad.getProfileProxy(appContext, serviceListener, BluetoothProfile.A2DP)
            }
            if (!headsetBindRequested) {
                headsetBindRequested = true
                ad.getProfileProxy(appContext, serviceListener, BluetoothProfile.HEADSET)
            }
        } catch (e: SecurityException) {
            BCOLogger.w("BluetoothController", "Profile proxy denied: ${e.message}")
        }
    }

    /**
     * Releases the A2DP proxy. Call from service [android.app.Service.onDestroy].
     */
    override fun release() {
        unregisterBtStateReceiver()
        val a2 = a2dp
        val hs = headset
        a2dp = null
        headset = null
        a2dpBindRequested = false
        headsetBindRequested = false
        headsetDisconnectMethod = null
        lastStableTargetAudioConnected = false
        holdTargetAudioConnectedUntilElapsed = 0L
        pendingMainActions.clear()
        if (a2 != null) {
            adapter?.closeProfileProxy(BluetoothProfile.A2DP, a2)
        }
        if (hs != null) {
            adapter?.closeProfileProxy(BluetoothProfile.HEADSET, hs)
        }
    }

    /**
     * Connect the persisted target device. Must run on main thread.
     * [reportBTProgress]: 1 in progress, 2 connected, 3 failed.
     * [done] runs after the attempt finishes (including when work was queued until A2DP binds).
     */
    @SuppressLint("MissingPermission")
    override fun connectTarget(done: (() -> Unit)?) {
        runWhenA2dpReady {
            var invokeDoneInFinally = true
            try {
                val connect = connectMethod
                val proxy = a2dp
                if (connect == null || proxy == null || !supportedFlag) {
                    lastErrorInternal = BluetoothA2dpActuator.ERROR_UNSUPPORTED
                    engineBridge.reportBTProgress(3)
                    return@runWhenA2dpReady
                }
                val address = prefs.targetBTAddress?.trim()?.takeIf { it.isNotEmpty() }
                if (address == null) {
                    lastErrorInternal = BluetoothA2dpActuator.ERROR_NO_TARGET
                    engineBridge.reportBTProgress(3)
                    return@runWhenA2dpReady
                }
                val device = try {
                    adapter?.getRemoteDevice(address)
                } catch (_: IllegalArgumentException) {
                    null
                }
                if (device == null) {
                    lastErrorInternal = BluetoothA2dpActuator.ERROR_BAD_ADDRESS
                    engineBridge.reportBTProgress(3)
                    return@runWhenA2dpReady
                }
                if (device.bondState != BluetoothDevice.BOND_BONDED) {
                    lastErrorInternal = BluetoothA2dpActuator.ERROR_NOT_BONDED
                    engineBridge.reportBTProgress(3)
                    return@runWhenA2dpReady
                }
                if (adapter?.isEnabled != true) {
                    lastErrorInternal = BluetoothA2dpActuator.ERROR_BLUETOOTH_OFF
                    engineBridge.reportBTProgress(3)
                    return@runWhenA2dpReady
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
                    ContextCompat.checkSelfPermission(appContext, Manifest.permission.BLUETOOTH_CONNECT) !=
                    PackageManager.PERMISSION_GRANTED
                ) {
                    lastErrorInternal = BluetoothA2dpActuator.ERROR_NO_BT_CONNECT_PERMISSION
                    engineBridge.reportBTProgress(3)
                    return@runWhenA2dpReady
                }

                fun completeConnectInvoke() {
                    try {
                        val ok = connect.invoke(proxy, device) as Boolean
                        if (ok) {
                            engineBridge.reportBTProgress(2)
                            lastErrorInternal = null
                        } else {
                            lastErrorInternal = BluetoothA2dpActuator.ERROR_CONNECT_RETURNED_FALSE
                            engineBridge.reportBTProgress(3)
                        }
                    } catch (e: ReflectiveOperationException) {
                        lastErrorInternal = e.message ?: e.javaClass.simpleName
                        supportedFlag = false
                        connectMethod = null
                        disconnectMethod = null
                        engineBridge.reportBTProgress(3)
                    } catch (e: RuntimeException) {
                        lastErrorInternal = e.message ?: e.javaClass.simpleName
                        engineBridge.reportBTProgress(3)
                    }
                }

                val hs = headset
                if (isTargetAudioConnected(proxy, hs, device)) {
                    if (!engineBridge.reportBTProgress(1)) {
                        lastErrorInternal = BluetoothA2dpActuator.ERROR_CORE_REJECTED
                        return@runWhenA2dpReady
                    }
                    val disconnect = disconnectMethod
                    if (disconnect == null) {
                        lastErrorInternal = BluetoothA2dpActuator.ERROR_UNSUPPORTED
                        engineBridge.reportBTProgress(3)
                        return@runWhenA2dpReady
                    }
                    try {
                        disconnectAudioProfiles(proxy, hs, device, disconnect)
                    } catch (e: ReflectiveOperationException) {
                        lastErrorInternal = e.message ?: e.javaClass.simpleName
                        supportedFlag = false
                        connectMethod = null
                        disconnectMethod = null
                        engineBridge.reportBTProgress(3)
                        return@runWhenA2dpReady
                    } catch (e: RuntimeException) {
                        lastErrorInternal = e.message ?: e.javaClass.simpleName
                        engineBridge.reportBTProgress(3)
                        return@runWhenA2dpReady
                    }
                    invokeDoneInFinally = false
                    scheduleDisconnectThenConnect(
                        a2dpProxy = proxy,
                        headsetProxy = hs,
                        device = device,
                        completeConnect = { completeConnectInvoke() },
                        done = done,
                    )
                    return@runWhenA2dpReady
                }

                if (!engineBridge.reportBTProgress(1)) {
                    lastErrorInternal = BluetoothA2dpActuator.ERROR_CORE_REJECTED
                    return@runWhenA2dpReady
                }
                completeConnectInvoke()
            } finally {
                if (invokeDoneInFinally) {
                    done?.invoke()
                }
            }
        }
    }

    /**
     * After hidden profile disconnects, polls on the main thread until A2DP and (if bound) HFP are
     * [BluetoothProfile.STATE_DISCONNECTED], then runs [completeConnect] and [done].
     */
    @SuppressLint("MissingPermission")
    private fun scheduleDisconnectThenConnect(
        a2dpProxy: BluetoothA2dp,
        headsetProxy: BluetoothHeadset?,
        device: BluetoothDevice,
        completeConnect: () -> Unit,
        done: (() -> Unit)?,
    ) {
        val handler = Handler(Looper.getMainLooper())
        val deadline = SystemClock.elapsedRealtime() + RECONNECT_DISCONNECT_TIMEOUT_MS
        var finishCalled = false
        fun finishOnce() {
            if (finishCalled) return
            finishCalled = true
            done?.invoke()
        }

        val poll = object : Runnable {
            override fun run() {
                if (finishCalled) return
                if (audioProfilesDisconnected(a2dpProxy, headsetProxy, device)) {
                    completeConnect()
                    finishOnce()
                } else if (SystemClock.elapsedRealtime() >= deadline) {
                    lastErrorInternal = BluetoothA2dpActuator.ERROR_RECONNECT_DISCONNECT_TIMEOUT
                    engineBridge.reportBTProgress(3)
                    finishOnce()
                } else {
                    handler.postDelayed(this, RECONNECT_POLL_MS)
                }
            }
        }
        handler.post(poll)
    }

    @SuppressLint("MissingPermission")
    private fun isTargetAudioConnected(
        a2dpProxy: BluetoothA2dp,
        headsetProxy: BluetoothHeadset?,
        device: BluetoothDevice,
    ): Boolean = try {
        if (a2dpProxy.getConnectionState(device) == BluetoothProfile.STATE_CONNECTED) true
        else headsetProxy != null &&
            headsetProxy.getConnectionState(device) == BluetoothProfile.STATE_CONNECTED
    } catch (_: SecurityException) {
        false
    }

    @SuppressLint("MissingPermission")
    private fun audioProfilesDisconnected(
        a2dpProxy: BluetoothA2dp,
        headsetProxy: BluetoothHeadset?,
        device: BluetoothDevice,
    ): Boolean = try {
        val a2 = a2dpProxy.getConnectionState(device) == BluetoothProfile.STATE_DISCONNECTED
        val h = headsetProxy == null ||
            headsetProxy.getConnectionState(device) == BluetoothProfile.STATE_DISCONNECTED
        a2 && h
    } catch (_: SecurityException) {
        true
    }

    @SuppressLint("MissingPermission")
    private fun disconnectAudioProfiles(
        a2dpProxy: BluetoothA2dp,
        headsetProxy: BluetoothHeadset?,
        device: BluetoothDevice,
        a2dpDisconnect: Method,
    ) {
        if (a2dpProxy.getConnectionState(device) == BluetoothProfile.STATE_CONNECTED) {
            BCOLogger.i("Bluetooth", "Disconnecting A2DP for ${device.address}")
            a2dpDisconnect.invoke(a2dpProxy, device)
        }
        val hDisc = headsetDisconnectMethod
        if (headsetProxy != null && hDisc != null &&
            headsetProxy.getConnectionState(device) == BluetoothProfile.STATE_CONNECTED
        ) {
            try {
                BCOLogger.i("Bluetooth", "Disconnecting HFP (headset) for ${device.address}")
                hDisc.invoke(headsetProxy, device)
            } catch (e: ReflectiveOperationException) {
                BCOLogger.w("Bluetooth", "HFP disconnect failed: ${e.message}")
            } catch (e: RuntimeException) {
                BCOLogger.w("Bluetooth", "HFP disconnect failed: ${e.message}")
            }
        }
    }

    private fun cacheHeadsetDisconnectMethod() {
        try {
            val clazz = BluetoothHeadset::class.java
            headsetDisconnectMethod = clazz.getDeclaredMethod("disconnect", BluetoothDevice::class.java)
                .apply { isAccessible = true }
        } catch (_: ReflectiveOperationException) {
            headsetDisconnectMethod = null
        }
    }

    /**
     * Whether the saved target has a stable audio link (A2DP and/or HFP) for core [hasBluetoothConnection].
     * Holds the previous value while profile state is transitional or the A2DP proxy is briefly absent.
     */
    @SuppressLint("MissingPermission")
    override fun isTargetA2dpConnected(): Boolean {
        val result = computeTargetA2dpConnected()
        _btConnectedState.value = result
        return result
    }

    @SuppressLint("MissingPermission")
    private fun computeTargetA2dpConnected(): Boolean {
        val address = prefs.targetBTAddress?.trim()?.takeIf { it.isNotEmpty() } ?: return false
        val device = try {
            adapter?.getRemoteDevice(address)
        } catch (_: IllegalArgumentException) {
            null
        } ?: return false
        if (adapter?.isEnabled != true) {
            lastStableTargetAudioConnected = false
            holdTargetAudioConnectedUntilElapsed = 0L
            return false
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
            ContextCompat.checkSelfPermission(appContext, Manifest.permission.BLUETOOTH_CONNECT) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            return lastStableTargetAudioConnected
        }

        val proxy = a2dp
        if (proxy == null) {
            val now = SystemClock.elapsedRealtime()
            if (lastStableTargetAudioConnected && now < holdTargetAudioConnectedUntilElapsed) {
                return true
            }
            return false
        }

        val raw = rawTargetAudioConnection(proxy, headset, device)
        when (raw) {
            RawTargetAudioConn.CONNECTED -> {
                lastStableTargetAudioConnected = true
                holdTargetAudioConnectedUntilElapsed = 0L
                return true
            }
            RawTargetAudioConn.DISCONNECTED -> {
                lastStableTargetAudioConnected = false
                holdTargetAudioConnectedUntilElapsed = 0L
                return false
            }
            RawTargetAudioConn.TRANSITIONAL -> return lastStableTargetAudioConnected
        }
    }

    private enum class RawTargetAudioConn {
        CONNECTED,
        DISCONNECTED,
        TRANSITIONAL,
    }

    @SuppressLint("MissingPermission")
    private fun rawTargetAudioConnection(
        a2dpProxy: BluetoothA2dp,
        headsetProxy: BluetoothHeadset?,
        device: BluetoothDevice,
    ): RawTargetAudioConn {
        val a2 = a2dpProxy.getConnectionState(device)
        val hs = headsetProxy?.getConnectionState(device)
        if (a2 == BluetoothProfile.STATE_CONNECTED || hs == BluetoothProfile.STATE_CONNECTED) {
            return RawTargetAudioConn.CONNECTED
        }
        if (a2 == BluetoothProfile.STATE_DISCONNECTED &&
            (hs == null || hs == BluetoothProfile.STATE_DISCONNECTED)
        ) {
            return RawTargetAudioConn.DISCONNECTED
        }
        return RawTargetAudioConn.TRANSITIONAL
    }

    /**
     * Disconnect the persisted target device. Must run on main thread.
     * Does not call [EngineBridge.reportBTProgress] (core lease applies to connect attempts per contract).
     * [done] runs after the attempt finishes (including when work was queued until A2DP binds).
     */
    @SuppressLint("MissingPermission")
    override fun disconnectTarget(done: (() -> Unit)?) {
        if (!hasBtConnectPermission()) {
            BCOLogger.w("BluetoothController", "disconnectTarget skipped — BLUETOOTH_CONNECT not granted")
            lastErrorInternal = BluetoothA2dpActuator.ERROR_NO_BT_CONNECT_PERMISSION
            done?.invoke()
            return
        }
        runWhenA2dpReady {
            try {
                val disconnect = disconnectMethod
                val proxy = a2dp
                if (disconnect == null || proxy == null || !supportedFlag) {
                    lastErrorInternal = BluetoothA2dpActuator.ERROR_UNSUPPORTED
                    return@runWhenA2dpReady
                }
                val address = prefs.targetBTAddress?.trim()?.takeIf { it.isNotEmpty() }
                if (address == null) {
                    lastErrorInternal = BluetoothA2dpActuator.ERROR_NO_TARGET
                    return@runWhenA2dpReady
                }
                val device = try {
                    adapter?.getRemoteDevice(address)
                } catch (_: IllegalArgumentException) {
                    null
                }
                if (device == null) {
                    lastErrorInternal = BluetoothA2dpActuator.ERROR_BAD_ADDRESS
                    return@runWhenA2dpReady
                }
                val hs = headset
                if (!isTargetAudioConnected(proxy, hs, device)) {
                    lastErrorInternal = null
                    return@runWhenA2dpReady
                }
                try {
                    disconnectAudioProfiles(proxy, hs, device, disconnect)
                    lastErrorInternal = null
                } catch (e: ReflectiveOperationException) {
                    lastErrorInternal = e.message ?: e.javaClass.simpleName
                    supportedFlag = false
                    connectMethod = null
                    disconnectMethod = null
                } catch (e: SecurityException) {
                    BCOLogger.w("BluetoothController", "disconnect SecurityException: ${e.message}")
                    lastErrorInternal = BluetoothA2dpActuator.ERROR_NO_BT_CONNECT_PERMISSION
                } catch (e: RuntimeException) {
                    lastErrorInternal = e.message ?: e.javaClass.simpleName
                }
            } finally {
                done?.invoke()
            }
        }
    }

    private fun runWhenA2dpReady(action: () -> Unit) {
        if (adapter == null) {
            action()
            return
        }
        if (a2dp != null) {
            action()
            return
        }
        pendingMainActions.addLast(action)
        requestProfileProxyIfNeeded()
    }

    private fun drainPending() {
        while (pendingMainActions.isNotEmpty()) {
            pendingMainActions.removeFirst().invoke()
        }
    }

    private fun cacheHiddenMethods() {
        try {
            val clazz = BluetoothA2dp::class.java
            val c = clazz.getDeclaredMethod("connect", BluetoothDevice::class.java).apply { isAccessible = true }
            val d = clazz.getDeclaredMethod("disconnect", BluetoothDevice::class.java).apply { isAccessible = true }
            connectMethod = c
            disconnectMethod = d
            supportedFlag = true
            lastErrorInternal = null
        } catch (_: ReflectiveOperationException) {
            connectMethod = null
            disconnectMethod = null
            supportedFlag = false
            lastErrorInternal = BluetoothA2dpActuator.ERROR_UNSUPPORTED
        }
    }

    private companion object {
        private const val RECONNECT_POLL_MS = 150L
        private const val RECONNECT_DISCONNECT_TIMEOUT_MS = 15_000L
        /** After [BluetoothProfile.A2DP] proxy disconnect, keep reporting connected briefly for core sync. */
        private const val PROXY_LOSS_HOLD_MS = 3_000L
    }
}
