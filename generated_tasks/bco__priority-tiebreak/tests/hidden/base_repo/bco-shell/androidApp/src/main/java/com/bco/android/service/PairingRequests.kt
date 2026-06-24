package com.bco.android.service

import com.bco.android.core.PairingRequest

internal fun removeWithdrawnPairingRequest(
    current: List<PairingRequest>,
    peerId: String,
): List<PairingRequest> {
    val id = peerId.trim().takeIf { it.isNotEmpty() } ?: return current
    return current.filter { it.peerId != id }
}
