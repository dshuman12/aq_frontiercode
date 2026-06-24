package com.bco.shared.ui.onboarding

import androidx.compose.foundation.Image
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Laptop
import androidx.compose.material.icons.filled.LaptopMac
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.outlined.QrCode2
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import com.bco.shared.designsystem.component.BCOCard
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.bco.shared.resources.Res
import com.bco.shared.resources.*
import com.bco.shared.model.PairingRequest
import com.bco.shared.platform.LocalAppServiceBridge
import com.bco.shared.platform.LocalPreferencesProvider
import com.bco.shared.platform.LocalQrCodeProvider
import com.bco.shared.ui.devices.RadarScanAnimation
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import androidx.compose.runtime.collectAsState
import org.jetbrains.compose.resources.stringResource

private fun Color.toPackedArgb(): Long {
    val a = ((alpha * 255f) + 0.5f).toInt().coerceIn(0, 255)
    val r = ((red * 255f) + 0.5f).toInt().coerceIn(0, 255)
    val g = ((green * 255f) + 0.5f).toInt().coerceIn(0, 255)
    val b = ((blue * 255f) + 0.5f).toInt().coerceIn(0, 255)
    return ((a.toLong() shl 24) or (r.toLong() shl 16) or (g.toLong() shl 8) or b.toLong()) and 0xFFFFFFFFL
}

@Composable
fun OnboardingPairDeviceScreen(
    onContinue: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val scroll = rememberScrollState()
    val prefs = LocalPreferencesProvider.current
    val bridge = LocalAppServiceBridge.current
    val qrProvider = LocalQrCodeProvider.current
    val discovered by bridge.discoveredPeers.collectAsState()
    val serviceState by bridge.serviceUiState.collectAsState()

    LaunchedEffect(serviceState.peers.size) {
        if (serviceState.peers.isNotEmpty()) {
            prefs.onboardingComplete = true
            onContinue()
        }
    }

    var showQr by remember { mutableStateOf(false) }
    val qrFg = MaterialTheme.colorScheme.onSurface
    val qrBg = MaterialTheme.colorScheme.surface
    var qrImage by remember { mutableStateOf<ImageBitmap?>(null) }

    LaunchedEffect(showQr, qrFg, qrBg) {
        if (showQr && qrImage == null) {
            val addr = withContext(Dispatchers.Default) { bridge.getLocalAddressSnapshot() }
            if (addr != null) {
                qrImage = withContext(Dispatchers.Default) {
                    qrProvider.generateQrBitmap(
                        content = addr,
                        size = 512,
                        foregroundArgb = qrFg.toPackedArgb(),
                        backgroundArgb = qrBg.toPackedArgb(),
                    )
                }
            }
        }
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(scroll),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            text = stringResource(Res.string.onboarding_pair_device_title),
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.onSurface,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
        Text(
            text = stringResource(Res.string.onboarding_pair_device_subtitle),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(4.dp))

        RadarScanAnimation(
            scanning = true,
            size = 120.dp,
        )

        if (discovered.isNotEmpty()) {
            Spacer(Modifier.height(4.dp))
            discovered.forEach { peer ->
                OnboardingNearbyCard(peer = peer)
            }
        }

        if (!showQr) {
            TextButton(onClick = { showQr = true }) {
                Icon(
                    imageVector = Icons.Outlined.QrCode2,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                )
                Spacer(Modifier.width(6.dp))
                Text(stringResource(Res.string.onboarding_pair_device_show_qr))
            }
        } else {
            val img = qrImage
            if (img != null) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.surface,
                    tonalElevation = 4.dp,
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Box(
                            modifier = Modifier.fillMaxWidth(),
                            contentAlignment = Alignment.Center,
                        ) {
                            Image(
                                bitmap = img,
                                contentDescription = stringResource(Res.string.onboarding_pair_device_qr_description),
                                modifier = Modifier.size(180.dp),
                            )
                        }
                    }
                }
            }
        }

        Spacer(Modifier.height(4.dp))

        OutlinedButton(
            onClick = {
                prefs.onboardingComplete = true
                onContinue()
            },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = MaterialTheme.colorScheme.onSurfaceVariant,
            ),
        ) {
            Text(
                text = stringResource(Res.string.onboarding_pair_device_skip),
                modifier = Modifier.padding(vertical = 4.dp),
            )
        }
    }
}

@Composable
private fun OnboardingNearbyCard(peer: PairingRequest) {
    val bridge = LocalAppServiceBridge.current
    val scheme = MaterialTheme.colorScheme
    val platform = peer.platform?.lowercase()

    BCOCard(
        modifier = Modifier.fillMaxWidth(),
        containerColor = scheme.surfaceContainerHigh,
        borderColor = scheme.outline,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            val icon = when (platform) {
                "macos", "darwin" -> Icons.Filled.LaptopMac
                "android" -> Icons.Filled.PhoneAndroid
                else -> Icons.Filled.Laptop
            }
            Icon(
                imageVector = icon,
                contentDescription = platform ?: "unknown",
                tint = scheme.primary,
                modifier = Modifier.size(28.dp),
            )
            Column(Modifier.weight(1f)) {
                Text(
                    text = peer.peerName,
                    style = MaterialTheme.typography.titleSmall,
                    color = scheme.onSurface,
                )
                val subtitle = buildString {
                    val platformLabel = when (platform) {
                        "macos", "darwin" -> "macOS"
                        "android" -> "Android"
                        else -> null
                    }
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
