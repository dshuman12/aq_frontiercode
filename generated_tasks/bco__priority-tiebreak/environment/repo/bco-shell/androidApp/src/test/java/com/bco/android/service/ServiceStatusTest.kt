package com.bco.android.service

import android.app.Application
import com.bco.android.R
import com.bco.android.core.BcoJson
import com.bco.android.core.FakeEngineBridge
import com.bco.android.core.LocalState
import com.bco.android.core.PeerState
import kotlinx.serialization.builtins.ListSerializer
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [33], application = Application::class)
class ServiceStatusTest {

    @Test
    fun audioState_toCoreAudioPriority_matchesDataModel() {
        assertEquals(0, AudioState.IDLE.toCoreAudioPriority())
        assertEquals(100, AudioState.MEDIA.toCoreAudioPriority())
        assertEquals(200, AudioState.INCOMING_CALL.toCoreAudioPriority())
        assertEquals(300, AudioState.ACTIVE_CALL.toCoreAudioPriority())
    }

    @Test
    fun snapshotServiceStatus_notReady_returnsDefaultsAndZeroEngineId() {
        val bridge = FakeEngineBridge(isReady = false, engineId = 42)
        bridge.peerStatesJson = peerArrayJson(1)
        bridge.localStateJson = localJson(audioPriority = 100, hasBt = true)

        val running = bridge.snapshotServiceStatus(running = true)
        assertEquals(true, running.running)
        assertEquals(AudioState.IDLE, running.audioState)
        assertEquals(false, running.btConnected)
        assertEquals(0, running.peerCount)
        assertEquals(0, running.engineId)
    }

    @Test
    fun snapshotServiceStatus_mapsLocalAudioBtPeersAndEngineId() {
        val bridge = FakeEngineBridge(isReady = true, engineId = 7)
        bridge.localStateJson = localJson(audioPriority = 200, hasBt = true)
        bridge.peerStatesJson = peerArrayJson(3)

        val snap = bridge.snapshotServiceStatus(running = false)
        assertEquals(false, snap.running)
        assertEquals(AudioState.INCOMING_CALL, snap.audioState)
        assertEquals(true, snap.btConnected)
        assertEquals(true, snap.coreBtConnected)
        assertNull(snap.platformObservedBtConnected)
        assertEquals(3, snap.peerCount)
        assertEquals(7, snap.engineId)
    }

    @Test
    fun serviceStatus_canExposePlatformBtOverrideSeparatelyFromCoreBt() {
        val fromCore = ServiceStatus(
            running = true,
            btConnected = false,
            coreBtConnected = false,
        )

        val platformObserved = fromCore.copy(
            btConnected = true,
            platformObservedBtConnected = true,
        )

        assertEquals(false, platformObserved.coreBtConnected)
        assertEquals(true, platformObserved.platformObservedBtConnected)
        assertEquals(true, platformObserved.btConnected)
    }

    @Test
    fun snapshotServiceStatus_invalidPeerJson_yieldsZeroPeerCount() {
        val bridge = FakeEngineBridge(isReady = true, engineId = 1)
        bridge.localStateJson = localJson(audioPriority = 0, hasBt = false)
        bridge.peerStatesJson = "{not a peer array"

        val snap = bridge.snapshotServiceStatus(running = true)
        assertEquals(0, snap.peerCount)
        assertEquals(AudioState.IDLE, snap.audioState)
    }

    @Test
    fun snapshotServiceStatus_invalidLocalJson_fallsBackToIdleAndDisconnected() {
        val bridge = FakeEngineBridge(isReady = true, engineId = 2)
        bridge.localStateJson = "{"
        bridge.peerStatesJson = peerArrayJson(1)

        val snap = bridge.snapshotServiceStatus(running = true)
        assertEquals(AudioState.IDLE, snap.audioState)
        assertEquals(false, snap.btConnected)
        assertEquals(1, snap.peerCount)
    }

    @Test
    fun snapshotServiceStatus_localAudioPriorityMapsToAudioState() {
        val bridge = FakeEngineBridge(isReady = true, engineId = 1)
        bridge.peerStatesJson = "[]"

        bridge.localStateJson = localJson(100, false)
        assertEquals(AudioState.MEDIA, bridge.snapshotServiceStatus(running = true).audioState)

        bridge.localStateJson = localJson(300, false)
        assertEquals(AudioState.ACTIVE_CALL, bridge.snapshotServiceStatus(running = true).audioState)

        bridge.localStateJson = localJson(999, false)
        assertEquals(AudioState.IDLE, bridge.snapshotServiceStatus(running = true).audioState)
    }

    @Test
    fun serviceStatus_copyOverridesTargetFields() {
        val base = ServiceStatus(
            running = false,
            audioState = AudioState.MEDIA,
            btConnected = true,
            peerCount = 2,
            engineId = 5,
            btActionError = "err",
        )
        val copied = base.copy(running = true, peerCount = 9, btActionError = null)
        assertEquals(true, copied.running)
        assertEquals(AudioState.MEDIA, copied.audioState)
        assertEquals(true, copied.btConnected)
        assertEquals(9, copied.peerCount)
        assertEquals(5, copied.engineId)
        assertNull(copied.btActionError)
    }

    @Test
    fun serviceStatus_equalityByDataClassSemantics() {
        val a = ServiceStatus(running = true, peerCount = 1, engineId = 3)
        val b = ServiceStatus(running = true, peerCount = 1, engineId = 3)
        val c = ServiceStatus(running = false, peerCount = 1, engineId = 3)
        assertEquals(a, b)
        assertEquals(a.hashCode(), b.hashCode())
        assertNotEquals(a, c)
    }

    @Test
    fun toForegroundTemplate_usesStringsAndSummaryRules() {
        val context = RuntimeEnvironment.getApplication()

        val stopped = ServiceStatus(running = false, audioState = AudioState.IDLE, btConnected = false, peerCount = 0)
        val stoppedTpl = stopped.toForegroundTemplate(context)
        assertEquals(context.getString(R.string.audio_state_idle), stoppedTpl.audioState)
        assertEquals(context.getString(R.string.bt_state_disconnected), stoppedTpl.bluetoothStatus)
        assertEquals("0", stoppedTpl.peerSummary)
        assertEquals(context.getString(R.string.notification_foreground_text_placeholder), stoppedTpl.statusLine)

        val running = ServiceStatus(running = true, audioState = AudioState.MEDIA, btConnected = true, peerCount = 4)
        val runningTpl = running.toForegroundTemplate(context)
        assertEquals(context.getString(R.string.audio_state_media), runningTpl.audioState)
        assertEquals(context.getString(R.string.bt_state_connected), runningTpl.bluetoothStatus)
        assertEquals("4", runningTpl.peerSummary)
        assertEquals(context.getString(R.string.notification_status_summary_running, 4), runningTpl.statusLine)

        val withError = running.copy(btActionError = "BT failed")
        assertEquals("BT failed", withError.toForegroundTemplate(context).statusLine)
    }
}

private fun localJson(audioPriority: Int, hasBt: Boolean): String {
    val state = LocalState(
        deviceId = "d",
        deviceName = "n",
        audioPriority = audioPriority,
        hasBluetoothConnection = hasBt,
        paused = false,
        multiaddr = "",
    )
    return BcoJson.encodeToString(LocalState.serializer(), state)
}

private fun peerArrayJson(count: Int): String {
    val peers = List(count) { i ->
        PeerState(
            deviceId = "id$i",
            deviceName = "n$i",
            audioPriority = 0,
            hasBluetoothConnection = false,
            platform = "android",
            paused = false,
        )
    }
    return BcoJson.encodeToString(ListSerializer(PeerState.serializer()), peers)
}
