@file:Suppress("unused")

package com.bco.android.core

import com.bco.shared.model.toPairingRequestOrNull as sharedToPairingRequestOrNull

typealias HeadsetConfig = com.bco.shared.model.HeadsetConfig
typealias EngineEvent = com.bco.shared.model.EngineEvent
typealias PeerState = com.bco.shared.model.PeerState
typealias LocalState = com.bco.shared.model.LocalState
typealias PeerEntry = com.bco.shared.model.PeerEntry
typealias PairingRequest = com.bco.shared.model.PairingRequest
typealias SwitchEvent = com.bco.shared.model.SwitchEvent
typealias ActivityEventUi = com.bco.shared.model.ActivityEventUi
typealias ConnectionState = com.bco.shared.model.ConnectionState
typealias AudioState = com.bco.shared.model.AudioState
typealias PeerPlatform = com.bco.shared.model.PeerPlatform
typealias SubscriptionTier = com.bco.shared.model.SubscriptionTier
typealias SubscriptionPlan = com.bco.shared.model.SubscriptionPlan
typealias PeerUiState = com.bco.shared.model.PeerUiState
typealias ServiceUiState = com.bco.shared.model.ServiceUiState

val BcoJson = com.bco.shared.model.BcoJson
const val SubscriptionUnlimited = com.bco.shared.model.SubscriptionUnlimited
val FreeSubscriptionPlan = com.bco.shared.model.FreeSubscriptionPlan
val ProSubscriptionPlan = com.bco.shared.model.ProSubscriptionPlan
val PremiumSubscriptionPlan = com.bco.shared.model.PremiumSubscriptionPlan
val DefaultEffectiveSubscriptionPlan = com.bco.shared.model.DefaultEffectiveSubscriptionPlan

fun EngineEvent.toPairingRequestOrNull(): PairingRequest? = sharedToPairingRequestOrNull()
