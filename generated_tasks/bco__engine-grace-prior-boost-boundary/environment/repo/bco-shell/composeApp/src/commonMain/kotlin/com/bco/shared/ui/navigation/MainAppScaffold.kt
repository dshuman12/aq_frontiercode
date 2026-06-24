package com.bco.shared.ui.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Dashboard
import androidx.compose.material.icons.outlined.Devices
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.WorkspacePremium
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.NavigationRailItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.material3.VerticalDivider
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.bco.shared.resources.Res
import com.bco.shared.resources.*
import com.bco.shared.model.ConnectionState
import com.bco.shared.platform.LocalAppServiceBridge
import com.bco.shared.platform.LocalPlatformContext
import com.bco.shared.platform.isDesktopHost
import com.bco.shared.ui.adaptive.isExpanded
import com.bco.shared.designsystem.component.ConnectionDot
import com.bco.shared.ui.dashboard.DashboardTab
import com.bco.shared.ui.dashboard.DashboardTopAppBarTitle
import com.bco.shared.ui.devices.DevicesTab
import com.bco.shared.ui.settings.SettingsTab
import com.bco.shared.ui.upgrade.UpgradeTab
import org.jetbrains.compose.resources.pluralStringResource
import org.jetbrains.compose.resources.stringResource
import androidx.compose.runtime.collectAsState
import org.jetbrains.compose.resources.StringResource

private data class BottomNavItem(
    val route: String,
    val title: StringResource,
    val icon: ImageVector,
)

private val bottomNavItems = listOf(
    BottomNavItem(BCORoute.Dashboard.route, Res.string.tab_dashboard, Icons.Outlined.Dashboard),
    BottomNavItem(BCORoute.Devices.route, Res.string.tab_devices, Icons.Outlined.Devices),
    BottomNavItem(BCORoute.Upgrade.route, Res.string.tab_upgrade, Icons.Outlined.WorkspacePremium),
    BottomNavItem(BCORoute.Settings.route, Res.string.tab_settings, Icons.Outlined.Settings),
)

/**
 * Main shell: top app bar (tab title + [ConnectionDot]), bottom [NavigationBar], and [NavHost] with
 * [DashboardTab] on the dashboard route, [DevicesTab], [UpgradeTab], and [SettingsTab].
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainAppScaffold(
    modifier: Modifier = Modifier,
    windowWidthSizeClass: WindowWidthSizeClass,
    /** Increment on host [ON_RESUME] so settings and battery state refresh. */
    resumeSyncTick: Int,
    batteryOptimizationIgnored: Boolean,
    onRequestBatteryOptimization: () -> Unit,
    connectionMsToday: () -> Long,
    connectionState: ConnectionState = ConnectionState.Disconnected,
    devicesToolbarPeerCount: Int = 0,
    dashboardServiceRunning: Boolean = true,
) {
    val widthClass = windowWidthSizeClass

    val contentMaxWidth: Dp? = if (widthClass.isExpanded()) 840.dp else null

    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route ?: BCORoute.Dashboard.route
    val titleRes = bottomNavItems.firstOrNull { it.route == currentRoute }?.title
        ?: Res.string.tab_dashboard

    val bridge = LocalAppServiceBridge.current
    val platformContext = LocalPlatformContext.current
    val discoveredPeers by bridge.discoveredPeers.collectAsState()
    val discoveredPeerIds = remember(discoveredPeers) {
        discoveredPeers.map { it.peerId }.sorted()
    }
    val useDesktopRail = platformContext.isDesktopHost() && widthClass.isExpanded()

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            Column {
                TopAppBar(
                    title = {
                        when {
                            currentRoute == BCORoute.Dashboard.route -> {
                                DashboardTopAppBarTitle(serviceRunning = dashboardServiceRunning)
                            }
                            currentRoute == BCORoute.Devices.route -> {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text(
                                        text = stringResource(Res.string.devices_tab_screen_title),
                                        style = MaterialTheme.typography.titleLarge,
                                    )
                                    Spacer(Modifier.weight(1f))
                                    Text(
                                        text = pluralStringResource(
                                            Res.plurals.devices_toolbar_peer_count,
                                            devicesToolbarPeerCount,
                                            devicesToolbarPeerCount,
                                        ),
                                        style = MaterialTheme.typography.titleMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                            else -> Text(stringResource(titleRes))
                        }
                    },
                    actions = {
                        Box(Modifier.padding(end = 16.dp)) {
                            ConnectionDot(state = connectionState)
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surface,
                    ),
                )
                HorizontalDivider(color = MaterialTheme.colorScheme.outline)
            }
        },
        bottomBar = {
            if (!useDesktopRail) {
                Column {
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline)
                    NavigationBar(
                        containerColor = MaterialTheme.colorScheme.surface,
                    ) {
                        bottomNavItems.forEach { item ->
                            NavigationBarItem(
                                selected = currentRoute == item.route,
                                onClick = {
                                    navController.navigate(item.route) {
                                        popUpTo(navController.graph.findStartDestination().id) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                },
                                icon = {
                                    Icon(
                                        item.icon,
                                        contentDescription = stringResource(item.title),
                                    )
                                },
                                label = { Text(stringResource(item.title)) },
                                colors = NavigationBarItemDefaults.colors(
                                    selectedIconColor = MaterialTheme.colorScheme.primary,
                                    selectedTextColor = MaterialTheme.colorScheme.primary,
                                    indicatorColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f),
                                    unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                    unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                ),
                            )
                        }
                    }
                }
            }
        },
    ) { innerPadding ->
        Box(Modifier.fillMaxSize()) {
            if (useDesktopRail) {
                Row(
                    modifier = Modifier
                        .padding(innerPadding)
                        .fillMaxSize(),
                ) {
                    NavigationRail(
                        containerColor = MaterialTheme.colorScheme.surface,
                    ) {
                        bottomNavItems.forEach { item ->
                            NavigationRailItem(
                                selected = currentRoute == item.route,
                                onClick = {
                                    navController.navigate(item.route) {
                                        popUpTo(navController.graph.findStartDestination().id) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                },
                                icon = {
                                    Icon(
                                        item.icon,
                                        contentDescription = stringResource(item.title),
                                    )
                                },
                                label = { Text(stringResource(item.title)) },
                                colors = NavigationRailItemDefaults.colors(
                                    selectedIconColor = MaterialTheme.colorScheme.primary,
                                    selectedTextColor = MaterialTheme.colorScheme.primary,
                                    indicatorColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f),
                                    unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                    unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                ),
                            )
                        }
                    }
                    VerticalDivider(
                        modifier = Modifier
                            .fillMaxHeight()
                            .padding(vertical = 16.dp),
                        color = MaterialTheme.colorScheme.outline,
                    )
                    Box(
                        modifier = Modifier.weight(1f),
                        contentAlignment = Alignment.TopCenter,
                    ) {
                        MainAppNavHost(
                            navController = navController,
                            contentMaxWidth = contentMaxWidth,
                            widthClass = widthClass,
                            connectionMsToday = connectionMsToday,
                            resumeSyncTick = resumeSyncTick,
                            batteryOptimizationIgnored = batteryOptimizationIgnored,
                            onRequestBatteryOptimization = onRequestBatteryOptimization,
                        )
                    }
                }
            } else {
                Box(
                    Modifier
                        .padding(innerPadding)
                        .fillMaxSize(),
                    contentAlignment = Alignment.TopCenter,
                ) {
                    MainAppNavHost(
                        navController = navController,
                        contentMaxWidth = contentMaxWidth,
                        widthClass = widthClass,
                        connectionMsToday = connectionMsToday,
                        resumeSyncTick = resumeSyncTick,
                        batteryOptimizationIgnored = batteryOptimizationIgnored,
                        onRequestBatteryOptimization = onRequestBatteryOptimization,
                    )
                }
            }

            LaunchedEffect(discoveredPeerIds) {
                if (discoveredPeers.isNotEmpty() && currentRoute != BCORoute.Devices.route) {
                    navController.navigate(BCORoute.Devices.route) {
                        popUpTo(navController.graph.findStartDestination().id) {
                            saveState = true
                        }
                        launchSingleTop = true
                        restoreState = true
                    }
                }
            }
        }
    }
}

@Composable
private fun MainAppNavHost(
    navController: androidx.navigation.NavHostController,
    contentMaxWidth: Dp?,
    widthClass: WindowWidthSizeClass,
    connectionMsToday: () -> Long,
    resumeSyncTick: Int,
    batteryOptimizationIgnored: Boolean,
    onRequestBatteryOptimization: () -> Unit,
) {
    val hostModifier = if (contentMaxWidth != null) {
        Modifier
            .widthIn(max = contentMaxWidth)
            .fillMaxWidth()
            .fillMaxSize()
    } else {
        Modifier.fillMaxSize()
    }
    NavHost(
        navController = navController,
        startDestination = BCORoute.Dashboard.route,
        modifier = hostModifier,
    ) {
        composable(BCORoute.Dashboard.route) {
            DashboardTab(
                windowWidthSizeClass = widthClass,
                modifier = Modifier.fillMaxSize(),
            )
        }
        composable(BCORoute.Devices.route) {
            DevicesTab(
                windowWidthSizeClass = widthClass,
                connectionMsToday = connectionMsToday,
                onNavigateToUpgrade = {
                    navController.navigate(BCORoute.Upgrade.route) {
                        popUpTo(navController.graph.findStartDestination().id) {
                            saveState = true
                        }
                        launchSingleTop = true
                        restoreState = true
                    }
                },
                modifier = Modifier.fillMaxSize(),
            )
        }
        composable(BCORoute.Upgrade.route) {
            UpgradeTab(
                windowWidthSizeClass = widthClass,
                modifier = Modifier.fillMaxSize(),
            )
        }
        composable(BCORoute.Settings.route) {
            SettingsTab(
                modifier = Modifier.fillMaxSize(),
                resumeSyncTick = resumeSyncTick,
                batteryOptimizationIgnored = batteryOptimizationIgnored,
                onRequestBatteryOptimization = onRequestBatteryOptimization,
            )
        }
    }
}
