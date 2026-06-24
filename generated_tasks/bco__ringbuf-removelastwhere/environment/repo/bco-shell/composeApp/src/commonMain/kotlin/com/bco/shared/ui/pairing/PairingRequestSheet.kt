package com.bco.shared.ui.pairing

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Laptop
import androidx.compose.material.icons.outlined.PhoneAndroid
import androidx.compose.material.icons.outlined.QuestionMark
import androidx.compose.material.icons.outlined.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.bco.shared.resources.Res
import com.bco.shared.resources.pairing_sheet_approve
import com.bco.shared.resources.pairing_sheet_compare_code_hint
import com.bco.shared.resources.pairing_sheet_compare_code_label
import com.bco.shared.resources.pairing_sheet_decline
import com.bco.shared.resources.pairing_sheet_headset_label
import com.bco.shared.resources.pairing_sheet_headset_match
import com.bco.shared.resources.pairing_sheet_headset_unknown
import com.bco.shared.resources.pairing_sheet_mismatch_warning
import com.bco.shared.resources.pairing_sheet_platform_android
import com.bco.shared.resources.pairing_sheet_platform_macos
import com.bco.shared.resources.pairing_sheet_platform_unknown
import com.bco.shared.model.PairingRequest
import com.bco.shared.platform.LocalAppServiceBridge
import org.jetbrains.compose.resources.stringResource

@Composable
fun PairingRequestSheet(
    request: PairingRequest?,
    localBtDeviceName: String?,
) {
    val req = request ?: return
    val bridge = LocalAppServiceBridge.current

    val isBtMismatch = req.targetBtDevice != null &&
        localBtDeviceName != null &&
        !req.targetBtDevice.equals(localBtDeviceName, ignoreCase = true)

    val isBtMatch = req.targetBtDevice != null &&
        localBtDeviceName != null &&
        req.targetBtDevice.equals(localBtDeviceName, ignoreCase = true)

    Dialog(
        onDismissRequest = { },
        properties = DialogProperties(
            dismissOnBackPress = false,
            dismissOnClickOutside = false,
            usePlatformDefaultWidth = false,
        ),
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
            shape = RoundedCornerShape(24.dp),
            color = MaterialTheme.colorScheme.surface,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                val platformIcon = when (req.platform?.lowercase()) {
                    "macos" -> Icons.Outlined.Laptop
                    "android" -> Icons.Outlined.PhoneAndroid
                    else -> Icons.Outlined.QuestionMark
                }
                val platformLabel = when (req.platform?.lowercase()) {
                    "macos" -> stringResource(Res.string.pairing_sheet_platform_macos)
                    "android" -> stringResource(Res.string.pairing_sheet_platform_android)
                    else -> stringResource(Res.string.pairing_sheet_platform_unknown)
                }

                Icon(
                    imageVector = platformIcon,
                    contentDescription = platformLabel,
                    modifier = Modifier.size(48.dp),
                    tint = MaterialTheme.colorScheme.primary,
                )
                Spacer(Modifier.height(12.dp))

                Text(
                    text = req.peerName,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = TextAlign.Center,
                )
                Text(
                    text = platformLabel,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(20.dp))

                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                Spacer(Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = stringResource(Res.string.pairing_sheet_headset_label),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.weight(1f))
                    val btDevice = req.targetBtDevice
                    if (btDevice != null) {
                        Text(
                            text = btDevice,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium,
                        )
                    } else {
                        Text(
                            text = stringResource(Res.string.pairing_sheet_headset_unknown),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }

                if (isBtMatch) {
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = stringResource(Res.string.pairing_sheet_headset_match),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.fillMaxWidth(),
                        textAlign = TextAlign.End,
                    )
                }

                if (isBtMismatch) {
                    Spacer(Modifier.height(12.dp))
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.errorContainer,
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                imageVector = Icons.Outlined.Warning,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp),
                                tint = MaterialTheme.colorScheme.error,
                            )
                            Spacer(Modifier.width(8.dp))
                            Text(
                                text = stringResource(Res.string.pairing_sheet_mismatch_warning),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onErrorContainer,
                            )
                        }
                    }
                }

                Spacer(Modifier.height(20.dp))

                Text(
                    text = stringResource(Res.string.pairing_sheet_compare_code_label),
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(8.dp))
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.05f),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.25f)),
                ) {
                    Text(
                        text = req.compareCode,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 16.dp),
                        style = MaterialTheme.typography.headlineLarge.copy(
                            fontFamily = FontFamily.Monospace,
                            letterSpacing = 6.sp,
                        ),
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    text = stringResource(Res.string.pairing_sheet_compare_code_hint),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(24.dp))

                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Button(
                        onClick = { bridge.approvePeer(req.peerId) },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !isBtMismatch,
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        Text(
                            text = stringResource(Res.string.pairing_sheet_approve),
                            modifier = Modifier.padding(vertical = 4.dp),
                        )
                    }
                    OutlinedButton(
                        onClick = { bridge.denyPeer(req.peerId) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = MaterialTheme.colorScheme.onSurfaceVariant,
                        ),
                    ) {
                        Text(
                            text = stringResource(Res.string.pairing_sheet_decline),
                            modifier = Modifier.padding(vertical = 4.dp),
                        )
                    }
                }
            }
        }
    }
}
