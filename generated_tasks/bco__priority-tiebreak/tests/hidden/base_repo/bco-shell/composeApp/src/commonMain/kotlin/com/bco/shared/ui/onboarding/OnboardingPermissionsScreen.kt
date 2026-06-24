package com.bco.shared.ui.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bluetooth
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.bco.shared.resources.*
import com.bco.shared.platform.AppPermission
import com.bco.shared.platform.LocalPermissionHandler
import com.bco.shared.platform.PermissionStatus
import com.bco.shared.designsystem.tokens.LocalBCOStatusColors
import org.jetbrains.compose.resources.stringResource

private enum class PermissionSegmentState {
    Granted,
    Pending,
    Blocked,
}

/**
 * Onboarding permissions step (T027): Bluetooth is required and notifications are required on
 * Android 13+ so the foreground service stays visible.
 */
@Composable
fun OnboardingPermissionsScreen(
    refreshKey: Any?,
    onContinue: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val permissionHandler = LocalPermissionHandler.current

    var permissionCheckVersion by remember { mutableIntStateOf(0) }

    var bluetoothRequestAttempted by remember { mutableStateOf(false) }
    var lastBluetoothRequestOutcome by remember { mutableStateOf<PermissionStatus?>(null) }
    var notificationsAutoPrompted by remember { mutableStateOf(false) }
    var notificationsRequestAttempted by remember { mutableStateOf(false) }
    var lastNotificationsRequestOutcome by remember { mutableStateOf<PermissionStatus?>(null) }
    var phoneRequestAttempted by remember { mutableStateOf(false) }
    var lastPhoneRequestOutcome by remember { mutableStateOf<PermissionStatus?>(null) }

    val btGranted = remember(permissionHandler, permissionCheckVersion, refreshKey) {
        permissionHandler.getPermissionStatus(AppPermission.Bluetooth) == PermissionStatus.Granted
    }
    val notifStatus = remember(permissionHandler, permissionCheckVersion, refreshKey) {
        permissionHandler.getPermissionStatus(AppPermission.Notifications)
    }
    val notifPre33 = notifStatus == PermissionStatus.NotRequired
    val notifGranted = notifStatus == PermissionStatus.Granted

    val phoneStatus = remember(permissionHandler, permissionCheckVersion, refreshKey) {
        permissionHandler.getPermissionStatus(AppPermission.PhoneState)
    }
    val phoneNotRequired = phoneStatus == PermissionStatus.NotRequired
    val phoneGranted = phoneStatus == PermissionStatus.Granted
    val showPhoneCard = !phoneNotRequired

    val btBlocked = bluetoothRequestAttempted &&
        !btGranted &&
        lastBluetoothRequestOutcome == PermissionStatus.DeniedPermanently
    val notifBlocked = notificationsRequestAttempted &&
        !notifGranted &&
        lastNotificationsRequestOutcome == PermissionStatus.DeniedPermanently
    val phoneBlocked = phoneRequestAttempted &&
        !phoneGranted &&
        lastPhoneRequestOutcome == PermissionStatus.DeniedPermanently

    val notifDone = notifPre33 || notifGranted

    val segments = buildList {
        add(btGranted)
        add(notifDone)
        if (showPhoneCard) add(phoneGranted)
    }
    val grantedCount = segments.count { it }
    val totalCount = segments.size

    val btSegment = remember(btGranted, btBlocked) {
        when {
            btGranted -> PermissionSegmentState.Granted
            btBlocked -> PermissionSegmentState.Blocked
            else -> PermissionSegmentState.Pending
        }
    }
    val notifSegment = remember(notifPre33, notifDone, notifBlocked) {
        when {
            notifPre33 -> PermissionSegmentState.Granted
            notifGranted -> PermissionSegmentState.Granted
            notifBlocked -> PermissionSegmentState.Blocked
            else -> PermissionSegmentState.Pending
        }
    }
    val phoneSegment = remember(phoneGranted, phoneBlocked, phoneNotRequired) {
        when {
            phoneNotRequired -> PermissionSegmentState.Granted
            phoneGranted -> PermissionSegmentState.Granted
            phoneBlocked -> PermissionSegmentState.Blocked
            else -> PermissionSegmentState.Pending
        }
    }

    LaunchedEffect(btGranted, notifPre33, notifGranted, notificationsAutoPrompted) {
        if (!btGranted) return@LaunchedEffect
        if (notifPre33 || notifGranted) return@LaunchedEffect
        if (notificationsAutoPrompted) return@LaunchedEffect

        notificationsAutoPrompted = true
        permissionHandler.requestPermission(AppPermission.Notifications) { status ->
            notificationsRequestAttempted = true
            lastNotificationsRequestOutcome = status
            permissionCheckVersion++
        }
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = stringResource(Res.string.onboarding_permissions_title),
            style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
            color = Color.White,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
        Text(
            text = stringResource(Res.string.onboarding_permissions_subtitle),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )

        Text(
            text = stringResource(
                Res.string.onboarding_permissions_granted_count,
                grantedCount,
                totalCount,
            ),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.fillMaxWidth(),
        )

        PermissionSegmentProgressBar(
            segments = buildList {
                add(btSegment)
                add(notifSegment)
                if (showPhoneCard) add(phoneSegment)
            },
            modifier = Modifier.fillMaxWidth(),
        )

        BluetoothPermissionCard(
            granted = btGranted,
            blocked = btBlocked,
            onGrant = {
                permissionHandler.requestPermission(AppPermission.Bluetooth) { status ->
                    bluetoothRequestAttempted = true
                    lastBluetoothRequestOutcome = status
                    permissionCheckVersion++
                }
            },
            onOpenSettings = { permissionHandler.openAppSettings() },
        )

        if (notifPre33) {
            NotificationsNotRequiredCard()
        } else {
            NotificationPermissionCard(
                granted = notifGranted,
                blocked = notifBlocked,
                onGrant = {
                    permissionHandler.requestPermission(AppPermission.Notifications) { status ->
                        notificationsRequestAttempted = true
                        lastNotificationsRequestOutcome = status
                        permissionCheckVersion++
                    }
                },
                onOpenSettings = { permissionHandler.openNotificationSettings() },
            )
        }

        if (showPhoneCard) {
            PhoneStatePermissionCard(
                granted = phoneGranted,
                blocked = phoneBlocked,
                onGrant = {
                    permissionHandler.requestPermission(AppPermission.PhoneState) { status ->
                        phoneRequestAttempted = true
                        lastPhoneRequestOutcome = status
                        permissionCheckVersion++
                    }
                },
                onOpenSettings = { permissionHandler.openAppSettings() },
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        Button(
            onClick = onContinue,
            enabled = btGranted && notifDone,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(stringResource(Res.string.permission_continue))
        }
    }
}

@Composable
private fun PermissionSegmentProgressBar(
    segments: List<PermissionSegmentState>,
    modifier: Modifier = Modifier,
) {
    val statusColors = LocalBCOStatusColors.current
    val scheme = MaterialTheme.colorScheme
    Row(
        modifier = modifier.height(8.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        segments.forEach { state ->
            val color = when (state) {
                PermissionSegmentState.Granted -> statusColors.connected
                PermissionSegmentState.Pending -> statusColors.connecting
                PermissionSegmentState.Blocked -> scheme.error
            }
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(8.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(color),
            )
        }
    }
}

@Composable
private fun BluetoothPermissionCard(
    granted: Boolean,
    blocked: Boolean,
    onGrant: () -> Unit,
    onOpenSettings: () -> Unit,
) {
    PermissionCardFrame(
        icon = Icons.Filled.Bluetooth,
        title = stringResource(Res.string.onboarding_permissions_bluetooth_title),
        description = stringResource(Res.string.permission_rationale_bluetooth),
        primaryBadge = when {
            granted -> stringResource(Res.string.onboarding_permissions_status_granted)
            else -> stringResource(Res.string.onboarding_permissions_required_badge)
        },
        badgeStyle = if (granted) PermissionBadgeStyle.Granted else PermissionBadgeStyle.Required,
        trailingStatus = when {
            granted -> TrailingPermissionStatus.Check
            blocked -> TrailingPermissionStatus.WarningError
            else -> TrailingPermissionStatus.WarningPending
        },
        actions = {
            when {
                granted -> { }
                blocked -> {
                    TextButton(onClick = onOpenSettings) {
                        Text(stringResource(Res.string.permission_open_settings))
                    }
                }
                else -> {
                    @OptIn(ExperimentalLayoutApi::class)
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(0.dp),
                    ) {
                        Button(onClick = onGrant) {
                            Text(stringResource(Res.string.onboarding_permissions_grant))
                        }
                        TextButton(onClick = onOpenSettings) {
                            Text(stringResource(Res.string.onboarding_permissions_open_settings_link))
                        }
                    }
                }
            }
        },
    )
}

@Composable
private fun NotificationPermissionCard(
    granted: Boolean,
    blocked: Boolean,
    onGrant: () -> Unit,
    onOpenSettings: () -> Unit,
) {
    val badgeText = if (granted) {
        stringResource(Res.string.onboarding_permissions_status_granted)
    } else {
        stringResource(Res.string.onboarding_permissions_required_badge)
    }
    val trailingStatus = when {
        granted -> TrailingPermissionStatus.Check
        blocked -> TrailingPermissionStatus.WarningError
        else -> TrailingPermissionStatus.WarningPending
    }
    PermissionCardFrame(
        icon = Icons.Filled.Notifications,
        title = stringResource(Res.string.onboarding_permissions_notifications_title),
        description = stringResource(Res.string.permission_rationale_notifications),
        primaryBadge = badgeText,
        badgeStyle = if (granted) PermissionBadgeStyle.Granted else PermissionBadgeStyle.Required,
        trailingStatus = trailingStatus,
        actions = {
            when {
                granted -> { }
                blocked -> {
                    Text(
                        text = stringResource(Res.string.permission_blocked_notifications),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    TextButton(onClick = onOpenSettings) {
                        Text(stringResource(Res.string.permission_open_settings))
                    }
                }
                else -> {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Warning,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(16.dp),
                        )
                        Text(
                            text = stringResource(Res.string.onboarding_permissions_notifications_required_pending),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error,
                        )
                    }
                    @OptIn(ExperimentalLayoutApi::class)
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(0.dp),
                    ) {
                        Button(onClick = onGrant) {
                            Text(stringResource(Res.string.onboarding_permissions_grant))
                        }
                        TextButton(onClick = onOpenSettings) {
                            Text(stringResource(Res.string.onboarding_permissions_open_settings_link))
                        }
                    }
                }
            }
        },
    )
}

@Composable
private fun PhoneStatePermissionCard(
    granted: Boolean,
    blocked: Boolean,
    onGrant: () -> Unit,
    onOpenSettings: () -> Unit,
) {
    PermissionCardFrame(
        icon = Icons.Filled.Phone,
        title = stringResource(Res.string.onboarding_permissions_phone_title),
        description = stringResource(Res.string.permission_rationale_phone_state),
        primaryBadge = when {
            granted -> stringResource(Res.string.onboarding_permissions_status_granted)
            else -> stringResource(Res.string.onboarding_permissions_optional_badge)
        },
        badgeStyle = when {
            granted -> PermissionBadgeStyle.Granted
            else -> PermissionBadgeStyle.Optional
        },
        trailingStatus = when {
            granted -> TrailingPermissionStatus.Check
            blocked -> TrailingPermissionStatus.WarningError
            else -> TrailingPermissionStatus.WarningPending
        },
        actions = {
            when {
                granted -> { }
                blocked -> {
                    Text(
                        text = stringResource(Res.string.permission_blocked_phone_state),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    TextButton(onClick = onOpenSettings) {
                        Text(stringResource(Res.string.permission_open_settings))
                    }
                }
                else -> {
                    @OptIn(ExperimentalLayoutApi::class)
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(0.dp),
                    ) {
                        OutlinedButton(onClick = onGrant) {
                            Text(stringResource(Res.string.onboarding_permissions_grant))
                        }
                        TextButton(onClick = onOpenSettings) {
                            Text(stringResource(Res.string.onboarding_permissions_open_settings_link))
                        }
                    }
                }
            }
        },
    )
}

@Composable
private fun NotificationsNotRequiredCard() {
    PermissionCardFrame(
        icon = Icons.Filled.Notifications,
        title = stringResource(Res.string.onboarding_permissions_notifications_title),
        description = stringResource(Res.string.onboarding_permissions_notifications_not_required),
        primaryBadge = stringResource(Res.string.onboarding_permissions_status_granted),
        badgeStyle = PermissionBadgeStyle.Granted,
        trailingStatus = TrailingPermissionStatus.Check,
        actions = { },
    )
}

private enum class TrailingPermissionStatus {
    Check,
    WarningPending,
    WarningError,
}

private enum class PermissionBadgeStyle {
    Granted,
    Required,
    Optional,
}

@Composable
private fun PermissionCardFrame(
    icon: ImageVector,
    title: String,
    description: String,
    primaryBadge: String,
    badgeStyle: PermissionBadgeStyle,
    trailingStatus: TrailingPermissionStatus,
    actions: @Composable () -> Unit,
) {
    val scheme = MaterialTheme.colorScheme
    val statusColors = LocalBCOStatusColors.current
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = scheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            verticalAlignment = Alignment.Top,
        ) {
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
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.titleMedium,
                        color = scheme.onSurface,
                    )
                    StatusBadge(text = primaryBadge, style = badgeStyle)
                }
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = scheme.onSurfaceVariant,
                )
                actions()
            }
            val (trailingIcon, trailingTint) = when (trailingStatus) {
                TrailingPermissionStatus.Check -> Icons.Filled.CheckCircle to statusColors.connected
                TrailingPermissionStatus.WarningPending -> Icons.Filled.Warning to statusColors.connecting
                TrailingPermissionStatus.WarningError -> Icons.Filled.Warning to scheme.error
            }
            Icon(
                imageVector = trailingIcon,
                contentDescription = null,
                tint = trailingTint,
                modifier = Modifier.size(28.dp),
            )
        }
    }
}

@Composable
private fun StatusBadge(
    text: String,
    style: PermissionBadgeStyle,
) {
    val scheme = MaterialTheme.colorScheme
    val (bg, fg) = when (style) {
        PermissionBadgeStyle.Granted -> scheme.primaryContainer to scheme.onPrimaryContainer
        PermissionBadgeStyle.Required -> scheme.errorContainer to scheme.onErrorContainer
        PermissionBadgeStyle.Optional -> scheme.surfaceVariant to scheme.onSurfaceVariant
    }
    Surface(
        shape = RoundedCornerShape(percent = 50),
        color = bg,
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.SemiBold,
            color = fg,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
        )
    }
}
