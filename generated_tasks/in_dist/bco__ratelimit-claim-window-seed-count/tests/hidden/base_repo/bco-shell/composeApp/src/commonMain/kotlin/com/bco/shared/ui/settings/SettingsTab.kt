package com.bco.shared.ui.settings

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Slider
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.bco.shared.resources.Res
import com.bco.shared.resources.*
import com.bco.shared.platform.AppPermission
import com.bco.shared.platform.LocalAppServiceBridge
import com.bco.shared.platform.LocalBluetoothDeviceProvider
import com.bco.shared.platform.LocalPermissionHandler
import com.bco.shared.platform.LocalPlatformActions
import com.bco.shared.platform.LocalPlatformContext
import com.bco.shared.platform.LocalPreferencesProvider
import com.bco.shared.platform.rememberBondedAudioDevices
import com.bco.shared.platform.PermissionStatus
import com.bco.shared.platform.PreferencesProvider
import com.bco.shared.platform.readBcoInstanceIdOrNull
import com.bco.shared.designsystem.component.BCOCard
import com.bco.shared.designsystem.component.BugReportModal
import com.bco.shared.ui.devices.DeviceSelector
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.withContext
import org.jetbrains.compose.resources.stringResource

/**
 * Main settings tab (US5 / T040): Account, Appearance, Service, Bluetooth, Notifications, Advanced,
 * Support — aligned with the v0 web app structure.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsTab(
    modifier: Modifier = Modifier,
    /** Increment when the host screen resumes so bonded-device and battery state refresh. */
    resumeSyncTick: Int = 0,
    batteryOptimizationIgnored: Boolean,
    onRequestBatteryOptimization: () -> Unit,
) {
    val prefs = LocalPreferencesProvider.current
    val bridge = LocalAppServiceBridge.current
    val platformActions = LocalPlatformActions.current
    val platformContext = LocalPlatformContext.current
    val btProvider = LocalBluetoothDeviceProvider.current
    val permissionHandler = LocalPermissionHandler.current

    var selectionEpoch by remember { mutableIntStateOf(0) }
    var prefsRefresh by remember { mutableIntStateOf(0) }
    var autoStartRefresh by remember { mutableIntStateOf(0) }
    var logLevelRefresh by remember { mutableIntStateOf(0) }
    var notificationPermissionRefresh by remember { mutableIntStateOf(0) }
    var notificationPermissionAttempted by remember { mutableStateOf(false) }
    var lastNotificationPermissionOutcome by remember { mutableStateOf<PermissionStatus?>(null) }

    val bondedAudio = rememberBondedAudioDevices(
        refreshKey = resumeSyncTick,
        provider = btProvider,
    )
    val savedAddress = remember(prefs, resumeSyncTick, selectionEpoch) {
        prefs.targetBTAddress
    }
    val hasTargetDevice = !savedAddress.isNullOrBlank()
    val savedNotBonded = !savedAddress.isNullOrBlank() &&
        bondedAudio.none { it.address.equals(savedAddress, ignoreCase = true) }

    val serviceUiState by bridge.serviceUiState.collectAsState()

    val autoStartOn = remember(prefs, autoStartRefresh, resumeSyncTick, selectionEpoch) {
        prefs.autoStart
    }

    val detailedNotifications = remember(prefs, prefsRefresh) {
        prefs.detailedNotifications
    }
    val peerEventSound = remember(prefs, prefsRefresh) {
        prefs.peerEventSoundEnabled
    }
    val notificationPermissionStatus = remember(
        permissionHandler,
        resumeSyncTick,
        notificationPermissionRefresh,
    ) {
        permissionHandler.getPermissionStatus(AppPermission.Notifications)
    }
    val notificationsGranted = notificationPermissionStatus == PermissionStatus.Granted
    val notificationsBlocked = notificationPermissionAttempted &&
        !notificationsGranted &&
        lastNotificationPermissionOutcome == PermissionStatus.DeniedPermanently

    val coreLogLevel = remember(prefs, logLevelRefresh) {
        prefs.coreLogLevel
    }

    var coreVersionLabel by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) {
        coreVersionLabel = withContext(Dispatchers.Default) { platformActions.getCoreVersionOrNull() }
    }

    val appVersionLabel = remember(platformActions) { platformActions.getAppVersion() }

    val instanceIdText = remember(platformContext, resumeSyncTick) {
        platformContext.readBcoInstanceIdOrNull()
    }

    var showAddressDialog by remember { mutableStateOf(false) }
    var addressForDialog by remember { mutableStateOf<String?>(null) }
    var addressLoading by remember { mutableStateOf(false) }
    LaunchedEffect(showAddressDialog) {
        if (showAddressDialog) {
            addressForDialog = null
            addressLoading = true
            addressForDialog = withContext(Dispatchers.Default) { bridge.getLocalAddressSnapshot() }
            addressLoading = false
        }
    }

    var showBugSheet by remember { mutableStateOf(false) }
    val bugSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    val themePreference by prefs.themePreferenceFlow.collectAsState(initial = prefs.themePreference)

    val exportSubject = stringResource(Res.string.settings_export_logs_subject)
    val exportChooserTitle = stringResource(Res.string.settings_export_logs_chooser_title)
    val coreUnknown = stringResource(Res.string.settings_core_version_unknown)
    val instanceUnavailable = stringResource(Res.string.settings_instance_id_unavailable)
    val exportFooter = stringResource(Res.string.settings_export_logs_body_footer)
    val privacyUrl = stringResource(Res.string.settings_url_privacy)
    val termsUrl = stringResource(Res.string.settings_url_terms)
    val settingsStubToast = stringResource(Res.string.settings_stub_toast)
    val toastInstanceIdCopied = stringResource(Res.string.toast_instance_id_copied)

    Box(modifier = modifier.fillMaxSize()) {
        val snackbarHostState = remember { SnackbarHostState() }
        LaunchedEffect(bridge) {
            bridge.btTestConnectFeedback.collectLatest { fb ->
                snackbarHostState.showSnackbar(
                    message = fb.message,
                    duration = if (fb.isSuccess) {
                        SnackbarDuration.Short
                    } else {
                        SnackbarDuration.Long
                    },
                    withDismissAction = true,
                )
            }
        }

        val scrollState = rememberScrollState()
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(scrollState)
                .padding(horizontal = 16.dp)
                .padding(vertical = 8.dp)
                .padding(bottom = 24.dp),
        ) {
            SettingsSectionTitle(text = stringResource(Res.string.settings_section_account))
            Text(
                text = stringResource(Res.string.settings_account_display_name_stub),
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = stringResource(Res.string.settings_account_email_stub),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 4.dp),
            )
            Surface(
                modifier = Modifier.padding(top = 12.dp),
                shape = MaterialTheme.shapes.small,
                color = MaterialTheme.colorScheme.secondaryContainer,
            ) {
                Text(
                    text = stringResource(Res.string.settings_account_plan_badge_free),
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSecondaryContainer,
                )
            }
            TextButton(
                onClick = {
                    platformActions.showToast(settingsStubToast)
                },
                modifier = Modifier.padding(top = 4.dp),
            ) {
                Text(stringResource(Res.string.settings_account_manage_subscription))
            }
            TextButton(
                onClick = {
                    platformActions.showToast(settingsStubToast)
                },
            ) {
                Text(stringResource(Res.string.settings_account_sign_out))
            }

            Spacer(modifier = Modifier.height(24.dp))
            SettingsSectionTitle(text = stringResource(Res.string.settings_section_appearance))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                FilterChip(
                    selected = themePreference == PreferencesProvider.THEME_DARK,
                    onClick = { prefs.themePreference = PreferencesProvider.THEME_DARK },
                    label = { Text(stringResource(Res.string.theme_option_dark)) },
                )
                FilterChip(
                    selected = themePreference == PreferencesProvider.THEME_LIGHT,
                    onClick = { prefs.themePreference = PreferencesProvider.THEME_LIGHT },
                    label = { Text(stringResource(Res.string.theme_option_light)) },
                )
                FilterChip(
                    selected = themePreference == PreferencesProvider.THEME_SYSTEM,
                    onClick = { prefs.themePreference = PreferencesProvider.THEME_SYSTEM },
                    label = { Text(stringResource(Res.string.theme_option_system)) },
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
            SettingsSectionTitle(text = stringResource(Res.string.settings_section_service))
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .padding(end = 16.dp),
                ) {
                    Text(
                        text = stringResource(Res.string.settings_auto_start_title),
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Text(
                        text = stringResource(Res.string.settings_auto_start_summary),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
                Switch(
                    checked = autoStartOn,
                    onCheckedChange = {
                        prefs.autoStart = it
                        autoStartRefresh++
                    },
                    enabled = hasTargetDevice,
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            OutlinedButton(
                onClick = { showAddressDialog = true },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(stringResource(Res.string.action_show_my_address))
            }
            if (!batteryOptimizationIgnored) {
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = stringResource(Res.string.settings_section_battery),
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(bottom = 4.dp),
                )
                Text(
                    text = stringResource(Res.string.battery_optimization_hint),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(bottom = 8.dp),
                )
                OutlinedButton(
                    onClick = onRequestBatteryOptimization,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(stringResource(Res.string.action_allow_battery_unrestricted))
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
            SettingsSectionTitle(text = stringResource(Res.string.settings_section_bluetooth_device))
            var leOnlyFilter by remember { mutableStateOf(false) }
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    text = stringResource(Res.string.onboarding_device_select_show_le),
                    style = MaterialTheme.typography.bodyLarge,
                    modifier = Modifier.weight(1f).padding(end = 8.dp),
                )
                Switch(
                    checked = leOnlyFilter,
                    onCheckedChange = { leOnlyFilter = it },
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            if (savedNotBonded) {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp),
                    color = MaterialTheme.colorScheme.secondaryContainer,
                    shape = MaterialTheme.shapes.medium,
                ) {
                    Text(
                        text = stringResource(Res.string.settings_saved_device_unpaired),
                        modifier = Modifier.padding(16.dp),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSecondaryContainer,
                    )
                }
            }
            if (bondedAudio.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 120.dp)
                        .padding(vertical = 16.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = stringResource(Res.string.settings_no_paired_audio_devices),
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            } else {
                DeviceSelector(
                    modifier = Modifier.fillMaxWidth(),
                    refreshKey = resumeSyncTick,
                    leOnlyFilter = leOnlyFilter,
                    onDeviceClick = { selectionEpoch++ },
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            OutlinedButton(
                onClick = { bridge.requestTestBluetoothConnectFromUi() },
                enabled = hasTargetDevice,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(stringResource(Res.string.action_test_bt_connect))
            }

            Spacer(modifier = Modifier.height(24.dp))
            SettingsSectionTitle(text = stringResource(Res.string.settings_section_notifications))
            NotificationAccessCard(
                permissionStatus = notificationPermissionStatus,
                blocked = notificationsBlocked,
                serviceRunning = serviceUiState.serviceRunning,
                onRequestPermission = {
                    permissionHandler.requestPermission(AppPermission.Notifications) { status ->
                        notificationPermissionAttempted = true
                        lastNotificationPermissionOutcome = status
                        notificationPermissionRefresh++
                        if (status == PermissionStatus.Granted || status == PermissionStatus.NotRequired) {
                            bridge.requestDashboardRefresh()
                        }
                    }
                },
                onOpenNotificationSettings = { permissionHandler.openNotificationSettings() },
            )
            Spacer(modifier = Modifier.height(12.dp))
            SettingsToggleRow(
                title = stringResource(Res.string.settings_notifications_detailed),
                summary = stringResource(Res.string.settings_notifications_detailed_summary),
                checked = detailedNotifications,
                onCheckedChange = {
                    prefs.detailedNotifications = it
                    prefsRefresh++
                    bridge.requestDashboardRefresh()
                },
            )
            Spacer(modifier = Modifier.height(8.dp))
            SettingsToggleRow(
                title = stringResource(Res.string.settings_notifications_peer_sound),
                summary = stringResource(Res.string.settings_notifications_peer_sound_summary),
                checked = peerEventSound,
                onCheckedChange = {
                    prefs.peerEventSoundEnabled = it
                    prefsRefresh++
                },
            )

            Spacer(modifier = Modifier.height(24.dp))
            SwitchingSettingsSection()

            Spacer(modifier = Modifier.height(24.dp))
            SettingsSectionTitle(text = stringResource(Res.string.settings_section_advanced))
            Text(
                text = stringResource(Res.string.settings_advanced_log_level),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.padding(bottom = 8.dp),
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                LogLevelChip(
                    label = stringResource(Res.string.settings_log_level_debug),
                    selected = coreLogLevel == PreferencesProvider.CORE_LOG_LEVEL_DEBUG,
                    onClick = {
                        prefs.coreLogLevel = PreferencesProvider.CORE_LOG_LEVEL_DEBUG
                        bridge.applyCoreLogLevelFromUi(PreferencesProvider.CORE_LOG_LEVEL_DEBUG)
                        logLevelRefresh++
                    },
                )
                LogLevelChip(
                    label = stringResource(Res.string.settings_log_level_info),
                    selected = coreLogLevel == PreferencesProvider.CORE_LOG_LEVEL_INFO,
                    onClick = {
                        prefs.coreLogLevel = PreferencesProvider.CORE_LOG_LEVEL_INFO
                        bridge.applyCoreLogLevelFromUi(PreferencesProvider.CORE_LOG_LEVEL_INFO)
                        logLevelRefresh++
                    },
                )
                LogLevelChip(
                    label = stringResource(Res.string.settings_log_level_warn),
                    selected = coreLogLevel == PreferencesProvider.CORE_LOG_LEVEL_WARN,
                    onClick = {
                        prefs.coreLogLevel = PreferencesProvider.CORE_LOG_LEVEL_WARN
                        bridge.applyCoreLogLevelFromUi(PreferencesProvider.CORE_LOG_LEVEL_WARN)
                        logLevelRefresh++
                    },
                )
                LogLevelChip(
                    label = stringResource(Res.string.settings_log_level_error),
                    selected = coreLogLevel == PreferencesProvider.CORE_LOG_LEVEL_ERROR,
                    onClick = {
                        prefs.coreLogLevel = PreferencesProvider.CORE_LOG_LEVEL_ERROR
                        bridge.applyCoreLogLevelFromUi(PreferencesProvider.CORE_LOG_LEVEL_ERROR)
                        logLevelRefresh++
                    },
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            OutlinedButton(
                onClick = {
                    val core = coreVersionLabel ?: coreUnknown
                    val id = instanceIdText ?: instanceUnavailable
                    val body = buildString {
                        appendLine("BCO diagnostic summary")
                        appendLine("App version: $appVersionLabel")
                        appendLine("Core version: $core")
                        appendLine("Instance ID: $id")
                        appendLine(platformActions.getBuildDiagnosticText())
                        append(exportFooter)
                    }
                    platformActions.shareText(
                        subject = exportSubject,
                        text = body,
                        chooserTitle = exportChooserTitle,
                    )
                },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(stringResource(Res.string.settings_advanced_export_logs))
            }
            Spacer(modifier = Modifier.height(12.dp))
            OutlinedButton(
                onClick = {
                    prefs.onboardingComplete = false
                },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = MaterialTheme.colorScheme.error,
                ),
            ) {
                Text("Restart Setup")
            }
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column(modifier = Modifier.weight(1f).padding(end = 8.dp)) {
                    Text(
                        text = stringResource(Res.string.settings_advanced_instance_id),
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Text(
                        text = instanceIdText ?: stringResource(Res.string.settings_instance_id_unavailable),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
                TextButton(
                    onClick = {
                        val id = instanceIdText ?: return@TextButton
                        platformActions.copyToClipboard(id, "BCO instance id")
                        platformActions.showToast(toastInstanceIdCopied)
                    },
                    enabled = !instanceIdText.isNullOrBlank(),
                ) {
                    Text(stringResource(Res.string.action_copy))
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
            SettingsSectionTitle(text = stringResource(Res.string.settings_section_support))
            TextButton(
                onClick = { showBugSheet = true },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(stringResource(Res.string.settings_support_report_bug))
            }
            TextButton(
                onClick = { platformActions.openUrl(privacyUrl) },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(stringResource(Res.string.settings_support_privacy))
            }
            TextButton(
                onClick = { platformActions.openUrl(termsUrl) },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(stringResource(Res.string.settings_support_terms))
            }
            Text(
                text = stringResource(
                    Res.string.settings_about_app_core_line,
                    appVersionLabel,
                    coreVersionLabel ?: stringResource(Res.string.settings_core_version_unknown),
                ),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 8.dp),
            )
        }

        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
        )

        SettingsLocalAddressDialog(
            visible = showAddressDialog,
            loading = addressLoading,
            address = addressForDialog,
            onDismiss = { showAddressDialog = false },
        )

        BugReportModal(
            visible = showBugSheet,
            onDismissRequest = { showBugSheet = false },
            sheetState = bugSheetState,
            serviceUiState = serviceUiState,
            coreVersion = coreVersionLabel,
            batteryOptimizationIgnored = batteryOptimizationIgnored,
            appVersion = appVersionLabel,
        )
    }
}

@Composable
private fun NotificationAccessCard(
    permissionStatus: PermissionStatus,
    blocked: Boolean,
    serviceRunning: Boolean,
    onRequestPermission: () -> Unit,
    onOpenNotificationSettings: () -> Unit,
) {
    val scheme = MaterialTheme.colorScheme
    val body = when {
        permissionStatus == PermissionStatus.NotRequired -> {
            stringResource(Res.string.settings_notifications_access_not_required)
        }
        permissionStatus == PermissionStatus.Granted && serviceRunning -> {
            stringResource(Res.string.settings_notifications_access_granted_running)
        }
        permissionStatus == PermissionStatus.Granted -> {
            stringResource(Res.string.settings_notifications_access_granted_idle)
        }
        serviceRunning -> {
            stringResource(Res.string.settings_notifications_access_denied_running)
        }
        else -> {
            stringResource(Res.string.settings_notifications_access_denied_idle)
        }
    }

    BCOCard(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = stringResource(Res.string.settings_notifications_access_title),
                style = MaterialTheme.typography.titleMedium,
                color = scheme.onSurface,
            )
            Text(
                text = body,
                style = MaterialTheme.typography.bodySmall,
                color = scheme.onSurfaceVariant,
            )

            when {
                permissionStatus == PermissionStatus.Granted ||
                    permissionStatus == PermissionStatus.NotRequired ||
                    blocked -> {
                    OutlinedButton(
                        onClick = onOpenNotificationSettings,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(stringResource(Res.string.settings_notifications_open_settings))
                    }
                }

                else -> {
                    Button(
                        onClick = onRequestPermission,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(stringResource(Res.string.settings_notifications_allow))
                    }
                    OutlinedButton(
                        onClick = onOpenNotificationSettings,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(stringResource(Res.string.settings_notifications_open_settings))
                    }
                }
            }
        }
    }
}

@Composable
private fun SwitchingSettingsSection() {
    val scheme = MaterialTheme.colorScheme
    val prefs = LocalPreferencesProvider.current
    val bridge = LocalAppServiceBridge.current
    var baseBias by remember { mutableIntStateOf(prefs.baseBias) }

    var settingsEpoch by remember { mutableIntStateOf(0) }
    var networkSettingsJson by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(settingsEpoch) {
        networkSettingsJson = withContext(Dispatchers.Default) { bridge.getNetworkSettingsSnapshot() }
    }

    var stickinessBonus by remember(networkSettingsJson) {
        mutableIntStateOf(networkSettingsJson?.let { extractIntSetting(it, "stickinessBonus") } ?: 50)
    }
    var btSafetyPolicy by remember(networkSettingsJson) {
        mutableStateOf(networkSettingsJson?.let { extractStringSetting(it, "btSafetyPolicy") } ?: "smart")
    }
    var switchCooldownMs by remember(networkSettingsJson) {
        mutableIntStateOf(networkSettingsJson?.let { extractIntSetting(it, "switchCooldownMs") } ?: 2000)
    }
    var mediaPauseGraceMs by remember(networkSettingsJson) {
        mutableIntStateOf(networkSettingsJson?.let { extractIntSetting(it, "mediaPauseGraceMs") } ?: 30000)
    }
    var manualConnectTimeoutMs by remember(networkSettingsJson) {
        mutableIntStateOf(networkSettingsJson?.let { extractIntSetting(it, "manualConnectTimeoutMs") } ?: 1800000)
    }

    SettingsSectionTitle(text = stringResource(Res.string.settings_section_switching))

    BCOCard {
        Column(Modifier.padding(16.dp)) {
            Text(
                text = stringResource(Res.string.settings_switching_base_priority),
                style = MaterialTheme.typography.bodyLarge,
                color = scheme.onSurface,
            )
            Text(
                text = stringResource(Res.string.settings_switching_base_priority_summary),
                style = MaterialTheme.typography.bodySmall,
                color = scheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 2.dp, bottom = 2.dp),
            )
            Text(
                text = stringResource(Res.string.settings_switching_scope_this_device),
                style = MaterialTheme.typography.labelSmall,
                color = scheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 4.dp),
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                Slider(
                    value = baseBias.toFloat(),
                    onValueChange = { baseBias = it.toInt() },
                    onValueChangeFinished = {
                        prefs.baseBias = baseBias
                        bridge.applyBaseBiasFromUi(baseBias)
                    },
                    valueRange = 0f..50f,
                    steps = 9,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    text = "$baseBias",
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(start = 8.dp),
                )
            }

            HorizontalDivider(
                color = scheme.outlineVariant,
                modifier = Modifier.padding(vertical = 12.dp),
            )

            SettingsSliderRow(
                title = stringResource(Res.string.settings_switching_stickiness),
                summary = stringResource(Res.string.settings_switching_stickiness_summary),
                value = stickinessBonus,
                range = 0f..100f,
                steps = 9,
                onValueCommit = { v ->
                    stickinessBonus = v
                    bridge.updateNetworkSettingFromUi("stickinessBonus", v)
                    settingsEpoch++
                },
                scopeAnnotation = stringResource(Res.string.settings_switching_scope_synced),
            )
        }
    }

    Spacer(modifier = Modifier.height(16.dp))

    BCOCard {
        Column(Modifier.padding(16.dp)) {
            Text(
                text = stringResource(Res.string.settings_switching_bt_safety),
                style = MaterialTheme.typography.bodyLarge,
                color = scheme.onSurface,
            )
            Text(
                text = stringResource(Res.string.settings_switching_bt_safety_summary),
                style = MaterialTheme.typography.bodySmall,
                color = scheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 2.dp, bottom = 2.dp),
            )
            Text(
                text = stringResource(Res.string.settings_switching_scope_synced),
                style = MaterialTheme.typography.labelSmall,
                color = scheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 8.dp),
            )
            BtSafetyPolicyOption(
                label = stringResource(Res.string.settings_switching_bt_safety_conservative),
                description = stringResource(Res.string.settings_switching_bt_safety_conservative_desc),
                selected = btSafetyPolicy == "conservative",
                onClick = {
                    btSafetyPolicy = "conservative"
                    bridge.updateNetworkSettingStringFromUi("btSafetyPolicy", "conservative")
                    settingsEpoch++
                },
            )
            Spacer(Modifier.height(6.dp))
            BtSafetyPolicyOption(
                label = stringResource(Res.string.settings_switching_bt_safety_smart),
                description = stringResource(Res.string.settings_switching_bt_safety_smart_desc),
                selected = btSafetyPolicy == "smart",
                onClick = {
                    btSafetyPolicy = "smart"
                    bridge.updateNetworkSettingStringFromUi("btSafetyPolicy", "smart")
                    settingsEpoch++
                },
            )
            Spacer(Modifier.height(6.dp))
            BtSafetyPolicyOption(
                label = stringResource(Res.string.settings_switching_bt_safety_aggressive),
                description = stringResource(Res.string.settings_switching_bt_safety_aggressive_desc),
                selected = btSafetyPolicy == "aggressive",
                onClick = {
                    btSafetyPolicy = "aggressive"
                    bridge.updateNetworkSettingStringFromUi("btSafetyPolicy", "aggressive")
                    settingsEpoch++
                },
            )
        }
    }

    Spacer(modifier = Modifier.height(16.dp))

    BCOCard {
        Column(Modifier.padding(16.dp)) {
            val cooldownChoices = listOf(1000 to "1s", 2000 to "2s", 5000 to "5s", 10000 to "10s")
            Text(
                text = stringResource(Res.string.settings_switching_cooldown),
                style = MaterialTheme.typography.bodyLarge,
                color = scheme.onSurface,
            )
            Text(
                text = stringResource(Res.string.settings_switching_cooldown_summary),
                style = MaterialTheme.typography.bodySmall,
                color = scheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 2.dp, bottom = 2.dp),
            )
            Text(
                text = stringResource(Res.string.settings_switching_scope_synced),
                style = MaterialTheme.typography.labelSmall,
                color = scheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 8.dp),
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                cooldownChoices.forEach { (ms, label) ->
                    FilterChip(
                        selected = switchCooldownMs == ms,
                        onClick = {
                            switchCooldownMs = ms
                            bridge.updateNetworkSettingFromUi("switchCooldownMs", ms)
                            settingsEpoch++
                        },
                        label = { Text(label) },
                    )
                }
            }

            HorizontalDivider(
                color = scheme.outlineVariant,
                modifier = Modifier.padding(vertical = 12.dp),
            )

            val graceChoices = listOf(15000 to "15s", 30000 to "30s", 60000 to "1m", 120000 to "2m")
            Text(
                text = stringResource(Res.string.settings_switching_grace),
                style = MaterialTheme.typography.bodyLarge,
                color = scheme.onSurface,
            )
            Text(
                text = stringResource(Res.string.settings_switching_grace_summary),
                style = MaterialTheme.typography.bodySmall,
                color = scheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 2.dp, bottom = 8.dp),
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                graceChoices.forEach { (ms, label) ->
                    FilterChip(
                        selected = mediaPauseGraceMs == ms,
                        onClick = {
                            mediaPauseGraceMs = ms
                            bridge.updateNetworkSettingFromUi("mediaPauseGraceMs", ms)
                            settingsEpoch++
                        },
                        label = { Text(label) },
                    )
                }
            }

            HorizontalDivider(
                color = scheme.outlineVariant,
                modifier = Modifier.padding(vertical = 12.dp),
            )

            val timeoutChoices = listOf(300000 to "5m", 900000 to "15m", 1800000 to "30m", 3600000 to "1h")
            Text(
                text = stringResource(Res.string.settings_switching_manual_timeout),
                style = MaterialTheme.typography.bodyLarge,
                color = scheme.onSurface,
            )
            Text(
                text = stringResource(Res.string.settings_switching_manual_timeout_summary),
                style = MaterialTheme.typography.bodySmall,
                color = scheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 2.dp, bottom = 8.dp),
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                timeoutChoices.forEach { (ms, label) ->
                    FilterChip(
                        selected = manualConnectTimeoutMs == ms,
                        onClick = {
                            manualConnectTimeoutMs = ms
                            bridge.updateNetworkSettingFromUi("manualConnectTimeoutMs", ms)
                            settingsEpoch++
                        },
                        label = { Text(label) },
                    )
                }
            }
        }
    }
}

@Composable
private fun BtSafetyPolicyOption(
    label: String,
    description: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    val scheme = MaterialTheme.colorScheme
    val bgColor = if (selected) scheme.primary.copy(alpha = 0.10f) else scheme.surfaceVariant
    val borderColor = if (selected) scheme.primary.copy(alpha = 0.40f) else scheme.outline
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        color = bgColor,
        border = BorderStroke(1.dp, borderColor),
    ) {
        Column(Modifier.padding(horizontal = 14.dp, vertical = 10.dp)) {
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                color = if (selected) scheme.primary else scheme.onSurface,
            )
            Text(
                text = description,
                style = MaterialTheme.typography.bodySmall,
                color = scheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 2.dp),
            )
        }
    }
}

@Composable
private fun SettingsSliderRow(
    title: String,
    summary: String,
    value: Int,
    range: ClosedFloatingPointRange<Float>,
    steps: Int,
    onValueCommit: (Int) -> Unit,
    scopeAnnotation: String? = null,
) {
    var current by remember(value) { mutableIntStateOf(value) }
    Text(
        text = title,
        style = MaterialTheme.typography.bodyLarge,
        color = MaterialTheme.colorScheme.onSurface,
    )
    Text(
        text = summary,
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(top = 2.dp, bottom = if (scopeAnnotation != null) 2.dp else 4.dp),
    )
    if (scopeAnnotation != null) {
        Text(
            text = scopeAnnotation,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(bottom = 4.dp),
        )
    }
    Row(verticalAlignment = Alignment.CenterVertically) {
        Slider(
            value = current.toFloat(),
            onValueChange = { current = it.toInt() },
            onValueChangeFinished = { onValueCommit(current) },
            valueRange = range,
            steps = steps,
            modifier = Modifier.weight(1f),
        )
        Text(
            text = "$current",
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(start = 8.dp),
        )
    }
}

private fun extractIntSetting(json: String, key: String): Int? {
    val pattern = """"$key"\s*:\s*\{\s*"value"\s*:\s*(\d+)""".toRegex()
    return pattern.find(json)?.groupValues?.get(1)?.toIntOrNull()
}

private fun extractStringSetting(json: String, key: String): String? {
    val pattern = """"$key"\s*:\s*\{\s*"value"\s*:\s*"([^"]+)"""".toRegex()
    return pattern.find(json)?.groupValues?.get(1)
}

@Composable
private fun SettingsSectionTitle(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.titleMedium,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier.padding(bottom = 12.dp),
    )
}

@Composable
private fun SettingsToggleRow(
    title: String,
    summary: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Column(
            modifier = Modifier
                .weight(1f)
                .padding(end = 16.dp),
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = summary,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 4.dp),
            )
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
        )
    }
}

@Composable
private fun LogLevelChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    FilterChip(
        selected = selected,
        onClick = onClick,
        label = { Text(label) },
    )
}

@Composable
private fun SettingsLocalAddressDialog(
    visible: Boolean,
    loading: Boolean,
    address: String?,
    onDismiss: () -> Unit,
) {
    val platformActions = LocalPlatformActions.current
    val toastAddressCopied = stringResource(Res.string.toast_address_copied)
    if (!visible) return
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(Res.string.settings_my_address_title)) },
        text = {
            when {
                loading -> Text(stringResource(Res.string.settings_address_loading))
                address.isNullOrBlank() -> Text(stringResource(Res.string.settings_address_unavailable))
                else -> Text(
                    text = address,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                )
            }
        },
        confirmButton = {
            if (!loading && !address.isNullOrBlank()) {
                TextButton(
                    onClick = {
                        platformActions.copyToClipboard(address, "BCO address")
                        platformActions.showToast(toastAddressCopied)
                        onDismiss()
                    },
                ) {
                    Text(stringResource(Res.string.action_copy))
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(Res.string.action_close))
            }
        },
    )
}
