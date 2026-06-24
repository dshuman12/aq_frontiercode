package com.bco.android.network

import android.content.Context
import android.net.wifi.WifiManager

/**
 * Acquires [WifiManager.createMulticastLock] while the reference count is positive (US8 T046).
 * Wired from [com.bco.android.service.BCOService] in T047.
 */
class MulticastLockManager(context: Context) {
    private val appContext = context.applicationContext
    private val wifiManager =
        requireNotNull(appContext.getSystemService(WifiManager::class.java)) {
            "WifiManager required for multicast mDNS"
        }

    private val multicastLock =
        wifiManager.createMulticastLock(TAG).apply {
            setReferenceCounted(false)
        }

    private val monitor = Any()
    private var refCount: Int = 0

    /** Increments the reference count; acquires the multicast lock when count becomes positive. */
    fun acquire() {
        synchronized(monitor) {
            if (refCount == 0) {
                multicastLock.acquire()
            }
            refCount++
        }
    }

    /**
     * Decrements the reference count; releases the multicast lock when count reaches zero.
     * Extra [release] calls when count is already zero are ignored.
     */
    fun release() {
        synchronized(monitor) {
            if (refCount == 0) return
            refCount--
            if (refCount == 0) {
                multicastLock.release()
            }
        }
    }

    /** Drops the reference count to zero and releases the lock if it was held. */
    fun shutdown() {
        synchronized(monitor) {
            if (refCount == 0) return
            refCount = 0
            multicastLock.release()
        }
    }

    companion object {
        private const val TAG = "bco_mdns"
    }
}
