package com.bco.shared.ui.devices

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LaptopMac
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.bco.shared.resources.Res
import com.bco.shared.resources.action_close
import com.bco.shared.resources.action_copy
import com.bco.shared.resources.devices_trusted_peers_add_dialog_title
import com.bco.shared.resources.devices_trusted_peers_add_link
import com.bco.shared.resources.devices_trusted_peers_address_loading
import com.bco.shared.resources.devices_trusted_peers_address_unavailable
import com.bco.shared.resources.devices_trusted_peers_empty
import com.bco.shared.resources.devices_trusted_peers_manual_connect
import com.bco.shared.resources.devices_trusted_peers_qr_description
import com.bco.shared.resources.devices_trusted_peers_section_title
import com.bco.shared.resources.devices_trusted_peer_active_paired_subtitle
import com.bco.shared.resources.devices_trusted_peer_last_seen
import com.bco.shared.resources.devices_trusted_peer_last_seen_offline
import com.bco.shared.resources.devices_trusted_peer_not_available
import com.bco.shared.resources.devices_trusted_peer_paired_comma
import com.bco.shared.resources.manual_connect_cancel
import com.bco.shared.resources.peer_action_failed
import com.bco.shared.resources.peer_action_remove
import com.bco.shared.resources.peer_device_headset_group
import com.bco.shared.resources.peer_device_platform_android
import com.bco.shared.resources.peer_device_platform_macos
import com.bco.shared.resources.peer_device_platform_unknown
import com.bco.shared.resources.peer_remove_confirm
import com.bco.shared.resources.peer_remove_message
import com.bco.shared.resources.peer_remove_title
import com.bco.shared.resources.peer_row_this_device
import com.bco.shared.resources.toast_address_copied
import com.bco.shared.model.PeerPlatform
import com.bco.shared.model.PeerUiState
import com.bco.shared.designsystem.component.BCOCard
import com.bco.shared.platform.LocalAppServiceBridge
import com.bco.shared.platform.LocalPlatformActions
import com.bco.shared.platform.LocalQrCodeProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.jetbrains.compose.resources.stringResource

private const val QrCodeSizePx = 512

/**
 * Devices tab: trusted peer list with platform styling, remove with confirmation, and **Add device**
 * flow — QR + shareable multiaddr and [ManualConnectDialog] for dial-out.
 */
@Composable
fun TrustedPeersSection(
    peers: List<PeerUiState>,
    localDeviceId: String?,
    modifier: Modifier = Modifier,
    localHeadsetAddr: String? = null,
) {
    val bridge = LocalAppServiceBridge.current
    val platformActions = LocalPlatformActions.current
    val scope = rememberCoroutineScope()
    var showAddDialog by remember { mutableStateOf(false) }
    var showManualConnect by remember { mutableStateOf(false) }
    val scheme = MaterialTheme.colorScheme
    val peerFailed = stringResource(Res.string.peer_action_failed)

    fun runRemove(block: () -> Boolean) {
        scope.launch {
            val ok = withContext(Dispatchers.IO) { block() }
            if (ok) {
                bridge.bumpPeerListRefreshEpoch()
            } else {
                platformActions.showToast(peerFailed)
            }
        }
    }

    BCOCard(
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = stringResource(Res.string.devices_trusted_peers_section_title),
                    style = MaterialTheme.typography.titleMedium,
                    color = scheme.onSurface,
                )
                TextButton(
                    onClick = { showAddDialog = true },
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                ) {
                    Text(
                        text = stringResource(Res.string.devices_trusted_peers_add_link),
                        style = MaterialTheme.typography.labelLarge,
                        color = scheme.primary,
                    )
                }
            }
            Spacer(Modifier.height(12.dp))
            HorizontalDivider()
            Spacer(Modifier.height(8.dp))
            if (peers.isEmpty()) {
                Text(
                    text = stringResource(Res.string.devices_trusted_peers_empty),
                    style = MaterialTheme.typography.bodyMedium,
                    color = scheme.onSurfaceVariant,
                )
            } else {
                Column {
                    peers.forEachIndexed { index, peer ->
                        if (index > 0) {
                            HorizontalDivider(color = scheme.outlineVariant)
                        }
                        val isLocal = localDeviceId != null && localDeviceId == peer.peerId
                        TrustedPeerRow(
                            peer = peer,
                            isLocal = isLocal,
                            localHeadsetAddr = localHeadsetAddr,
                            onRemoveClick = { runRemove { bridge.removePeerFromUi(peer.peerId) } },
                        )
                    }
                }
            }
        }
    }

    TrustedPeerAddDialog(
        visible = showAddDialog,
        onDismiss = { showAddDialog = false },
        onOpenManualConnect = {
            showAddDialog = false
            showManualConnect = true
        },
    )
    ManualConnectDialog(
        visible = showManualConnect,
        onDismiss = { showManualConnect = false },
    )
}

@Composable
private fun TrustedPeerAddDialog(
    visible: Boolean,
    onDismiss: () -> Unit,
    onOpenManualConnect: () -> Unit,
) {
    if (!visible) return

    val bridge = LocalAppServiceBridge.current
    val platformActions = LocalPlatformActions.current
    val qrProvider = LocalQrCodeProvider.current
    var address by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(visible) {
        if (visible) {
            loading = true
            address = null
            address = withContext(Dispatchers.IO) { bridge.getLocalAddressSnapshot() }
            loading = false
        }
    }

    val fgArgb = MaterialTheme.colorScheme.onSurface.packedArgb64()
    val bgArgb = MaterialTheme.colorScheme.surface.packedArgb64()
    var qrImage by remember { mutableStateOf<ImageBitmap?>(null) }
    LaunchedEffect(address, fgArgb, bgArgb) {
        val addr = address?.trim()?.takeIf { it.isNotEmpty() }
        qrImage = if (addr == null) {
            null
        } else {
            withContext(Dispatchers.Default) {
                qrProvider.generateQrBitmap(addr, QrCodeSizePx, fgArgb, bgArgb)
            }
        }
    }

    val copiedToast = stringResource(Res.string.toast_address_copied)

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(Res.string.devices_trusted_peers_add_dialog_title)) },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                when {
                    loading -> Text(stringResource(Res.string.devices_trusted_peers_address_loading))
                    address.isNullOrBlank() -> Text(
                        stringResource(Res.string.devices_trusted_peers_address_unavailable),
                    )
                    else -> {
                        val addr = address!!
                        val qrDesc = stringResource(Res.string.devices_trusted_peers_qr_description)
                        qrImage?.let { bmp ->
                            Box(
                                modifier = Modifier.fillMaxWidth(),
                                contentAlignment = Alignment.Center,
                            ) {
                                Image(
                                    bitmap = bmp,
                                    contentDescription = qrDesc,
                                    modifier = Modifier.size(200.dp),
                                )
                            }
                        }
                        Text(
                            text = addr,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier.fillMaxWidth(),
                            textAlign = TextAlign.Start,
                        )
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            TextButton(
                                onClick = {
                                    platformActions.copyToClipboard(addr, "BCO address")
                                    platformActions.showToast(copiedToast)
                                },
                            ) {
                                Text(stringResource(Res.string.action_copy))
                            }
                        }
                    }
                }
                OutlinedButton(
                    onClick = onOpenManualConnect,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(stringResource(Res.string.devices_trusted_peers_manual_connect))
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(Res.string.action_close))
            }
        },
    )
}

@Composable
private fun TrustedPeerRow(
    peer: PeerUiState,
    isLocal: Boolean,
    localHeadsetAddr: String? = null,
    onRemoveClick: () -> Unit,
) {
    val scheme = MaterialTheme.colorScheme
    val displayName = peer.name.trim().ifEmpty { peer.peerId }
    val platform = peer.resolvedPlatform()
    var showRemoveConfirm by remember { mutableStateOf(false) }
    val headsetMismatch = localHeadsetAddr != null &&
        !peer.targetHeadsetAddr.isNullOrBlank() &&
        !peer.targetHeadsetAddr.equals(localHeadsetAddr, ignoreCase = true)

    val lastSeenOfflineText = when {
        !peer.lastSeen.isNullOrBlank() -> peer.lastSeen!!
        else -> stringResource(Res.string.devices_trusted_peer_last_seen_offline)
    }
    val pairedDateDisplay = peer.pairedDate?.takeIf { it.isNotBlank() }
        ?: stringResource(Res.string.devices_trusted_peer_not_available)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        TrustedPlatformIcon(platform = platform)
        Column(Modifier.weight(1f)) {
            Text(
                text = displayName,
                style = MaterialTheme.typography.titleSmall,
                color = scheme.onSurface,
            )
            if (isLocal) {
                Text(
                    text = stringResource(Res.string.peer_row_this_device),
                    style = MaterialTheme.typography.labelMedium,
                    color = scheme.primary,
                )
            }
            if (peer.online) {
                Text(
                    text = stringResource(
                        Res.string.devices_trusted_peer_active_paired_subtitle,
                        pairedDateDisplay,
                    ),
                    style = MaterialTheme.typography.bodySmall,
                    color = scheme.onSurfaceVariant,
                )
            } else {
                Text(
                    text = stringResource(
                        Res.string.devices_trusted_peer_last_seen,
                        lastSeenOfflineText,
                    ),
                    style = MaterialTheme.typography.bodySmall,
                    color = scheme.onSurfaceVariant,
                )
                Text(
                    text = stringResource(
                        Res.string.devices_trusted_peer_paired_comma,
                        pairedDateDisplay,
                    ),
                    style = MaterialTheme.typography.bodySmall,
                    color = scheme.onSurfaceVariant,
                )
            }
            val peerHeadsetName = peer.targetHeadsetName
            if (!peerHeadsetName.isNullOrBlank()) {
                Text(
                    text = stringResource(Res.string.peer_device_headset_group, peerHeadsetName),
                    style = MaterialTheme.typography.labelSmall,
                    color = if (headsetMismatch) scheme.error else scheme.onSurfaceVariant,
                )
            }
        }
        val removeLabel = stringResource(Res.string.peer_action_remove)
        IconButton(
            onClick = { showRemoveConfirm = true },
            enabled = !isLocal,
            modifier = Modifier.semantics { this.contentDescription = removeLabel },
        ) {
            Icon(
                imageVector = Icons.Outlined.Delete,
                contentDescription = null,
                tint = scheme.onSurfaceVariant,
            )
        }
    }

    if (showRemoveConfirm) {
        AlertDialog(
            onDismissRequest = { showRemoveConfirm = false },
            title = { Text(stringResource(Res.string.peer_remove_title)) },
            text = {
                Text(stringResource(Res.string.peer_remove_message, displayName))
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showRemoveConfirm = false
                        onRemoveClick()
                    },
                ) {
                    Text(stringResource(Res.string.peer_remove_confirm))
                }
            },
            dismissButton = {
                TextButton(onClick = { showRemoveConfirm = false }) {
                    Text(stringResource(Res.string.manual_connect_cancel))
                }
            },
        )
    }
}

@Composable
private fun TrustedPlatformIcon(platform: PeerPlatform) {
    val (icon, labelRes) = when (platform) {
        PeerPlatform.Android -> Icons.Filled.PhoneAndroid to Res.string.peer_device_platform_android
        PeerPlatform.MacOS -> Icons.Filled.LaptopMac to Res.string.peer_device_platform_macos
        PeerPlatform.Unknown -> Icons.Filled.LaptopMac to Res.string.peer_device_platform_unknown
    }
    val cd = stringResource(labelRes)
    Icon(
        imageVector = icon,
        contentDescription = cd,
        tint = MaterialTheme.colorScheme.primary,
        modifier = Modifier.size(28.dp),
    )
}

private fun PeerUiState.resolvedPlatform(): PeerPlatform {
    if (platform != PeerPlatform.Unknown) return platform
    return inferPlatformFromDeviceName(name)
}

private fun inferPlatformFromDeviceName(name: String): PeerPlatform {
    val s = name.lowercase()
    return when {
        "pixel" in s || "galaxy" in s || "android" in s || "oneplus" in s ||
            "oppo" in s || "xiaomi" in s || "redmi" in s || "motorola" in s ||
            "nothing" in s || "realme" in s -> PeerPlatform.Android
        "iphone" in s || "ipad" in s || "macbook" in s || "imac" in s ||
            "mac mini" in s || "mac pro" in s -> PeerPlatform.MacOS
        else -> PeerPlatform.Unknown
    }
}

private fun Color.packedArgb64(): Long {
    fun ch(c: Float) = (((c.coerceIn(0f, 1f)) * 255f) + 0.5f).toLong() and 0xFFL
    val a = ch(alpha)
    val r = ch(red)
    val g = ch(green)
    val b = ch(blue)
    return (a shl 24) or (r shl 16) or (g shl 8) or b
}
