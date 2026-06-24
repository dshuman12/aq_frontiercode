package com.bco.shared.platform

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

@Serializable
internal data class HelperEnvelope(
    val kind: String,
    val type: String,
    val id: String? = null,
    val success: Boolean? = null,
    val error: String? = null,
    val payload: JsonElement? = null,
)

@Serializable
internal data class HelperTargetDevice(
    val address: String? = null,
    val name: String? = null,
)

@Serializable
internal data class HelperBluetoothDevice(
    val name: String,
    val address: String,
    val majorClass: Int,
    val isConnected: Boolean = false,
    val isLeOnly: Boolean = false,
    val iconKind: String = "Headphones",
)

@Serializable
internal data class HelperAudioState(
    val priority: Int,
    val hasBluetooth: Boolean,
)

@Serializable
internal data class HelperStringValue(
    val value: String? = null,
)

@Serializable
internal data class HelperOperationResult(
    val code: String? = null,
    val message: String? = null,
)
