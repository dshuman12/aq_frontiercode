package com.bco.shared.ui.navigation

import kotlinx.serialization.Serializable

/**
 * Bottom navigation destinations for [MainAppScaffold] / NavHost.
 *
 * Contract: [specs/007-android-ui-parity/contracts/android-ui-navigation.md].
 */
@Serializable
sealed class BCORoute(val route: String) {
    @Serializable
    data object Dashboard : BCORoute("dashboard")

    @Serializable
    data object Devices : BCORoute("devices")

    @Serializable
    data object Upgrade : BCORoute("upgrade")

    @Serializable
    data object Settings : BCORoute("settings")
}
