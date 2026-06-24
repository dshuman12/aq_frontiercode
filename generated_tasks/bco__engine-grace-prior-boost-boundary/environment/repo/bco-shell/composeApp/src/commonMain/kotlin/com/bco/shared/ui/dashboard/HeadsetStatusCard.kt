package com.bco.shared.ui.dashboard

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Headphones
import androidx.compose.material.icons.filled.OfflineBolt
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.bco.shared.resources.Res
import com.bco.shared.resources.action_connect_peer
import com.bco.shared.resources.audio_state_active
import com.bco.shared.resources.audio_state_idle
import com.bco.shared.resources.audio_state_incoming
import com.bco.shared.resources.audio_state_media
import com.bco.shared.resources.force_connect_confirm_message
import com.bco.shared.resources.force_connect_default_peer_name
import com.bco.shared.resources.headset_bt_holder_label
import com.bco.shared.resources.headset_bt_holder_none
import com.bco.shared.resources.headset_bt_holder_peer
import com.bco.shared.resources.headset_bt_holder_this_device
import com.bco.shared.resources.headset_card_active_headset_label
import com.bco.shared.resources.headset_status_audio_state_unknown
import com.bco.shared.resources.headset_status_connection_connected
import com.bco.shared.resources.headset_status_connection_connecting
import com.bco.shared.resources.headset_status_connection_disconnected
import com.bco.shared.resources.headset_status_force_connect
import com.bco.shared.resources.headset_status_headset_icon_description
import com.bco.shared.resources.headset_status_headset_unknown
import com.bco.shared.resources.headset_status_held_by_banner
import com.bco.shared.resources.headset_status_pause_bco
import com.bco.shared.resources.headset_status_pause_switch_description
import com.bco.shared.resources.headset_status_resume_bco
import com.bco.shared.resources.manual_connect_cancel
import com.bco.shared.model.AudioState
import com.bco.shared.model.ConnectionState
import com.bco.shared.model.ServiceUiState
import com.bco.shared.designsystem.component.AudioStateBadge
import com.bco.shared.designsystem.component.BCOCard
import com.bco.shared.designsystem.component.ConnectionDot
import com.bco.shared.designsystem.component.ForceConnectConfirmDialog
import com.bco.shared.designsystem.tokens.LocalBCOStatusColors
import org.jetbrains.compose.resources.stringResource

/**
 * Whether Force Connect should show a confirmation dialog (overriding a peer on a call).
 * Idle/Media on the holder, or no holder, connects immediately per spec US2 scenarios 3–4.
 */
private fun shouldConfirmForceConnect(state: ServiceUiState): Boolean {
    state.currentHolderName?.takeIf { it.isNotBlank() } ?: return false
    return when (state.currentHolderAudioState) {
        AudioState.IncomingCall, AudioState.ActiveCall -> true
        AudioState.Idle, AudioState.Media, null -> false
    }
}

/**
 * Dashboard card summarizing headset, mesh connection, audio, holder, quick actions, and uptime.
 */
@Composable
fun HeadsetStatusCard(
    state: ServiceUiState,
    onForceConnectConfirmed: () -> Unit,
    onPauseToggle: (paused: Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    var showForceConnectConfirm by remember { mutableStateOf(false) }
    val scheme = MaterialTheme.colorScheme
    val headsetDisplay = state.headsetName?.takeIf { it.isNotBlank() }
        ?: stringResource(Res.string.headset_status_headset_unknown)

    if (showForceConnectConfirm) {
        val resolvedName = state.currentHolderName?.takeIf { it.isNotBlank() }
            ?: stringResource(Res.string.force_connect_default_peer_name)
        ForceConnectConfirmDialog(
            message = stringResource(Res.string.force_connect_confirm_message, resolvedName),
            confirmLabel = stringResource(Res.string.action_connect_peer),
            dismissLabel = stringResource(Res.string.manual_connect_cancel),
            onDismiss = { showForceConnectConfirm = false },
            onConfirm = {
                showForceConnectConfirm = false
                onForceConnectConfirmed()
            },
        )
    }

    val holderName = state.currentHolderName?.takeIf { it.isNotBlank() }
    val holderAudioLabel = holderAudioStateBannerText(state.currentHolderAudioState)

    val statusColors = LocalBCOStatusColors.current
    val connectionTextColor = when (state.connectionState) {
        ConnectionState.Connected -> statusColors.connected
        ConnectionState.Connecting -> statusColors.connecting
        ConnectionState.Disconnected -> statusColors.disconnected
    }

    BCOCard(
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(start = 20.dp, end = 20.dp, top = 20.dp, bottom = 16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Column(Modifier.weight(1f)) {
                    Text(
                        text = stringResource(Res.string.headset_card_active_headset_label),
                        style = MaterialTheme.typography.labelSmall,
                        color = scheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = headsetDisplay,
                        style = MaterialTheme.typography.titleLarge,
                        color = scheme.onSurface,
                    )
                }
                Surface(
                    modifier = Modifier.size(48.dp),
                    shape = RoundedCornerShape(16.dp),
                    color = scheme.primary.copy(alpha = 0.10f),
                    border = BorderStroke(1.dp, scheme.primary.copy(alpha = 0.15f)),
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Filled.Headphones,
                            contentDescription = stringResource(Res.string.headset_status_headset_icon_description),
                            tint = scheme.primary,
                            modifier = Modifier.size(24.dp),
                        )
                    }
                }
            }
            Spacer(Modifier.height(16.dp))

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                ConnectionDot(state = state.connectionState)
                Text(
                    text = connectionStatusLabel(state.connectionState),
                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                    color = connectionTextColor,
                )
                Text(
                    text = "·",
                    style = MaterialTheme.typography.bodyMedium,
                    color = scheme.outlineVariant,
                )
                AudioStateBadge(state = state.audioState)
            }

            Spacer(Modifier.height(12.dp))
            BluetoothHolderRow(state = state)

            if (holderName != null && !state.localHoldsBluetooth) {
                Spacer(Modifier.height(16.dp))
                val holderBanner = stringResource(
                    Res.string.headset_status_held_by_banner,
                    holderName,
                    holderAudioLabel,
                )
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = scheme.surfaceContainerHighest,
                    border = BorderStroke(1.dp, scheme.outlineVariant),
                    modifier = Modifier.semantics { contentDescription = holderBanner },
                ) {
                    Text(
                        text = holderBanner,
                        style = MaterialTheme.typography.bodySmall,
                        color = scheme.onSurface,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                    )
                }
            }
        }

        HorizontalDivider(color = scheme.outlineVariant)

        val pauseDesc = stringResource(Res.string.headset_status_pause_switch_description)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(IntrinsicSize.Min),
        ) {
            if (!state.localHoldsBluetooth) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clickable {
                            if (shouldConfirmForceConnect(state)) {
                                showForceConnectConfirm = true
                            } else {
                                onForceConnectConfirmed()
                            }
                        }
                        .padding(vertical = 14.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Icon(
                            imageVector = Icons.Filled.OfflineBolt,
                            contentDescription = null,
                            tint = scheme.primary,
                            modifier = Modifier.size(14.dp),
                        )
                        Text(
                            text = stringResource(Res.string.headset_status_force_connect),
                            style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold),
                            color = scheme.primary,
                        )
                    }
                }
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .width(1.dp)
                        .background(scheme.outlineVariant),
                )
            }
            Box(
                modifier = Modifier
                    .weight(1f)
                    .clickable { onPauseToggle(!state.paused) }
                    .semantics { contentDescription = pauseDesc }
                    .padding(vertical = 14.dp),
                contentAlignment = Alignment.Center,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Icon(
                        imageVector = if (state.paused) Icons.Filled.PlayArrow else Icons.Filled.Pause,
                        contentDescription = null,
                        tint = scheme.onSurfaceVariant,
                        modifier = Modifier.size(14.dp),
                    )
                    Text(
                        text = if (state.paused) {
                            stringResource(Res.string.headset_status_resume_bco)
                        } else {
                            stringResource(Res.string.headset_status_pause_bco)
                        },
                        style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold),
                        color = scheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

@Composable
private fun BluetoothHolderRow(state: ServiceUiState) {
    val scheme = MaterialTheme.colorScheme
    val statusColors = LocalBCOStatusColors.current
    val currentHolder = state.currentHolderName?.takeIf { it.isNotBlank() }
    val holderLabel = when {
        state.localHoldsBluetooth -> stringResource(Res.string.headset_bt_holder_this_device)
        currentHolder != null -> stringResource(
            Res.string.headset_bt_holder_peer,
            currentHolder,
        )
        else -> stringResource(Res.string.headset_bt_holder_none)
    }
    val dotColor = if (state.localHoldsBluetooth || state.currentHolderName != null) {
        statusColors.connected
    } else {
        scheme.onSurfaceVariant
    }
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            text = stringResource(Res.string.headset_bt_holder_label),
            style = MaterialTheme.typography.labelMedium,
            color = scheme.onSurfaceVariant,
        )
        Surface(
            shape = RoundedCornerShape(50),
            color = dotColor.copy(alpha = 0.12f),
        ) {
            Text(
                text = holderLabel,
                style = MaterialTheme.typography.labelMedium,
                color = dotColor,
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            )
        }
    }
}

@Composable
private fun holderAudioStateBannerText(state: AudioState?): String = when (state) {
    null -> stringResource(Res.string.headset_status_audio_state_unknown)
    AudioState.Idle -> stringResource(Res.string.audio_state_idle)
    AudioState.Media -> stringResource(Res.string.audio_state_media)
    AudioState.IncomingCall -> stringResource(Res.string.audio_state_incoming)
    AudioState.ActiveCall -> stringResource(Res.string.audio_state_active)
}

@Composable
private fun connectionStatusLabel(state: ConnectionState): String = stringResource(
    when (state) {
        ConnectionState.Connected -> Res.string.headset_status_connection_connected
        ConnectionState.Connecting -> Res.string.headset_status_connection_connecting
        ConnectionState.Disconnected -> Res.string.headset_status_connection_disconnected
    },
)
