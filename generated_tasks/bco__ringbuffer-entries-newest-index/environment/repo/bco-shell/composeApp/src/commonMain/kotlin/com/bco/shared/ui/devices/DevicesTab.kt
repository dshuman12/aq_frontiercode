package com.bco.shared.ui.devices

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Laptop
import androidx.compose.material.icons.filled.LaptopMac
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Link
import androidx.compose.material.icons.outlined.QrCode2
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.bco.shared.resources.Res
import com.bco.shared.resources.discovery_connect
import com.bco.shared.resources.discovery_manual_connect
import com.bco.shared.resources.discovery_no_nearby
import com.bco.shared.resources.discovery_no_paired
import com.bco.shared.resources.discovery_offline
import com.bco.shared.resources.discovery_online
import com.bco.shared.resources.discovery_qr_description
import com.bco.shared.resources.discovery_remove
import com.bco.shared.resources.discovery_section_nearby
import com.bco.shared.resources.discovery_section_your_devices
import com.bco.shared.resources.discovery_show_qr
import com.bco.shared.resources.devices_trusted_peers_address_loading
import com.bco.shared.resources.devices_trusted_peers_address_unavailable
import com.bco.shared.resources.manual_connect_cancel
import com.bco.shared.resources.onboarding_pair_device_waiting
import com.bco.shared.resources.peer_action_failed
import com.bco.shared.resources.peer_remove_confirm
import com.bco.shared.resources.peer_remove_message
import com.bco.shared.resources.peer_remove_title
import com.bco.shared.resources.peer_row_this_device
import com.bco.shared.model.PairingRequest
import com.bco.shared.model.PeerPlatform
import com.bco.shared.designsystem.component.BCOCard
import com.bco.shared.model.PeerUiState
import com.bco.shared.platform.LocalAppServiceBridge
import com.bco.shared.platform.LocalPlatformActions
import com.bco.shared.platform.LocalQrCodeProvider
import com.bco.shared.ui.dashboard.ServiceStoppedEmpty
import com.bco.shared.ui.dashboard.dashboardHorizontalPadding
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.jetbrains.compose.resources.stringResource

@Composable
fun DevicesTab(
    windowWidthSizeClass: WindowWidthSizeClass,
    connectionMsToday: () -> Long,
    @Suppress("UNUSED_PARAMETER") onNavigateToUpgrade: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val bridge = LocalAppServiceBridge.current
    val platformActions = LocalPlatformActions.current
    val state by bridge.serviceUiState.collectAsState()
    val discovered by bridge.discoveredPeers.collectAsState()

    val horizontalPadding = dashboardHorizontalPadding(windowWidthSizeClass)
    val peerFailed = stringResource(Res.string.peer_action_failed)

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

    val pairedPeers = state.peers
    val nearbyPeers = discovered.filter { req ->
        pairedPeers.none { it.peerId == req.peerId }
    }

    var showManualConnect by remember { mutableStateOf(false) }
    var showQrCode by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = horizontalPadding),
        contentPadding = PaddingValues(top = 16.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            RadarScanAnimation(
                scanning = true,
                size = 140.dp,
            )
        }

        item {
            CurrentHeadsetCard(
                state = state,
                connectionMsToday = connectionMsToday,
                onHeadsetChanged = { bridge.startService() },
            )
        }

        item {
            SectionHeader(stringResource(Res.string.discovery_section_nearby))
        }

        if (nearbyPeers.isEmpty()) {
            item {
                Text(
                    text = stringResource(Res.string.discovery_no_nearby),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 4.dp),
                )
            }
        } else {
            items(nearbyPeers, key = { it.peerId }) { peer ->
                NearbyDeviceCard(peer = peer)
            }
        }

        item { Spacer(Modifier.height(4.dp)) }

        item {
            SectionHeader(stringResource(Res.string.discovery_section_your_devices))
        }

        if (pairedPeers.isEmpty()) {
            item {
                Text(
                    text = stringResource(Res.string.discovery_no_paired),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 4.dp),
                )
            }
        } else {
            val localDeviceId = bridge.getLocalDeviceIdSnapshot()
            items(pairedPeers, key = { it.peerId }) { peer ->
                PairedDeviceCard(
                    peer = peer,
                    localDeviceId = localDeviceId,
                    peerActionFailedMessage = peerFailed,
                )
            }
        }

        item { Spacer(Modifier.height(4.dp)) }

        item {
            QrAndManualRow(
                showQrCode = showQrCode,
                onToggleQr = { showQrCode = !showQrCode },
                onManualConnect = { showManualConnect = true },
            )
        }
    }

    ManualConnectDialog(
        visible = showManualConnect,
        onDismiss = { showManualConnect = false },
    )
}

@Composable
private fun SectionHeader(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(horizontal = 4.dp),
    )
}

@Composable
private fun NearbyDeviceCard(
    peer: PairingRequest,
) {
    val bridge = LocalAppServiceBridge.current
    val scheme = MaterialTheme.colorScheme
    val platform = peer.platform?.lowercase()

    BCOCard(
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            PlatformIcon(platform = platform)
            Column(Modifier.weight(1f)) {
                Text(
                    text = peer.peerName,
                    style = MaterialTheme.typography.titleSmall,
                    color = scheme.onSurface,
                )
                val platformLabel = when (platform) {
                    "macos", "darwin" -> "macOS"
                    "android" -> "Android"
                    else -> null
                }
                val subtitle = buildString {
                    if (platformLabel != null) append(platformLabel)
                    if (peer.targetBtDevice != null) {
                        if (isNotEmpty()) append(" · ")
                        append(peer.targetBtDevice)
                    }
                }
                if (subtitle.isNotEmpty()) {
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = scheme.onSurfaceVariant,
                    )
                }
            }
            Button(
                onClick = { bridge.approvePeer(peer.peerId) },
                shape = RoundedCornerShape(12.dp),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            ) {
                Text(stringResource(Res.string.discovery_connect))
            }
        }
    }
}

@Composable
private fun PairedDeviceCard(
    peer: PeerUiState,
    localDeviceId: String?,
    peerActionFailedMessage: String,
) {
    val bridge = LocalAppServiceBridge.current
    val platformActions = LocalPlatformActions.current
    val scheme = MaterialTheme.colorScheme
    val scope = rememberCoroutineScope()
    val isLocal = localDeviceId != null && localDeviceId == peer.peerId
    var showRemoveConfirm by remember { mutableStateOf(false) }
    val displayName = peer.name.trim().ifEmpty { peer.peerId }

    val platform = when (peer.platform) {
        PeerPlatform.MacOS -> "macos"
        PeerPlatform.Android -> "android"
        else -> null
    }

    BCOCard(
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            PlatformIcon(platform = platform)
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = displayName,
                        style = MaterialTheme.typography.titleSmall,
                        color = scheme.onSurface,
                    )
                    if (isLocal) {
                        Spacer(Modifier.width(6.dp))
                        Text(
                            text = stringResource(Res.string.peer_row_this_device),
                            style = MaterialTheme.typography.labelSmall,
                            color = scheme.primary,
                        )
                    }
                }
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Surface(
                        shape = CircleShape,
                        color = if (peer.online) scheme.primary else scheme.outlineVariant,
                        modifier = Modifier.size(8.dp),
                    ) {}
                    Text(
                        text = if (peer.online) {
                            stringResource(Res.string.discovery_online)
                        } else {
                            stringResource(Res.string.discovery_offline)
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = scheme.onSurfaceVariant,
                    )
                }
            }
            if (!isLocal) {
                val removeLabel = stringResource(Res.string.discovery_remove)
                IconButton(
                    onClick = { showRemoveConfirm = true },
                    modifier = Modifier.semantics { this.contentDescription = removeLabel },
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Delete,
                        contentDescription = null,
                        tint = scheme.onSurfaceVariant,
                    )
                }
            }
        }
    }

    if (showRemoveConfirm) {
        AlertDialog(
            onDismissRequest = { showRemoveConfirm = false },
            title = { Text(stringResource(Res.string.peer_remove_title)) },
            text = { Text(stringResource(Res.string.peer_remove_message, displayName)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        showRemoveConfirm = false
                        scope.launch {
                            val ok = withContext(Dispatchers.IO) {
                                bridge.removePeerFromUi(peer.peerId)
                            }
                            if (ok) {
                                bridge.bumpPeerListRefreshEpoch()
                            } else {
                                platformActions.showToast(peerActionFailedMessage)
                            }
                        }
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
private fun PlatformIcon(platform: String?) {
    val icon = when (platform) {
        "macos", "darwin" -> Icons.Filled.LaptopMac
        "android" -> Icons.Filled.PhoneAndroid
        else -> Icons.Filled.Laptop
    }
    Icon(
        imageVector = icon,
        contentDescription = platform ?: "unknown",
        tint = MaterialTheme.colorScheme.primary,
        modifier = Modifier.size(28.dp),
    )
}

@Composable
private fun QrAndManualRow(
    showQrCode: Boolean,
    onToggleQr: () -> Unit,
    onManualConnect: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            TextButton(onClick = onToggleQr) {
                Icon(Icons.Outlined.QrCode2, null, Modifier.size(16.dp))
                Spacer(Modifier.width(4.dp))
                Text(stringResource(Res.string.discovery_show_qr), style = MaterialTheme.typography.labelMedium)
            }
            Text(" · ", color = MaterialTheme.colorScheme.onSurfaceVariant)
            TextButton(onClick = onManualConnect) {
                Icon(Icons.Outlined.Link, null, Modifier.size(16.dp))
                Spacer(Modifier.width(4.dp))
                Text(stringResource(Res.string.discovery_manual_connect), style = MaterialTheme.typography.labelMedium)
            }
        }

        if (showQrCode) {
            QrCodeCard()
        }
    }
}

@Composable
private fun QrCodeCard() {
    val bridge = LocalAppServiceBridge.current
    val qrProvider = LocalQrCodeProvider.current
    val qrFg = MaterialTheme.colorScheme.onSurface
    val qrBg = MaterialTheme.colorScheme.surface
    val fgArgb = qrFg.packedArgb64()
    val bgArgb = qrBg.packedArgb64()

    var qrImage by remember { mutableStateOf<ImageBitmap?>(null) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(fgArgb, bgArgb) {
        loading = true
        val addr = withContext(Dispatchers.IO) { bridge.getLocalAddressSnapshot() }
        if (addr != null) {
            qrImage = withContext(Dispatchers.Default) {
                qrProvider.generateQrBitmap(addr, 512, fgArgb, bgArgb)
            }
        } else {
            qrImage = null
        }
        loading = false
    }

    BCOCard(
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            val img = qrImage
            if (img != null) {
                Box(
                    modifier = Modifier.fillMaxWidth(),
                    contentAlignment = Alignment.Center,
                ) {
                    Image(
                        bitmap = img,
                        contentDescription = stringResource(Res.string.discovery_qr_description),
                        modifier = Modifier.size(200.dp),
                    )
                }
                Spacer(Modifier.height(8.dp))
                Text(
                    text = stringResource(Res.string.onboarding_pair_device_waiting),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                )
            } else if (loading) {
                Text(
                    text = stringResource(Res.string.devices_trusted_peers_address_loading),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                Text(
                    text = stringResource(Res.string.devices_trusted_peers_address_unavailable),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
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
