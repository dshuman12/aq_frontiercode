package com.bco.android.core

import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class CoreJsonModelsTest {

    @Test
    fun engineEvent_roundTrip() {
        val original = EngineEvent(
            type = "PAIRING_REQUEST",
            peerName = "Alice",
            peerId = "peer-1",
            reason = "user",
            compareCode = "1234",
            fingerprint = "ab:cd",
        )
        val json = BcoJson.encodeToString(EngineEvent.serializer(), original)
        assertEquals(original, BcoJson.decodeFromString(EngineEvent.serializer(), json))
    }

    @Test
    fun peerState_roundTrip() {
        val original = PeerState(
            deviceId = "did",
            deviceName = "Phone",
            audioPriority = 2,
            hasBluetoothConnection = true,
            platform = "android",
            paused = false,
        )
        val json = BcoJson.encodeToString(PeerState.serializer(), original)
        assertEquals(original, BcoJson.decodeFromString(PeerState.serializer(), json))
    }

    @Test
    fun localState_roundTrip() {
        val original = LocalState(
            deviceId = "self",
            deviceName = "Me",
            audioPriority = 0,
            hasBluetoothConnection = false,
            paused = true,
            multiaddr = "/ip4/127.0.0.1/tcp/4001",
        )
        val json = BcoJson.encodeToString(LocalState.serializer(), original)
        assertEquals(original, BcoJson.decodeFromString(LocalState.serializer(), json))
    }

    @Test
    fun localState_decodesGoCoreShape() {
        // Mirrors `localStateDoc` from bco-core/capi.go: no `multiaddr` field, but a
        // `listenMultiaddrs` array plus DeviceState/headset fields. Without nullable
        // back-compat fields here, decoding silently fails and the UI shows
        // local.hasBT=null even when the engine knows the answer.
        val goJson = """
            {
              "deviceId": "12D3KooWLocal",
              "deviceName": "Phone",
              "audioPriority": 100,
              "seq": 7,
              "hasBluetoothConnection": true,
              "platform": "go-core",
              "paused": false,
              "coreVersion": "2.3.0",
              "targetHeadsetAddr": "78-c1-1d-46-28-b4",
              "targetHeadsetName": "Buds4 Pro",
              "headsetSelectedAt": 1776527982936,
              "headsetDisplayName": "Buds4 Pro",
              "listenMultiaddrs": ["/ip4/192.168.1.5/tcp/4001/p2p/12D3KooWLocal"]
            }
        """.trimIndent()
        val ls = BcoJson.decodeFromString(LocalState.serializer(), goJson)
        assertEquals("12D3KooWLocal", ls.deviceId)
        assertEquals(100, ls.audioPriority)
        assertEquals(true, ls.hasBluetoothConnection)
        assertEquals("78-c1-1d-46-28-b4", ls.targetHeadsetAddr)
        assertEquals(1776527982936L, ls.headsetSelectedAt)
        assertNull(ls.multiaddr)
        assertEquals(
            "/ip4/192.168.1.5/tcp/4001/p2p/12D3KooWLocal",
            ls.preferredMultiaddr,
        )
    }

    @Test
    fun localState_preferredMultiaddrFallsBackToLegacyField() {
        val ls = LocalState(
            deviceId = "d",
            deviceName = "n",
            audioPriority = 0,
            hasBluetoothConnection = false,
            paused = false,
            multiaddr = "/ip4/10.0.0.1/tcp/4001",
        )
        assertNotNull(ls.preferredMultiaddr)
        assertEquals("/ip4/10.0.0.1/tcp/4001", ls.preferredMultiaddr)
    }

    @Test
    fun peerEntry_roundTrip() {
        val original = PeerEntry(
            deviceId = "other",
            deviceName = "Peer",
            platform = "macos",
            audioPriority = 1,
            hasBluetoothConnection = true,
            paused = false,
            connected = true,
        )
        val json = BcoJson.encodeToString(PeerEntry.serializer(), original)
        assertEquals(original, BcoJson.decodeFromString(PeerEntry.serializer(), json))
    }

    @Test
    fun pairingRequest_roundTrip() {
        val original = PairingRequest(
            peerName = "Bob",
            peerId = "pid",
            compareCode = "9999",
            fingerprint = "ff:ee",
        )
        val json = BcoJson.encodeToString(PairingRequest.serializer(), original)
        assertEquals(original, BcoJson.decodeFromString(PairingRequest.serializer(), json))
    }

    @Test
    fun ignoreUnknownKeys_extraFieldsDecode() {
        val withExtra = """
            {
              "type": "STATUS",
              "peerName": "x",
              "futureField": 42,
              "nested": { "ignored": true }
            }
        """.trimIndent()
        val e = BcoJson.decodeFromString(EngineEvent.serializer(), withExtra)
        assertEquals("STATUS", e.type)
        assertEquals("x", e.peerName)

        val localWithExtra = """
            {
              "deviceId": "d",
              "deviceName": "n",
              "audioPriority": 0,
              "hasBluetoothConnection": false,
              "paused": false,
              "multiaddr": "/m",
              "schemaVersion": 99
            }
        """.trimIndent()
        val ls = BcoJson.decodeFromString(LocalState.serializer(), localWithExtra)
        assertEquals(
            LocalState(
                deviceId = "d",
                deviceName = "n",
                audioPriority = 0,
                hasBluetoothConnection = false,
                paused = false,
                multiaddr = "/m",
                headsetDisplayName = null,
            ),
            ls,
        )

        val listJson = """
            [{"deviceId":"a","deviceName":"A","platform":"p","audioPriority":0,
              "hasBluetoothConnection":false,"paused":false,"connected":false,"extra":"y"}]
        """.trimIndent()
        val entries = BcoJson.decodeFromString(ListSerializer(PeerEntry.serializer()), listJson)
        assertEquals(1, entries.size)
        assertEquals("a", entries[0].deviceId)
    }

    @Test
    fun toPairingRequestOrNull_wrongType_returnsNull() {
        assertNull(
            EngineEvent(type = "CONNECT_BT", peerName = "n", peerId = "p", compareCode = "c", fingerprint = "f")
                .toPairingRequestOrNull(),
        )
    }

    @Test
    fun toPairingRequestOrNull_missingAnyRequiredField_returnsNull() {
        assertNull(
            EngineEvent(
                type = "PAIRING_REQUEST",
                peerId = "p",
                compareCode = "c",
                fingerprint = "f",
            ).toPairingRequestOrNull(),
        )
        assertNull(
            EngineEvent(
                type = "PAIRING_REQUEST",
                peerName = "n",
                compareCode = "c",
                fingerprint = "f",
            ).toPairingRequestOrNull(),
        )
        assertNull(
            EngineEvent(
                type = "PAIRING_REQUEST",
                peerName = "n",
                peerId = "p",
                fingerprint = "f",
            ).toPairingRequestOrNull(),
        )
        assertNull(
            EngineEvent(
                type = "PAIRING_REQUEST",
                peerName = "n",
                peerId = "p",
                compareCode = "c",
            ).toPairingRequestOrNull(),
        )
    }

    @Test
    fun toPairingRequestOrNull_allFieldsPresent_returnsPairingRequest() {
        val event = EngineEvent(
            type = "PAIRING_REQUEST",
            peerName = "Alice",
            peerId = "peer-42",
            reason = "ignored",
            compareCode = "4242",
            fingerprint = "aa:bb",
        )
        assertEquals(
            PairingRequest("Alice", "peer-42", "4242", "aa:bb"),
            event.toPairingRequestOrNull(),
        )
    }
}
