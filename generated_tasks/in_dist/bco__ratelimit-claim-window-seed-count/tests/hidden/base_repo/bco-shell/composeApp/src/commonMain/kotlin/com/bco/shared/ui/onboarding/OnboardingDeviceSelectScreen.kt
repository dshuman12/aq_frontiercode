package com.bco.shared.ui.onboarding

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Headphones
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Speaker
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.bco.shared.resources.Res
import com.bco.shared.resources.*
import com.bco.shared.platform.BluetoothA2dpTestResult
import com.bco.shared.platform.BluetoothDeviceInfo
import com.bco.shared.platform.BluetoothHeadsetIconKind
import com.bco.shared.platform.LocalBluetoothA2dpTester
import com.bco.shared.platform.LocalBluetoothDeviceProvider
import com.bco.shared.platform.LocalPlatformContext
import com.bco.shared.platform.LocalPreferencesProvider
import com.bco.shared.platform.isDesktopHost
import com.bco.shared.platform.rememberBondedAudioDevices
import com.bco.shared.designsystem.tokens.LocalBCOExtendedColors
import com.bco.shared.designsystem.tokens.LocalBCOStatusColors
import kotlinx.coroutines.launch
import kotlinx.datetime.Clock
import org.jetbrains.compose.resources.stringResource

private fun BluetoothDeviceInfo.headsetTypeIcon(): ImageVector = when (headsetIconKind) {
    BluetoothHeadsetIconKind.CarAudio -> Icons.Filled.DirectionsCar
    BluetoothHeadsetIconKind.PortableSpeaker -> Icons.Filled.Speaker
    BluetoothHeadsetIconKind.Headphones -> Icons.Filled.Headphones
}

/**
 * Onboarding device step: headset selection with paired-device cards and desktop-friendly
 * connected-state surfacing. Step chrome is shown by [OnboardingFlow] above this content.
 */
@Composable
fun OnboardingDeviceSelectScreen(
    refreshKey: Any?,
    onContinue: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val prefs = LocalPreferencesProvider.current
    val btProvider = LocalBluetoothDeviceProvider.current
    val a2dpTester = LocalBluetoothA2dpTester.current
    val platformContext = LocalPlatformContext.current
    val isDesktopHost = platformContext.isDesktopHost()
    val scope = rememberCoroutineScope()
    var showLeDevices by remember { mutableStateOf(false) }
    var testResult by remember { mutableStateOf<BluetoothA2dpTestResult>(BluetoothA2dpTestResult.None) }
    var selectedAddress by remember(refreshKey) {
        mutableStateOf(prefs.targetBTAddress)
    }

    val allDevices = rememberBondedAudioDevices(
        refreshKey = refreshKey,
        provider = btProvider,
    )
    val hasLeDevices = remember(allDevices) { allDevices.any { it.isLeOnly } }
    val devices = remember(allDevices, showLeDevices) {
        val filtered = if (showLeDevices) allDevices else allDevices.filter { !it.isLeOnly }
        filtered.sortedWith(
            compareByDescending<BluetoothDeviceInfo> { it.isConnected }
                .thenBy { device ->
                    device.name.takeIf { it.isNotBlank() }?.lowercase() ?: device.address.lowercase()
                }
                .thenBy { it.address.lowercase() },
        )
    }
    val matchingCount = devices.size
    val unnamed = stringResource(Res.string.device_bt_unnamed)
    val testErrorNoSelection = stringResource(Res.string.onboarding_device_select_test_error_no_selection)
    val testErrorBtOff = stringResource(Res.string.onboarding_device_select_test_error_bt_off)
    val testErrorNotBonded = stringResource(Res.string.onboarding_device_select_test_error_not_bonded)
    val testErrorNoA2dp = stringResource(Res.string.onboarding_device_select_test_error_no_a2dp)
    val testErrorNotConnected = stringResource(Res.string.onboarding_device_select_test_error_not_connected)
    val scheme = MaterialTheme.colorScheme
    val warningAccent = LocalBCOExtendedColors.current.warningAccent

    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            text = stringResource(Res.string.onboarding_device_select_title),
            style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
            color = MaterialTheme.colorScheme.onSurface,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
        Text(
            text = stringResource(Res.string.onboarding_device_select_subtitle),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )

        if (hasLeDevices && !isDesktopHost) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    text = stringResource(Res.string.onboarding_device_select_section_header),
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                LeToggleChip(
                    showLe = showLeDevices,
                    onClick = { showLeDevices = !showLeDevices },
                )
            }
        } else {
            Text(
                text = stringResource(Res.string.onboarding_device_select_section_header),
                modifier = Modifier.fillMaxWidth(),
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface,
            )
        }

        if (matchingCount == 0) {
            Text(
                text = stringResource(Res.string.onboarding_device_select_empty),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        } else {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                for (device in devices) {
                    val selected = selectedAddress != null &&
                        device.address.equals(selectedAddress, ignoreCase = true)
                    val isLe = device.isLeOnly
                    val title = device.name.takeIf { it.isNotBlank() } ?: unnamed

                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                prefs.targetBTAddress = device.address
                                prefs.targetBTName =
                                    device.name.takeIf { it.isNotBlank() } ?: ""
                                prefs.lastSelectedAt = Clock.System.now().toString()
                                selectedAddress = device.address
                                testResult = BluetoothA2dpTestResult.None
                            },
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (selected && isLe) {
                                warningAccent.copy(alpha = 0.08f)
                            } else {
                                scheme.surface
                            },
                        ),
                        border = if (selected) {
                            BorderStroke(
                                2.dp,
                                if (isLe) warningAccent.copy(alpha = 0.5f) else scheme.primary,
                            )
                        } else {
                            null
                        },
                        elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.spacedBy(14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = scheme.primary.copy(alpha = 0.18f),
                                modifier = Modifier.size(48.dp),
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        imageVector = device.headsetTypeIcon(),
                                        contentDescription = null,
                                        tint = scheme.primary,
                                        modifier = Modifier.size(26.dp),
                                    )
                                }
                            }
                            Column(modifier = Modifier.weight(1f)) {
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text(
                                        text = title,
                                        style = MaterialTheme.typography.titleMedium,
                                        color = scheme.onSurface,
                                    )
                                    if (device.isConnected) {
                                        ConnectedBadge()
                                    }
                                    if (isLe) {
                                        LeOnlyBadge()
                                    }
                                }
                                Text(
                                    text = device.address,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = scheme.onSurfaceVariant,
                                )
                                if (selected && isLe) {
                                    Text(
                                        text = stringResource(Res.string.onboarding_device_select_le_warning),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = warningAccent,
                                        modifier = Modifier.padding(top = 4.dp),
                                    )
                                }
                            }
                            if (selected) {
                                Icon(
                                    imageVector = Icons.Filled.Check,
                                    contentDescription = stringResource(
                                        Res.string.onboarding_device_select_selected_cd,
                                    ),
                                    tint = if (isLe) warningAccent else scheme.primary,
                                    modifier = Modifier.size(28.dp),
                                )
                            }
                        }
                    }
                }
            }
        }

        Button(
            onClick = {
                val addr = prefs.targetBTAddress
                if (addr.isNullOrBlank()) {
                    testResult = BluetoothA2dpTestResult.Error(testErrorNoSelection)
                } else {
                    testResult = BluetoothA2dpTestResult.Testing
                    scope.launch {
                        val result = a2dpTester.testA2dpForAddress(
                            address = addr,
                            errorBtOff = testErrorBtOff,
                            errorNotBonded = testErrorNotBonded,
                            errorNoA2dp = testErrorNoA2dp,
                            errorNotConnected = testErrorNotConnected,
                        )
                        testResult = result
                        if (result is BluetoothA2dpTestResult.Success) {
                            onContinue()
                        }
                    }
                }
            },
            enabled = testResult !is BluetoothA2dpTestResult.Testing,
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (testResult is BluetoothA2dpTestResult.Testing) {
                CircularProgressIndicator(
                    modifier = Modifier.size(18.dp),
                    strokeWidth = 2.dp,
                    color = scheme.onPrimary,
                )
                Spacer(modifier = Modifier.size(8.dp))
                Text(stringResource(Res.string.onboarding_device_select_test_testing))
            } else {
                Text(stringResource(Res.string.onboarding_device_select_continue))
            }
        }

        when (val r = testResult) {
            BluetoothA2dpTestResult.None,
            BluetoothA2dpTestResult.Testing,
            BluetoothA2dpTestResult.Success,
            -> { }
            is BluetoothA2dpTestResult.Error -> {
                Text(
                    text = r.message,
                    style = MaterialTheme.typography.bodyMedium,
                    color = scheme.error,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}

@Composable
private fun LeToggleChip(
    showLe: Boolean,
    onClick: () -> Unit,
) {
    val scheme = MaterialTheme.colorScheme
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(percent = 50),
        color = if (showLe) scheme.primaryContainer else Color.Transparent,
        border = BorderStroke(
            1.dp,
            if (showLe) scheme.primaryContainer else scheme.outline.copy(alpha = 0.5f),
        ),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = if (showLe) Icons.Filled.VisibilityOff else Icons.Filled.Info,
                contentDescription = null,
                tint = if (showLe) scheme.onPrimaryContainer else scheme.primary,
                modifier = Modifier.size(16.dp),
            )
            Text(
                text = stringResource(
                    if (showLe) {
                        Res.string.onboarding_device_select_hide_le
                    } else {
                        Res.string.onboarding_device_select_show_le
                    },
                ),
                style = MaterialTheme.typography.labelMedium,
                color = if (showLe) scheme.onPrimaryContainer else scheme.primary,
            )
        }
    }
}

@Composable
private fun LeOnlyBadge() {
    val warningAccent = LocalBCOExtendedColors.current.warningAccent
    Surface(
        shape = RoundedCornerShape(percent = 50),
        color = warningAccent.copy(alpha = 0.18f),
    ) {
        Text(
            text = stringResource(Res.string.device_bt_le_only_badge),
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.SemiBold,
            color = warningAccent,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
        )
    }
}

@Composable
private fun ConnectedBadge() {
    val statusColors = LocalBCOStatusColors.current
    Surface(
        shape = RoundedCornerShape(percent = 50),
        color = statusColors.connected.copy(alpha = 0.18f),
    ) {
        Text(
            text = stringResource(Res.string.bt_state_connected),
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.SemiBold,
            color = statusColors.connected,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
        )
    }
}
