package com.bco.shared.ui.dashboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.bco.shared.resources.Res
import com.bco.shared.resources.action_start_service
import com.bco.shared.resources.dashboard_service_active_badge
import com.bco.shared.resources.dashboard_service_stopped_title
import com.bco.shared.resources.dashboard_top_bar_title
import com.bco.shared.resources.error_generic
import com.bco.shared.resources.peer_action_failed
import com.bco.shared.platform.LocalAppServiceBridge
import com.bco.shared.platform.LocalPlatformActions
import com.bco.shared.ui.adaptive.isCompact
import com.bco.shared.ui.adaptive.isExpanded
import com.bco.shared.ui.adaptive.isMedium
import com.bco.shared.designsystem.tokens.LocalBCOStatusColors
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.jetbrains.compose.resources.stringResource

/**
 * Top app bar title for the dashboard route: **BCO** plus a green **Service Active** text badge when
 * the foreground service is running (v0 `5_dashboard.png`).
 */
@Composable
fun DashboardTopAppBarTitle(
    serviceRunning: Boolean,
    modifier: Modifier = Modifier,
) {
    val scheme = MaterialTheme.colorScheme
    val statusColors = LocalBCOStatusColors.current
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = stringResource(Res.string.dashboard_top_bar_title),
            style = MaterialTheme.typography.titleLarge,
            color = scheme.onSurface,
        )
        if (serviceRunning) {
            Spacer(Modifier.width(12.dp))
            Text(
                text = stringResource(Res.string.dashboard_service_active_badge),
                style = MaterialTheme.typography.labelLarge,
                color = statusColors.connected,
            )
        }
    }
}

/**
 * Dashboard: headset card, peer list, and service status. Observes [AppServiceBridge.serviceUiState].
 * When the foreground service is not running, shows an empty state with **Start** (same pattern as
 * settings when the service is stopped).
 */
@Composable
fun DashboardTab(
    windowWidthSizeClass: WindowWidthSizeClass,
    modifier: Modifier = Modifier,
) {
    val bridge = LocalAppServiceBridge.current
    val platformActions = LocalPlatformActions.current
    val state by bridge.serviceUiState.collectAsState()
    val errorGenericMessage = stringResource(Res.string.error_generic)
    val peerActionFailedMessage = stringResource(Res.string.peer_action_failed)
    val scope = rememberCoroutineScope()

    val horizontalPadding = dashboardHorizontalPadding(windowWidthSizeClass)

    if (!state.serviceRunning) {
        ServiceStoppedEmpty(
            modifier = modifier
                .fillMaxSize()
                .padding(horizontal = horizontalPadding)
                .padding(vertical = 24.dp),
            onStartService = { bridge.startService() },
        )
        return
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = horizontalPadding),
        contentPadding = PaddingValues(top = 16.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            HeadsetStatusCard(
                state = state,
                onForceConnectConfirmed = {
                    scope.launch {
                        val ok = withContext(Dispatchers.IO) {
                            bridge.forceConnectFromUi()
                        }
                        if (!ok) {
                            platformActions.showToast(errorGenericMessage)
                        }
                    }
                },
                onPauseToggle = { wantPaused ->
                    scope.launch {
                        val deviceId = withContext(Dispatchers.IO) {
                            bridge.getLocalDeviceIdSnapshot()
                        }
                        if (deviceId.isNullOrBlank()) {
                            platformActions.showToast(peerActionFailedMessage)
                            return@launch
                        }
                        val ok = withContext(Dispatchers.IO) {
                            if (wantPaused) {
                                bridge.pauseDeviceFromUi(deviceId)
                            } else {
                                bridge.resumeDeviceFromUi(deviceId)
                            }
                        }
                        if (!ok) {
                            platformActions.showToast(peerActionFailedMessage)
                        }
                    }
                },
            )
        }
        item {
            PeerDeviceList(
                peers = state.peers,
                windowWidthSizeClass = windowWidthSizeClass,
                localCoreVersion = state.localCoreVersion,
                localHeadsetAddr = state.localHeadsetAddr,
            )
        }
        item {
            SwitchAnalyticsCard(state = state)
        }
        item {
            ActivityFeed(events = state.activityEvents)
        }
    }
}

@Composable
internal fun ServiceStoppedEmpty(
    onStartService: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(
                text = stringResource(Res.string.dashboard_service_stopped_title),
                style = MaterialTheme.typography.headlineSmall,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center,
            )
            Button(onClick = onStartService) {
                Text(stringResource(Res.string.action_start_service))
            }
        }
    }
}

fun dashboardHorizontalPadding(widthClass: WindowWidthSizeClass) = when {
    widthClass.isCompact() -> 16.dp
    widthClass.isMedium() -> 24.dp
    widthClass.isExpanded() -> 32.dp
    else -> 16.dp
}
