package com.bco.android.network

import android.app.Application
import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.NetworkInfo
import android.os.Handler
import android.os.Looper
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.shadows.ShadowLooper
import org.robolectric.shadows.ShadowNetworkCapabilities
import org.robolectric.shadows.ShadowNetworkInfo

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [33], application = Application::class)
class NetworkMonitorTest {

    private lateinit var context: Context
    private lateinit var connectivityManager: ConnectivityManager
    private val mainHandler = Handler(Looper.getMainLooper())

    @Before
    fun setup() {
        context = ApplicationProvider.getApplicationContext()
        connectivityManager =
            context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val wifiInfo =
            ShadowNetworkInfo.newInstance(
                NetworkInfo.DetailedState.CONNECTED,
                ConnectivityManager.TYPE_WIFI,
                0,
                true,
                true,
            )
        shadowOf(connectivityManager).setActiveNetworkInfo(wifiInfo)
    }

    private fun wifiNetwork() = connectivityManager.activeNetwork!!

    private fun setWifiCapabilities(
        internet: Boolean,
        validated: Boolean,
    ) {
        val caps = ShadowNetworkCapabilities.newInstance()
        val shadowCaps = shadowOf(caps)
        shadowCaps.addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
        if (internet) {
            shadowCaps.addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        }
        if (validated) {
            shadowCaps.addCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
        }
        shadowOf(connectivityManager).setNetworkCapabilities(wifiNetwork(), caps)
    }

    private fun idleMain() {
        ShadowLooper.shadowMainLooper().idle()
    }

    @Test
    fun start_isIdempotent_singleCallbackRegistration() {
        val monitor =
            NetworkMonitor(
                context,
                mainHandler = mainHandler,
                debounceMs = 0L,
            )
        monitor.start()
        monitor.start()
        assertEquals(1, shadowOf(connectivityManager).networkCallbacks.size)
        monitor.stop()
    }

    @Test
    fun stop_isIdempotent() {
        val monitor =
            NetworkMonitor(
                context,
                mainHandler = mainHandler,
                debounceMs = 0L,
            )
        monitor.start()
        monitor.stop()
        monitor.stop()
        assertTrue(shadowOf(connectivityManager).networkCallbacks.isEmpty())
    }

    @Test
    fun listenerNull_networkChange_doesNotThrow() {
        val monitor =
            NetworkMonitor(
                context,
                mainHandler = mainHandler,
                debounceMs = 0L,
            )
        monitor.listener = null
        monitor.start()
        setWifiCapabilities(internet = true, validated = true)
        shadowOf(connectivityManager).setDefaultNetworkActive(true)
        idleMain()
        shadowOf(connectivityManager).setDefaultNetworkActive(false)
        idleMain()
        monitor.stop()
    }

    @Test
    fun defaultNetworkAvailable_deliversSnapshot_connectedAndValidated() {
        setWifiCapabilities(internet = true, validated = true)
        val delivered = mutableListOf<NetworkSnapshot>()
        val monitor =
            NetworkMonitor(
                context,
                mainHandler = mainHandler,
                debounceMs = 0L,
            )
        monitor.listener = NetworkChangeListener { delivered.add(it) }
        monitor.start()
        shadowOf(connectivityManager).setDefaultNetworkActive(true)
        idleMain()

        assertEquals(1, delivered.size)
        assertEquals(
            NetworkSnapshot(isDefaultNetworkConnected = true, hasValidatedInternet = true),
            delivered.single(),
        )
        monitor.stop()
    }

    @Test
    fun defaultNetworkLost_deliversSnapshot_disconnected() {
        setWifiCapabilities(internet = true, validated = true)
        val delivered = mutableListOf<NetworkSnapshot>()
        val monitor =
            NetworkMonitor(
                context,
                mainHandler = mainHandler,
                debounceMs = 0L,
            )
        monitor.listener = NetworkChangeListener { delivered.add(it) }
        monitor.start()
        shadowOf(connectivityManager).setDefaultNetworkActive(true)
        idleMain()
        delivered.clear()

        shadowOf(connectivityManager).setDefaultNetworkActive(false)
        idleMain()

        assertEquals(1, delivered.size)
        assertEquals(
            NetworkSnapshot(isDefaultNetworkConnected = false, hasValidatedInternet = false),
            delivered.single(),
        )
        monitor.stop()
    }

    @Test
    fun capabilitiesWithoutValidated_deliversSnapshot_connectedButNotValidated() {
        setWifiCapabilities(internet = true, validated = false)
        val delivered = mutableListOf<NetworkSnapshot>()
        val monitor =
            NetworkMonitor(
                context,
                mainHandler = mainHandler,
                debounceMs = 0L,
            )
        monitor.listener = NetworkChangeListener { delivered.add(it) }
        monitor.start()
        shadowOf(connectivityManager).setDefaultNetworkActive(true)
        idleMain()

        assertEquals(1, delivered.size)
        assertEquals(
            NetworkSnapshot(isDefaultNetworkConnected = true, hasValidatedInternet = false),
            delivered.single(),
        )
        monitor.stop()
    }

    @Test
    fun stop_clearsLastDelivered_nextStartCanNotifyAgain() {
        setWifiCapabilities(internet = true, validated = true)
        val delivered = mutableListOf<NetworkSnapshot>()
        val monitor =
            NetworkMonitor(
                context,
                mainHandler = mainHandler,
                debounceMs = 0L,
            )
        monitor.listener = NetworkChangeListener { delivered.add(it) }
        monitor.start()
        shadowOf(connectivityManager).setDefaultNetworkActive(true)
        idleMain()
        assertEquals(1, delivered.size)

        monitor.stop()
        monitor.start()
        shadowOf(connectivityManager).setDefaultNetworkActive(true)
        idleMain()
        assertEquals(2, delivered.size)
        assertEquals(
            NetworkSnapshot(isDefaultNetworkConnected = true, hasValidatedInternet = true),
            delivered.last(),
        )
        monitor.stop()
    }
}
