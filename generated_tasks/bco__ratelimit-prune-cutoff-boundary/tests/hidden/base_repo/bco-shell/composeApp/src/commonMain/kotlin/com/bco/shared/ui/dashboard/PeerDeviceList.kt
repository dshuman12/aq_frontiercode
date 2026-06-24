package com.bco.shared.ui.dashboard

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Laptop
import androidx.compose.material.icons.filled.LaptopMac
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.material.icons.outlined.DevicesOther
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.bco.shared.resources.Res
import com.bco.shared.resources.dashboard_add_device_body
import com.bco.shared.resources.dashboard_add_device_title
import com.bco.shared.resources.dashboard_peer_devices_title
import com.bco.shared.resources.dashboard_peer_online_count
import com.bco.shared.resources.peer_device_headset_different
import com.bco.shared.resources.peer_device_headset_different_icon_cd
import com.bco.shared.resources.peer_device_headset_group
import com.bco.shared.resources.peer_device_headset_holder
import com.bco.shared.resources.peer_device_offline
import com.bco.shared.resources.peer_device_online
import com.bco.shared.resources.peer_device_platform_android
import com.bco.shared.resources.peer_device_platform_macos
import com.bco.shared.resources.peer_device_platform_unknown
import com.bco.shared.resources.peer_device_priority_short
import com.bco.shared.resources.peer_device_version_mismatch
import com.bco.shared.resources.peer_device_version_mismatch_icon_cd
import com.bco.shared.resources.peer_list_all_offline
import com.bco.shared.resources.peer_status_paused
import com.bco.shared.model.PeerPlatform
import com.bco.shared.model.PeerUiState
import com.bco.shared.ui.adaptive.isAtLeastMedium
import com.bco.shared.designsystem.component.AudioStateBadge
import com.bco.shared.designsystem.component.BCOCard
import com.bco.shared.designsystem.tokens.LocalBCOStatusColors
import org.jetbrains.compose.resources.stringResource

private val PeerListSpacing = 8.dp
private val PresenceDotSize = 6.dp
private val PlatformIconBoxSize = 40.dp
private val PlatformIconGlyphSize = 20.dp

/**
 * Dashboard list of peers from [ServiceUiState]-style [PeerUiState] rows: platform, presence,
 * priority, pause, and [AudioStateBadge]. Uses [windowWidthSizeClass]: single column on compact,
 * two columns on medium and expanded. **Non-lazy** so it can sit inside a parent [LazyColumn]
 * without nested scrolling conflicts. Section header matches v0: "Peer Devices" with trailing online
 * count (e.g. "3 online"). When peers exist but none are online, an informational line is shown
 * above the cards.
 */
@Composable
fun PeerDeviceList(
    peers: List<PeerUiState>,
    windowWidthSizeClass: WindowWidthSizeClass,
    modifier: Modifier = Modifier,
    contentPadding: PaddingValues = PaddingValues(0.dp),
    localCoreVersion: String? = null,
    localHeadsetAddr: String? = null,
) {
    val useTwoColumns = windowWidthSizeClass.isAtLeastMedium()
    val onlineCount = peers.count { it.online }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(contentPadding),
        verticalArrangement = Arrangement.spacedBy(PeerListSpacing),
    ) {
        PeerDevicesSectionHeader(onlineCount = onlineCount)

        if (peers.isEmpty()) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.05f),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.25f)),
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Icon(
                        imageVector = Icons.Outlined.DevicesOther,
                        contentDescription = null,
                        modifier = Modifier.size(32.dp),
                        tint = MaterialTheme.colorScheme.primary,
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = stringResource(Res.string.dashboard_add_device_title),
                            style = MaterialTheme.typography.titleSmall,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                        Spacer(Modifier.height(2.dp))
                        Text(
                            text = stringResource(Res.string.dashboard_add_device_body),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
            return@Column
        }
        val allOffline = peers.none { it.online }
        if (allOffline) {
            Text(
                text = stringResource(Res.string.peer_list_all_offline),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        if (useTwoColumns) {
            peers.chunked(2).forEach { rowPeers ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(PeerListSpacing),
                ) {
                    rowPeers.forEach { peer ->
                        PeerDeviceCard(
                            peer = peer,
                            localCoreVersion = localCoreVersion,
                            localHeadsetAddr = localHeadsetAddr,
                            modifier = Modifier.weight(1f),
                        )
                    }
                    if (rowPeers.size == 1) {
                        Spacer(Modifier.weight(1f))
                    }
                }
            }
        } else {
            peers.forEach { peer ->
                PeerDeviceCard(
                    peer = peer,
                    localCoreVersion = localCoreVersion,
                    localHeadsetAddr = localHeadsetAddr,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}

@Composable
private fun PeerDevicesSectionHeader(
    onlineCount: Int,
    modifier: Modifier = Modifier,
) {
    val scheme = MaterialTheme.colorScheme
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = stringResource(Res.string.dashboard_peer_devices_title),
            style = MaterialTheme.typography.titleSmall,
            color = scheme.onSurface,
        )
        Text(
            text = stringResource(Res.string.dashboard_peer_online_count, onlineCount),
            style = MaterialTheme.typography.labelMedium,
            color = scheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun PeerDeviceCard(
    peer: PeerUiState,
    modifier: Modifier = Modifier,
    localCoreVersion: String? = null,
    localHeadsetAddr: String? = null,
) {
    val scheme = MaterialTheme.colorScheme
    val displayName = peer.name.trim().ifEmpty { peer.peerId }
    val cardModifier = modifier.then(if (peer.paused) Modifier.alpha(0.55f) else Modifier)
    val versionMismatch = localCoreVersion != null &&
        peer.coreVersion != null &&
        peer.coreVersion != localCoreVersion
    val headsetMismatch = localHeadsetAddr != null &&
        !peer.targetHeadsetAddr.isNullOrBlank() &&
        !peer.targetHeadsetAddr.equals(localHeadsetAddr, ignoreCase = true)

    val containerColor = when {
        peer.holdsHeadset -> scheme.primary.copy(alpha = 0.05f)
        else -> scheme.surface
    }
    val borderColor = when {
        peer.holdsHeadset -> scheme.primary.copy(alpha = 0.25f)
        else -> scheme.outline
    }

    BCOCard(
        modifier = cardModifier,
        containerColor = containerColor,
        borderColor = borderColor,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            PlatformIconInBox(
                platform = peer.platform,
                emphasized = peer.holdsHeadset,
            )
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        text = displayName,
                        style = MaterialTheme.typography.titleSmall,
                        color = scheme.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                    if (peer.holdsHeadset) {
                        val holderCd = stringResource(Res.string.peer_device_headset_holder)
                        Icon(
                            imageVector = Icons.Filled.WorkspacePremium,
                            contentDescription = holderCd,
                            tint = LocalBCOStatusColors.current.connecting,
                            modifier = Modifier.size(18.dp),
                        )
                    }
                }
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    PeerPresenceDot(online = peer.online)
                    Text(
                        text = if (peer.online) {
                            stringResource(Res.string.peer_device_online)
                        } else {
                            stringResource(Res.string.peer_device_offline)
                        },
                        style = MaterialTheme.typography.labelMedium,
                        color = scheme.onSurfaceVariant,
                    )
                    if (peer.paused) {
                        val pausedLabel = stringResource(Res.string.peer_status_paused)
                        Text(
                            text = "($pausedLabel)",
                            style = MaterialTheme.typography.labelMedium,
                            color = scheme.onSurfaceVariant,
                        )
                    }
                }
                val peerHeadsetName = peer.targetHeadsetName
                if (!peerHeadsetName.isNullOrBlank()) {
                    Text(
                        text = stringResource(Res.string.peer_device_headset_group, peerHeadsetName),
                        style = MaterialTheme.typography.labelSmall,
                        color = if (headsetMismatch) scheme.error else scheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                if (headsetMismatch) {
                    HeadsetMismatchBadge()
                }
                if (versionMismatch) {
                    VersionMismatchBadge(peerVersion = peer.coreVersion!!)
                }
            }
            Column(
                horizontalAlignment = Alignment.End,
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                AudioStateBadge(state = peer.audioState)
                Text(
                    text = stringResource(Res.string.peer_device_priority_short, peer.priorityScore),
                    style = MaterialTheme.typography.labelSmall,
                    color = scheme.onSurfaceVariant,
                    fontFamily = FontFamily.Monospace,
                )
            }
        }
    }
}

@Composable
private fun VersionMismatchBadge(peerVersion: String) {
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
private fun HeadsetMismatchBadge() {
    val scheme = MaterialTheme.colorScheme
    Surface(
        shape = RoundedCornerShape(50),
        color = scheme.tertiaryContainer,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Icon(
                imageVector = Icons.Filled.Warning,
                contentDescription = stringResource(Res.string.peer_device_headset_different_icon_cd),
                tint = scheme.onTertiaryContainer,
                modifier = Modifier.size(14.dp),
            )
            Text(
                text = stringResource(Res.string.peer_device_headset_different),
                style = MaterialTheme.typography.labelSmall,
                color = scheme.onTertiaryContainer,
            )
        }
    }
}

@Composable
private fun PlatformIconInBox(
    platform: PeerPlatform,
    emphasized: Boolean,
) {
    val scheme = MaterialTheme.colorScheme
    val boxColor = if (emphasized) {
        scheme.primary.copy(alpha = 0.15f)
    } else {
        scheme.surfaceContainerHighest
    }
    val iconTint = if (emphasized) scheme.primary else scheme.onSurfaceVariant
    Surface(
        modifier = Modifier.size(PlatformIconBoxSize),
        shape = RoundedCornerShape(12.dp),
        color = boxColor,
    ) {
        Box(contentAlignment = Alignment.Center) {
            PlatformIconGlyph(
                platform = platform,
                tint = iconTint,
                modifier = Modifier.size(PlatformIconGlyphSize),
            )
        }
    }
}

@Composable
private fun PlatformIconGlyph(
    platform: PeerPlatform,
    tint: Color,
    modifier: Modifier = Modifier,
) {
    val (icon, labelRes) = when (platform) {
        PeerPlatform.Android -> Icons.Filled.PhoneAndroid to Res.string.peer_device_platform_android
        PeerPlatform.MacOS -> Icons.Filled.LaptopMac to Res.string.peer_device_platform_macos
        PeerPlatform.Unknown -> Icons.Filled.Laptop to Res.string.peer_device_platform_unknown
    }
    val cd = stringResource(labelRes)
    Icon(
        imageVector = icon,
        contentDescription = cd,
        tint = tint,
        modifier = modifier,
    )
}

/**
 * Offline peer presence: same colors as [LocalBCOStatusColors] disconnected, without the “BCO”
 * wording from [ConnectionDot] semantics (that copy is for mesh connection state).
 */
@Composable
private fun PeerPresenceDot(
    online: Boolean,
    modifier: Modifier = Modifier,
) {
    val statusColors = LocalBCOStatusColors.current
    val color = if (online) statusColors.connected else statusColors.disconnected
    val desc = if (online) {
        stringResource(Res.string.peer_device_online)
    } else {
        stringResource(Res.string.peer_device_offline)
    }
    Box(
        modifier = modifier
            .semantics { contentDescription = desc }
            .size(PresenceDotSize)
            .clip(CircleShape)
            .background(color),
    )
}
