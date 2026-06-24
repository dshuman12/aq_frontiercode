package com.bco.desktop

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.rememberWindowState
import androidx.compose.ui.window.application
import com.bco.shared.platform.DesktopAppServiceBridge
import com.bco.shared.platform.DesktopBluetoothA2dpTester
import com.bco.shared.platform.DesktopBluetoothDeviceProvider
import com.bco.shared.platform.DesktopNativeHelperClient
import com.bco.shared.platform.DesktopPermissionHandler
import com.bco.shared.platform.DesktopPlatformActions
import com.bco.shared.platform.DesktopPreferencesProvider
import com.bco.shared.platform.LocalAppServiceBridge
import com.bco.shared.platform.LocalBluetoothA2dpTester
import com.bco.shared.platform.LocalBluetoothDeviceProvider
import com.bco.shared.platform.LocalPermissionHandler
import com.bco.shared.platform.LocalPlatformActions
import com.bco.shared.platform.LocalPlatformContext
import com.bco.shared.platform.LocalPreferencesProvider
import com.bco.shared.platform.NoOpQrCodeProvider
import com.bco.shared.platform.LocalQrCodeProvider
import com.bco.shared.platform.PlatformContext
import com.bco.shared.platform.PreferencesProvider
import com.bco.shared.ui.navigation.MainAppScaffold
import com.bco.shared.ui.onboarding.OnboardingFlow
import com.bco.shared.designsystem.theme.BCOTheme
import com.bco.shared.designsystem.theme.BCOColorPalette
import kotlinx.coroutines.delay

fun main() = application {
    val windowState = rememberWindowState(size = DpSize(1280.dp, 860.dp))
    Window(
        onCloseRequest = ::exitApplication,
        title = "BCO",
        state = windowState,
    ) {
        DesktopRoot(windowWidthDp = windowState.size.width)
    }
}

@Composable
private fun DesktopRoot(windowWidthDp: Dp) {
    val helperClient = remember { DesktopNativeHelperClient() }
    val preferencesProvider = remember { DesktopPreferencesProvider() }
    val bridge = remember { DesktopAppServiceBridge(preferencesProvider, helperClient) }
    val platformActions = remember { DesktopPlatformActions() }
    val bluetoothProvider = remember { DesktopBluetoothDeviceProvider(helperClient) }
    val a2dpTester = remember { DesktopBluetoothA2dpTester(helperClient) }
    val platformContext = remember { PlatformContext() }

    DisposableEffect(bridge) {
        onDispose { bridge.close() }
    }

    var refreshTick by remember { mutableIntStateOf(0) }
    LaunchedEffect(Unit) {
        while (true) {
            delay(5_000L)
            refreshTick++
        }
    }

    val serviceUiState by bridge.serviceUiState.collectAsState()
    val onboardingComplete by preferencesProvider.onboardingCompleteFlow.collectAsState(
        initial = preferencesProvider.onboardingComplete,
    )
    val themePreference by preferencesProvider.themePreferenceFlow.collectAsState(
        initial = preferencesProvider.themePreference,
    )
    val isSystemDark = isSystemInDarkTheme()
    val palette = when (themePreference) {
        PreferencesProvider.THEME_LIGHT -> BCOColorPalette.Light
        PreferencesProvider.THEME_SYSTEM ->
            if (isSystemDark) BCOColorPalette.Dark else BCOColorPalette.Light
        else -> BCOColorPalette.Dark
    }
    val windowWidthSizeClass = remember(windowWidthDp) {
        when {
            windowWidthDp < 600.dp -> WindowWidthSizeClass.Compact
            windowWidthDp < 840.dp -> WindowWidthSizeClass.Medium
            else -> WindowWidthSizeClass.Expanded
        }
    }

    CompositionLocalProvider(
        LocalPlatformContext provides platformContext,
        LocalAppServiceBridge provides bridge,
        LocalPlatformActions provides platformActions,
        LocalPreferencesProvider provides preferencesProvider,
        LocalBluetoothDeviceProvider provides bluetoothProvider,
        LocalBluetoothA2dpTester provides a2dpTester,
        LocalQrCodeProvider provides NoOpQrCodeProvider,
        LocalPermissionHandler provides DesktopPermissionHandler,
    ) {
        BCOTheme(palette = palette) {
            if (!onboardingComplete) {
                OnboardingFlow(
                    windowWidthSizeClass = windowWidthSizeClass,
                    refreshKey = refreshTick,
                    isBatteryOptimizationIgnored = true,
                    onRequestBatteryOptimization = {},
                    onFinished = { },
                )
            } else {
                MainAppScaffold(
                    windowWidthSizeClass = windowWidthSizeClass,
                    resumeSyncTick = refreshTick,
                    batteryOptimizationIgnored = true,
                    onRequestBatteryOptimization = {},
                    connectionMsToday = { serviceUiState.btConnectionTimeToday },
                    connectionState = serviceUiState.connectionState,
                    devicesToolbarPeerCount = serviceUiState.peers.count { it.online },
                    dashboardServiceRunning = serviceUiState.serviceRunning,
                )
            }
        }
    }
}
