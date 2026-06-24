package com.bco.android.service

import com.bco.android.core.PairingRequest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Test

class PairingRequestsTest {
    @Test
    fun removeWithdrawnPairingRequest_removesOnlyMatchingPeer() {
        val alice = PairingRequest("Alice", "peer-a", "1234", "aa")
        val bob = PairingRequest("Bob", "peer-b", "5678", "bb")

        assertEquals(
            listOf(bob),
            removeWithdrawnPairingRequest(listOf(alice, bob), " peer-a "),
        )
    }

    @Test
    fun removeWithdrawnPairingRequest_blankPeerIdKeepsCurrentList() {
        val current = listOf(PairingRequest("Alice", "peer-a", "1234", "aa"))

        assertSame(current, removeWithdrawnPairingRequest(current, "  "))
    }
}
