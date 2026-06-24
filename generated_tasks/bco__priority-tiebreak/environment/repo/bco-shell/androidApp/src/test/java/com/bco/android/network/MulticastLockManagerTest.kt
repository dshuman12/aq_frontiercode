package com.bco.android.network

import android.app.Application
import android.content.Context
import android.net.wifi.WifiManager
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [33], application = Application::class)
class MulticastLockManagerTest {

    private lateinit var context: Context

    @Before
    fun setup() {
        context = ApplicationProvider.getApplicationContext()
    }

    private fun activeLockCount(): Int {
        val wifi = context.getSystemService(WifiManager::class.java)!!
        return shadowOf(wifi).activeLockCount
    }

    @Test
    fun acquire_firstCallHoldsLock_secondDoesNotDoubleAcquire() {
        val mgr = MulticastLockManager(context)
        assertEquals(0, activeLockCount())

        mgr.acquire()
        assertEquals(1, activeLockCount())

        mgr.acquire()
        assertEquals(1, activeLockCount())
    }

    @Test
    fun release_whenRefReachesZero_releasesLock() {
        val mgr = MulticastLockManager(context)
        mgr.acquire()
        mgr.acquire()
        assertEquals(1, activeLockCount())

        mgr.release()
        assertEquals(1, activeLockCount())

        mgr.release()
        assertEquals(0, activeLockCount())
    }

    @Test
    fun release_whenAlreadyZero_isIgnored() {
        val mgr = MulticastLockManager(context)
        mgr.release()
        mgr.release()
        assertEquals(0, activeLockCount())
    }

    @Test
    fun shutdown_clearsRefAndReleasesLock() {
        val mgr = MulticastLockManager(context)
        mgr.acquire()
        mgr.acquire()
        assertEquals(1, activeLockCount())

        mgr.shutdown()
        assertEquals(0, activeLockCount())

        mgr.release()
        assertEquals(0, activeLockCount())
    }
}
