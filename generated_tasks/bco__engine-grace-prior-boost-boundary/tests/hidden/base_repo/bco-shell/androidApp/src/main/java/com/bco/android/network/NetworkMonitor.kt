package com.bco.android.network

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.os.Handler
import android.os.Looper

/**
 * Observes the process default network via [ConnectivityManager.registerDefaultNetworkCallback].
 * Rapid [ConnectivityManager.NetworkCallback] updates are debounced on the main thread before
 * invoking [NetworkChangeListener] (US8 T045; wired from [com.bco.android.service.BCOService] in T047).
 */
class NetworkMonitor(
    context: Context,
    private val mainHandler: Handler = Handler(Looper.getMainLooper()),
    private val debounceMs: Long = 300L,
) {
    private val appContext = context.applicationContext
    private val connectivityManager =
        appContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

    /** Invoked on the main thread after connectivity settles; null until set by the service. */
    var listener: NetworkChangeListener? = null

    private var defaultNetwork: Network? = null
    private var hasValidatedInternet: Boolean = false

    private var lastDelivered: NetworkSnapshot? = null
    private var started: Boolean = false

    private val debouncedDeliver = Runnable { deliverSnapshotIfChanged() }

    private val callback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            defaultNetwork = network
            refreshValidatedFromCapabilities(network)
            scheduleDebouncedNotify()
        }

        override fun onLost(network: Network) {
            if (network == defaultNetwork) {
                defaultNetwork = null
                hasValidatedInternet = false
            }
            scheduleDebouncedNotify()
        }

        override fun onCapabilitiesChanged(network: Network, networkCapabilities: NetworkCapabilities) {
            if (network == defaultNetwork) {
                hasValidatedInternet = hasInternetAndValidated(networkCapabilities)
            }
            scheduleDebouncedNotify()
        }
    }

    private fun refreshValidatedFromCapabilities(network: Network) {
        val caps = connectivityManager.getNetworkCapabilities(network)
        hasValidatedInternet = caps != null && hasInternetAndValidated(caps)
    }

    private fun hasInternetAndValidated(caps: NetworkCapabilities): Boolean =
        caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)

    fun start() {
        if (started) return
        started = true
        connectivityManager.registerDefaultNetworkCallback(callback, mainHandler)
    }

    fun stop() {
        if (!started) return
        started = false
        mainHandler.removeCallbacks(debouncedDeliver)
        connectivityManager.unregisterNetworkCallback(callback)
        defaultNetwork = null
        hasValidatedInternet = false
        lastDelivered = null
    }

    private fun currentSnapshot(): NetworkSnapshot =
        NetworkSnapshot(
            isDefaultNetworkConnected = defaultNetwork != null,
            hasValidatedInternet = hasValidatedInternet,
        )

    private fun scheduleDebouncedNotify() {
        mainHandler.removeCallbacks(debouncedDeliver)
        mainHandler.postDelayed(debouncedDeliver, debounceMs)
    }

    private fun deliverSnapshotIfChanged() {
        val snapshot = currentSnapshot()
        if (snapshot == lastDelivered) return
        lastDelivered = snapshot
        listener?.onNetworkSignificantChange(snapshot)
    }
}

data class NetworkSnapshot(
    val isDefaultNetworkConnected: Boolean,
    val hasValidatedInternet: Boolean,
)

fun interface NetworkChangeListener {
    fun onNetworkSignificantChange(snapshot: NetworkSnapshot)
}
