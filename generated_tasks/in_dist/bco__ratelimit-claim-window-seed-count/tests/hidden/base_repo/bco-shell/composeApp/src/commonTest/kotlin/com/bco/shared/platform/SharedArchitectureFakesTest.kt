package com.bco.shared.platform

import com.bco.shared.model.ConnectionState
import com.bco.shared.model.PeerPlatform
import com.bco.shared.model.ServiceUiState
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class SharedArchitectureFakesTest {
    @Test
    fun fakeAppServiceBridgeCanBeUsedThroughNarrowDomains() {
        val fake = FakeAppServiceBridge()
        val dashboard: DashboardAppService = fake
        val settings: SettingsAppService = fake
        val pairing: PairingAppService = fake

        fake.updateServiceUiState(
            ServiceUiState(
                serviceRunning = true,
                connectionState = ConnectionState.Connected,
            ),
        )
        dashboard.bumpPeerListRefreshEpoch()
        settings.updateNetworkSettingFromUi("switchCooldownMs", 1500)
        pairing.approvePeer("peer-1")

        assertTrue(dashboard.serviceUiState.value.serviceRunning)
        assertEquals(1, dashboard.peerListRefreshEpoch.value)
        assertEquals(listOf("switchCooldownMs" to 1500), fake.networkIntSettingUpdates)
        assertEquals(listOf("peer-1"), fake.approvedPeerIds)
    }

    @Test
    fun fakePlatformShellBridgeCanExerciseEngineEventsWithoutNativeAdapters() = runTest {
        val bridge = FakePlatformShellBridge()

        bridge.handleEnginePayloadForTest("""{"type":"CONNECT_BT"}""")
        bridge.handleEnginePayloadForTest("""{"type":"DISCONNECT_BT"}""")

        assertEquals(1, bridge.connectBluetoothCalls)
        assertEquals(1, bridge.disconnectBluetoothCalls)
        assertEquals(2, bridge.refreshStatusCalls)
    }

    @Test
    fun peerPlatformHeuristicDoesNotClassifyIosAsMacOs() {
        assertEquals(PeerPlatform.Unknown, "ios".toPeerPlatformHeuristic())
        assertEquals(PeerPlatform.MacOS, "darwin".toPeerPlatformHeuristic())
    }
}
