package com.bco.android

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BluetoothDisabled
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.windowsizeclass.ExperimentalMaterial3WindowSizeClassApi
import androidx.compose.material3.windowsizeclass.calculateWindowSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.bco.android.platform.AndroidAppServiceBridge
import com.bco.android.platform.AndroidPlatformActions
import com.bco.android.platform.AndroidPreferencesProvider
import com.bco.android.prefs.DevicePreferences
import com.bco.android.service.BCOService
import com.bco.android.service.BtUptimeTracker
import com.bco.android.ui.NativeLibraryMissingScreen
import com.bco.android.ui.bcoBluetoothPermissions
import com.bco.android.ui.hasAllBcoRuntimePermissions
import com.bco.android.ui.hasBluetoothRuntimePermissions
import com.bco.shared.platform.AndroidBluetoothA2dpTester
import com.bco.shared.platform.AndroidBluetoothDeviceProvider
import com.bco.shared.platform.LocalAppServiceBridge
import com.bco.shared.platform.LocalBluetoothA2dpTester
import com.bco.shared.platform.LocalBluetoothDeviceProvider
import com.bco.shared.platform.LocalPermissionHandler
import com.bco.shared.platform.LocalPlatformActions
import com.bco.shared.platform.LocalPlatformContext
import com.bco.shared.platform.LocalPreferencesProvider
import com.bco.shared.platform.LocalQrCodeProvider
import com.bco.shared.platform.PlatformContext
import com.bco.shared.platform.ZxingQrCodeProvider
import com.bco.shared.platform.notifyServicePermissionsChanged
import com.bco.shared.platform.rememberAndroidPermissionHandler
import com.bco.shared.ui.navigation.MainAppScaffold
import com.bco.shared.ui.onboarding.OnboardingFlow
import com.bco.shared.designsystem.theme.BCOColorPalette
import com.bco.shared.designsystem.theme.BCOTheme

class MainActivity : ComponentActivity() {
    @OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3WindowSizeClassApi::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
        )
        super.onCreate(savedInstanceState)
        setContent {
            val devicePreferences = remember { DevicePreferences(this@MainActivity) }
            val themePreference by devicePreferences.themePreferenceFlow.collectAsStateWithLifecycle(
                initialValue = devicePreferences.themePreference,
                lifecycleOwner = this@MainActivity,
            )
            val isSystemDark = isSystemInDarkTheme()
            val palette = when (themePreference) {
                DevicePreferences.THEME_LIGHT -> BCOColorPalette.Light
                DevicePreferences.THEME_SYSTEM ->
                    if (isSystemDark) BCOColorPalette.Dark else BCOColorPalette.Light
                else -> BCOColorPalette.Dark
            }
            BCOTheme(palette = palette) {
                if (!BCOApplication.isNativeLibraryLoaded) {
                    Scaffold(
                        modifier = Modifier.fillMaxSize(),
                        topBar = {
                            TopAppBar(title = { Text(stringResource(R.string.app_name)) })
                        },
                    ) { innerPadding ->
                        Column(
                            Modifier
                                .fillMaxSize()
                                .padding(innerPadding)
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                        ) {
                            NativeLibraryMissingScreen()
                        }
                    }
                    return@BCOTheme
                }

                val act = this@MainActivity
                val preferencesProvider = remember { AndroidPreferencesProvider(devicePreferences) }
                val appBridge = remember { AndroidAppServiceBridge(act) }
                val platformActions = remember { AndroidPlatformActions(act) }
                val btProvider = remember { AndroidBluetoothDeviceProvider(act) }
                val qrProvider = remember { ZxingQrCodeProvider() }
                val a2dpTester = remember { AndroidBluetoothA2dpTester(act) }
                val platformContext = remember { PlatformContext(act) }
                notifyServicePermissionsChanged = { BCOService.notifyPermissionsChanged() }
                val permissionHandler = rememberAndroidPermissionHandler(act)
                val btUptimeTracker = remember(devicePreferences) { BtUptimeTracker(devicePreferences) }
                val windowWidthSizeClass = calculateWindowSizeClass(act).widthSizeClass

                CompositionLocalProvider(
                    LocalAppServiceBridge provides appBridge,
                    LocalPlatformActions provides platformActions,
                    LocalPreferencesProvider provides preferencesProvider,
                    LocalBluetoothDeviceProvider provides btProvider,
                    LocalQrCodeProvider provides qrProvider,
                    LocalBluetoothA2dpTester provides a2dpTester,
                    LocalPlatformContext provides platformContext,
                    LocalPermissionHandler provides permissionHandler,
                ) {
                    val context = LocalContext.current
                    var resumeSync by remember { mutableIntStateOf(0) }

                    DisposableEffect(Unit) {
                        val lifecycle = this@MainActivity.lifecycle
                        val observer = LifecycleEventObserver { _, event ->
                            if (event == Lifecycle.Event.ON_RESUME) {
                                resumeSync++
                            }
                        }
                        lifecycle.addObserver(observer)
                        onDispose { lifecycle.removeObserver(observer) }
                    }

                    val allGranted = remember(context, resumeSync) {
                        context.hasAllBcoRuntimePermissions()
                    }

                    val batteryOptimizationIgnored = remember(act, resumeSync) {
                        act.isIgnoringBatteryOptimizations()
                    }

                    val onboardingComplete by devicePreferences.onboardingCompleteFlow.collectAsStateWithLifecycle(
                        initialValue = devicePreferences.onboardingComplete,
                        lifecycleOwner = this@MainActivity,
                    )

                    LaunchedEffect(allGranted, onboardingComplete, batteryOptimizationIgnored, resumeSync) {
                        if (!allGranted) return@LaunchedEffect
                        if (!onboardingComplete) return@LaunchedEffect
                        if (batteryOptimizationIgnored) return@LaunchedEffect
                        if (devicePreferences.hasPromptedBatteryOptimizationExemption) return@LaunchedEffect
                        act.launchIgnoreBatteryOptimizationsSettings()
                        devicePreferences.hasPromptedBatteryOptimizationExemption = true
                    }

                    val btGranted = remember(context, resumeSync) {
                        context.hasBluetoothRuntimePermissions()
                    }

                    LaunchedEffect(resumeSync) {
                        BCOService.notifyPermissionsChanged()
                    }

                    if (!onboardingComplete) {
                        OnboardingFlow(
                            windowWidthSizeClass = windowWidthSizeClass,
                            refreshKey = resumeSync,
                            isBatteryOptimizationIgnored = batteryOptimizationIgnored,
                            onRequestBatteryOptimization = { act.launchIgnoreBatteryOptimizationsSettings() },
                            onFinished = { },
                        )
                    } else if (!btGranted) {
                        BluetoothPermissionRevokedScreen(
                            activity = this@MainActivity,
                            onPermissionResult = { resumeSync++ },
                        )
                    } else {
                        val serviceUiState by BCOService.serviceUiState.collectAsStateWithLifecycle(
                            lifecycleOwner = this@MainActivity,
                        )
                        MainAppScaffold(
                            windowWidthSizeClass = windowWidthSizeClass,
                            resumeSyncTick = resumeSync,
                            batteryOptimizationIgnored = batteryOptimizationIgnored,
                            onRequestBatteryOptimization = { act.launchIgnoreBatteryOptimizationsSettings() },
                            connectionMsToday = { btUptimeTracker.connectionMsToday() },
                            connectionState = serviceUiState.connectionState,
                            devicesToolbarPeerCount = serviceUiState.peers.count { it.online },
                            dashboardServiceRunning = serviceUiState.serviceRunning,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun BluetoothPermissionRevokedScreen(
    activity: ComponentActivity,
    onPermissionResult: () -> Unit,
) {
    val btLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { onPermissionResult() }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background,
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .systemBarsPadding()
                .padding(horizontal = 32.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Surface(
                shape = RoundedCornerShape(24.dp),
                color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.18f),
                modifier = Modifier.size(80.dp),
            ) {
                Icon(
                    imageVector = Icons.Filled.BluetoothDisabled,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.error,
                    modifier = Modifier
                        .padding(20.dp)
                        .size(40.dp),
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = stringResource(R.string.bt_permission_revoked_title),
                style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center,
            )

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = stringResource(R.string.bt_permission_revoked_body),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )

            Spacer(modifier = Modifier.height(32.dp))

            Button(
                onClick = { btLauncher.launch(bcoBluetoothPermissions) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
            ) {
                Text(stringResource(R.string.bt_permission_revoked_grant))
            }

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedButton(
                onClick = {
                    val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                        data = Uri.fromParts("package", activity.packageName, null)
                    }
                    activity.startActivity(intent)
                },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
            ) {
                Text(stringResource(R.string.bt_permission_revoked_open_settings))
            }
        }
    }
}
