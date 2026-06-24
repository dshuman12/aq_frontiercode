package com.bco.shared.ui.onboarding

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BatteryChargingFull
import androidx.compose.material.icons.filled.Bluetooth
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Headphones
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.bco.shared.resources.Res
import com.bco.shared.resources.*
import com.bco.shared.platform.AppPermission
import com.bco.shared.platform.LocalAppServiceBridge
import com.bco.shared.platform.LocalPermissionHandler
import com.bco.shared.platform.LocalPlatformActions
import com.bco.shared.platform.LocalPlatformContext
import com.bco.shared.platform.LocalPreferencesProvider
import com.bco.shared.platform.PermissionStatus
import com.bco.shared.platform.isDesktopHost
import com.bco.shared.designsystem.tokens.LocalBCOExtendedColors
import com.bco.shared.designsystem.tokens.LocalBCOStatusColors
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import org.jetbrains.compose.resources.stringResource

/**
 * Final onboarding step (T029): summary of headset and permissions, battery optimization hint,
 * and foreground service start with loading / failure handling.
 */
@Composable
fun StartServiceScreen(
    refreshKey: Any?,
    isBatteryOptimizationIgnored: Boolean,
    onRequestBatteryOptimization: () -> Unit,
    onContinue: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val prefs = LocalPreferencesProvider.current
    val permissionHandler = LocalPermissionHandler.current
    val platformActions = LocalPlatformActions.current
    val bridge = LocalAppServiceBridge.current
    val platformContext = LocalPlatformContext.current
    val isDesktopHost = platformContext.isDesktopHost()

    val savedName = remember(prefs, refreshKey) {
        prefs.targetBTName?.trim()?.takeIf { it.isNotEmpty() }
    }
    val savedAddress = remember(prefs, refreshKey) {
        prefs.targetBTAddress?.trim()?.takeIf { it.isNotEmpty() }
    }
    val hasTargetDevice = !savedAddress.isNullOrBlank()

    val btGranted = remember(permissionHandler, refreshKey) {
        permissionHandler.getPermissionStatus(AppPermission.Bluetooth) == PermissionStatus.Granted
    }
    val notifStatus = remember(permissionHandler, refreshKey) {
        permissionHandler.getPermissionStatus(AppPermission.Notifications)
    }
    val notifPre33 = notifStatus == PermissionStatus.NotRequired
    val notifGranted = notifStatus == PermissionStatus.Granted

    var batterySkipped by remember { mutableStateOf(false) }

    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val scroll = rememberScrollState()

    val toastNoTarget = stringResource(Res.string.error_bt_no_target)
    val toastStartFailed = stringResource(Res.string.onboarding_start_service_failed)

    val headsetDisplayName = savedName ?: stringResource(Res.string.onboarding_start_service_headset_unknown)
    val notifOk = notifPre33 || notifGranted
    val notifStatusText = when {
        notifPre33 -> stringResource(Res.string.onboarding_permissions_notifications_not_required)
        notifGranted -> stringResource(Res.string.onboarding_permissions_status_granted)
        else -> stringResource(Res.string.onboarding_start_service_perm_not_granted)
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(scroll),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            text = stringResource(Res.string.onboarding_start_service_title),
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.onSurface,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
        Text(
            text = stringResource(Res.string.onboarding_start_service_subtitle),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )

        Text(
            text = stringResource(Res.string.onboarding_start_service_config_summary_header),
            style = MaterialTheme.typography.labelSmall.copy(
                fontWeight = FontWeight.SemiBold,
                letterSpacing = MaterialTheme.typography.labelSmall.letterSpacing,
            ),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.fillMaxWidth(),
        )

        ConfigurationSummaryCard(
            headsetLabel = stringResource(Res.string.onboarding_start_service_row_headset),
            headsetName = headsetDisplayName,
            headsetOk = hasTargetDevice,
            bluetoothStatus = stringResource(
                if (btGranted) {
                    Res.string.onboarding_permissions_status_granted
                } else {
                    Res.string.onboarding_start_service_perm_not_granted
                },
            ),
            bluetoothOk = btGranted,
            notificationsStatus = notifStatusText,
            notificationsOk = notifOk,
        )

        if (!isDesktopHost) {
            BatteryOptimizationCard(
                unrestricted = isBatteryOptimizationIgnored,
                skipped = batterySkipped,
                onAllowUnrestricted = onRequestBatteryOptimization,
                onSkip = { batterySkipped = true },
            )
        }

        ServiceExplanationCard()

        if (!hasTargetDevice) {
            Text(
                text = stringResource(Res.string.onboarding_start_service_no_headset),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.error,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        }

        Button(
            onClick = {
                if (!hasTargetDevice) {
                    platformActions.showToast(toastNoTarget)
                    return@Button
                }
                scope.launch {
                    loading = true
                    try {
                        bridge.startService()
                    } catch (_: Exception) {
                        platformActions.showToast(toastStartFailed)
                        loading = false
                        return@launch
                    }

                    if (!bridge.serviceUiState.value.serviceRunning) {
                        withTimeoutOrNull(5_000) {
                            bridge.serviceUiState.filter { it.serviceRunning }.first()
                        }
                        if (!bridge.serviceUiState.value.serviceRunning) {
                            delay(500L)
                        }
                    }

                    if (!bridge.serviceUiState.value.serviceRunning) {
                        platformActions.showToast(toastStartFailed)
                        loading = false
                        return@launch
                    }

                    onContinue()
                }
            },
            enabled = !loading && hasTargetDevice,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
        ) {
            if (loading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.onPrimary,
                )
                Spacer(Modifier.width(8.dp))
            } else {
                Icon(
                    imageVector = Icons.Filled.PlayArrow,
                    contentDescription = stringResource(Res.string.onboarding_start_service_cta_cd),
                    modifier = Modifier.size(22.dp),
                )
                Spacer(Modifier.width(8.dp))
            }
            Text(stringResource(Res.string.onboarding_start_service_cta))
        }
    }
}

@Composable
private fun ConfigurationSummaryCard(
    headsetLabel: String,
    headsetName: String,
    headsetOk: Boolean,
    bluetoothStatus: String,
    bluetoothOk: Boolean,
    notificationsStatus: String,
    notificationsOk: Boolean,
) {
    val scheme = MaterialTheme.colorScheme
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = scheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
    ) {
        Column {
            SummaryStatusRow(
                icon = Icons.Filled.Headphones,
                label = headsetLabel,
                statusLine = headsetName,
                ok = headsetOk,
            )
            HorizontalDivider(color = scheme.outlineVariant.copy(alpha = 0.45f))
            SummaryStatusRow(
                icon = Icons.Filled.Bluetooth,
                label = stringResource(Res.string.onboarding_permissions_bluetooth_title),
                statusLine = bluetoothStatus,
                ok = bluetoothOk,
            )
            HorizontalDivider(color = scheme.outlineVariant.copy(alpha = 0.45f))
            SummaryStatusRow(
                icon = Icons.Filled.Notifications,
                label = stringResource(Res.string.onboarding_permissions_notifications_title),
                statusLine = notificationsStatus,
                ok = notificationsOk,
            )
        }
    }
}

@Composable
private fun SummaryStatusRow(
    icon: ImageVector,
    label: String,
    statusLine: String,
    ok: Boolean,
) {
    val scheme = MaterialTheme.colorScheme
    val statusColors = LocalBCOStatusColors.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        SurfaceIconBadge(icon = icon)
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.titleMedium,
                color = scheme.onSurface,
            )
            Text(
                text = statusLine,
                style = MaterialTheme.typography.bodyMedium,
                color = scheme.onSurfaceVariant,
            )
        }
        val (vector, tint) = if (ok) {
            Icons.Filled.CheckCircle to statusColors.connected
        } else {
            Icons.Filled.Warning to scheme.error
        }
        Icon(
            imageVector = vector,
            contentDescription = null,
            tint = tint,
            modifier = Modifier.size(28.dp),
        )
    }
}

@Composable
private fun SurfaceIconBadge(icon: ImageVector) {
    val scheme = MaterialTheme.colorScheme
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = scheme.primary.copy(alpha = 0.18f),
        modifier = Modifier.size(48.dp),
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = scheme.primary,
                modifier = Modifier.size(26.dp),
            )
        }
    }
}

@Composable
private fun BatteryOptimizationCard(
    unrestricted: Boolean,
    skipped: Boolean,
    onAllowUnrestricted: () -> Unit,
    onSkip: () -> Unit,
) {
    val scheme = MaterialTheme.colorScheme
    val statusColors = LocalBCOStatusColors.current
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = scheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                SurfaceIconBadge(icon = Icons.Filled.BatteryChargingFull)
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = stringResource(Res.string.onboarding_start_service_battery_title),
                        style = MaterialTheme.typography.titleMedium,
                        color = scheme.onSurface,
                    )
                    if (skipped && !unrestricted) {
                        Text(
                            text = stringResource(Res.string.onboarding_permissions_status_skipped),
                            style = MaterialTheme.typography.bodySmall,
                            color = scheme.onSurfaceVariant,
                        )
                    }
                }
                if (unrestricted) {
                    Icon(
                        imageVector = Icons.Filled.CheckCircle,
                        contentDescription = null,
                        tint = statusColors.connected,
                        modifier = Modifier.size(28.dp),
                    )
                }
            }
            Text(
                text = stringResource(Res.string.battery_optimization_hint),
                style = MaterialTheme.typography.bodyMedium,
                color = scheme.onSurfaceVariant,
            )
            when {
                unrestricted -> {
                    Text(
                        text = stringResource(Res.string.onboarding_start_service_battery_unrestricted),
                        style = MaterialTheme.typography.bodyMedium,
                        color = scheme.onSurfaceVariant,
                    )
                }
                skipped -> {
                    Text(
                        text = stringResource(Res.string.onboarding_start_service_battery_skipped_hint),
                        style = MaterialTheme.typography.bodySmall,
                        color = scheme.onSurfaceVariant,
                    )
                }
                else -> {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        TextButton(
                            onClick = onAllowUnrestricted,
                            colors = ButtonDefaults.textButtonColors(contentColor = LocalBCOExtendedColors.current.warningAccent),
                        ) {
                            Text(
                                text = stringResource(Res.string.onboarding_start_service_battery_allow_link),
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                        TextButton(onClick = onSkip) {
                            Text(stringResource(Res.string.onboarding_permissions_skip))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ServiceExplanationCard() {
    val scheme = MaterialTheme.colorScheme
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = scheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                text = stringResource(Res.string.onboarding_start_service_explanation_title),
                style = MaterialTheme.typography.titleMedium,
                color = scheme.onSurface,
            )
            Text(
                text = stringResource(Res.string.onboarding_start_service_explanation_body),
                style = MaterialTheme.typography.bodyMedium,
                color = scheme.onSurfaceVariant,
            )
        }
    }
}
