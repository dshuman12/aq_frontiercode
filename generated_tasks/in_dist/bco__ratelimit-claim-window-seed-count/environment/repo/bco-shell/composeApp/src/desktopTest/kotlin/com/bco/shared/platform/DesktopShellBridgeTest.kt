package com.bco.shared.platform

import kotlinx.coroutines.test.runTest
import java.nio.file.Files
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class DesktopShellBridgeTest {
    @Test
    fun connectBluetooth_withoutTargetReportsFailureAndRefreshesState() = runTest {
        val engine = FakeEngineBridge()
        val helper = FakeDesktopBluetoothHelperClient()
        var refreshCalls = 0
        val bridge = DesktopShellBridge(
            engine = engine,
            connectBluetoothTarget = helper::connect,
            disconnectBluetoothTarget = helper::disconnect,
            preferences = DesktopPreferencesProvider(Files.createTempFile("bco-desktop-prefs", ".properties")).apply {
                targetBTAddress = "  "
            },
            refreshStatusBlock = { refreshCalls += 1 },
            onPeerListAffectingEventBlock = {},
            handlePlatformEventBlock = {},
        )

        bridge.connectBluetooth()

        assertEquals(emptyList(), helper.connectAddresses)
        assertTrue(engine.invocations.contains(FakeEngineBridge.Invocation("reportBTProgress", listOf(3))))
        assertTrue(engine.invocations.any { it.method == "sendStateUpdate" })
        assertEquals(1, refreshCalls)
    }

    @Test
    fun disconnectBluetooth_withoutTargetSkipsHelperAndRefreshesState() = runTest {
        val engine = FakeEngineBridge()
        val helper = FakeDesktopBluetoothHelperClient()
        var refreshCalls = 0
        val bridge = DesktopShellBridge(
            engine = engine,
            connectBluetoothTarget = helper::connect,
            disconnectBluetoothTarget = helper::disconnect,
            preferences = DesktopPreferencesProvider(Files.createTempFile("bco-desktop-prefs", ".properties")),
            refreshStatusBlock = { refreshCalls += 1 },
            onPeerListAffectingEventBlock = {},
            handlePlatformEventBlock = {},
        )

        bridge.disconnectBluetooth()

        assertEquals(emptyList(), helper.disconnectAddresses)
        assertTrue(engine.invocations.any { it.method == "sendStateUpdate" })
        assertEquals(1, refreshCalls)
    }

    private class FakeDesktopBluetoothHelperClient {
        val connectAddresses = mutableListOf<String>()
        val disconnectAddresses = mutableListOf<String>()

        suspend fun connect(address: String): HelperOperationResult {
            connectAddresses += address
            return HelperOperationResult(code = "success")
        }

        suspend fun disconnect(address: String): HelperOperationResult {
            disconnectAddresses += address
            return HelperOperationResult(code = "success")
        }
    }
}
