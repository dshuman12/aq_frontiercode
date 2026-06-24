package com.bco.shared.ui.devices

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.HelpOutline
import androidx.compose.material.icons.filled.LaptopMac
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.bco.shared.resources.Res
import com.bco.shared.resources.devices_connected_peers_empty
import com.bco.shared.resources.devices_connected_peers_section_subtitle
import com.bco.shared.resources.devices_connected_peers_section_title
import com.bco.shared.resources.peer_device_platform_android
import com.bco.shared.resources.peer_device_platform_macos
import com.bco.shared.resources.peer_device_platform_unknown
import com.bco.shared.resources.peer_device_priority
import com.bco.shared.resources.peer_device_version_mismatch
import com.bco.shared.resources.peer_device_version_mismatch_icon_cd
import com.bco.shared.resources.peer_status_connected
import com.bco.shared.model.PeerPlatform
import com.bco.shared.model.PeerUiState
import com.bco.shared.designsystem.component.BCOCard
import com.bco.shared.designsystem.component.AudioStateBadge
import org.jetbrains.compose.resources.stringResource

/**
 * Lists transport-connected peers. [PeerUiState.online] mirrors core `connected` in peer snapshots.
 */
@Composable
fun ConnectedPeersSection(
    peers: List<PeerUiState>,
    modifier: Modifier = Modifier,
    localCoreVersion: String? = null,
) {
    val connected = peers.filter { it.online }
    val scheme = MaterialTheme.colorScheme

    BCOCard(
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(
                text = stringResource(Res.string.devices_connected_peers_section_title),
                style = MaterialTheme.typography.titleMedium,
                color = scheme.onSurface,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = stringResource(Res.string.devices_connected_peers_section_subtitle),
                style = MaterialTheme.typography.bodySmall,
                color = scheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(12.dp))
            if (connected.isEmpty()) {
                Text(
                    text = stringResource(Res.string.devices_connected_peers_empty),
                    style = MaterialTheme.typography.bodyMedium,
                    color = scheme.onSurfaceVariant,
                )
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    connected.forEach { peer ->
                        ConnectedPeerRow(peer = peer, localCoreVersion = localCoreVersion)
                    }
                }
            }
        }
    }
}

@Composable
private fun ConnectedPeerRow(
    peer: PeerUiState,
    localCoreVersion: String? = null,
) {
    val scheme = MaterialTheme.colorScheme
    val displayName = peer.name.trim().ifEmpty { peer.peerId }
    val platform = peer.resolvedPlatform()
    val versionMismatch = localCoreVersion != null &&
        peer.coreVersion != null &&
        peer.coreVersion != localCoreVersion

    BCOCard(
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                ConnectedPeerPlatformIcon(platform = platform)
                Column(Modifier.weight(1f)) {
                    Text(
                        text = displayName,
                        style = MaterialTheme.typography.titleSmall,
                        color = scheme.onSurface,
                    )
                    Text(
                        text = stringResource(Res.string.peer_status_connected),
                        style = MaterialTheme.typography.labelMedium,
                        color = scheme.primary,
                    )
                    Text(
                        text = stringResource(Res.string.peer_device_priority, peer.priorityScore),
                        style = MaterialTheme.typography.bodySmall,
                        color = scheme.onSurfaceVariant,
                    )
                    if (versionMismatch) {
                        Spacer(Modifier.height(2.dp))
                        ConnectedPeerVersionMismatchBadge(peerVersion = peer.coreVersion!!)
                    }
                }
            }
            AudioStateBadge(state = peer.audioState, modifier = Modifier.fillMaxWidth())
        }
    }
}

@Composable
private fun ConnectedPeerVersionMismatchBadge(peerVersion: String) {
    val scheme = MaterialTheme.colorScheme
    Surface(
        shape = RoundedCornerShape(50),
        color = scheme.errorContainer,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Icon(
                imageVector = Icons.Filled.Warning,
                contentDescription = stringResource(Res.string.peer_device_version_mismatch_icon_cd),
                tint = scheme.onErrorContainer,
                modifier = Modifier.size(14.dp),
            )
            Text(
                text = stringResource(Res.string.peer_device_version_mismatch, peerVersion),
                style = MaterialTheme.typography.labelSmall,
                color = scheme.onErrorContainer,
            )
        }
    }
}

@Composable
private fun ConnectedPeerPlatformIcon(platform: PeerPlatform) {
    val (icon, labelRes) = when (platform) {
        PeerPlatform.Android -> Icons.Filled.PhoneAndroid to Res.string.peer_device_platform_android
        PeerPlatform.MacOS -> Icons.Filled.LaptopMac to Res.string.peer_device_platform_macos
        PeerPlatform.Unknown -> Icons.AutoMirrored.Filled.HelpOutline to Res.string.peer_device_platform_unknown
    }
    Icon(
        imageVector = icon,
        contentDescription = stringResource(labelRes),
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
