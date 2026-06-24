package com.bco.shared.ui.devices

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.outlined.Headphones
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.bco.shared.resources.Res
import com.bco.shared.resources.action_ok
import com.bco.shared.resources.devices_current_headset_change
import com.bco.shared.resources.devices_current_headset_change_content_description
import com.bco.shared.resources.devices_switches_today_label
import com.bco.shared.resources.devices_uptime_today_label
import com.bco.shared.resources.headset_status_duration_hm
import com.bco.shared.resources.headset_status_duration_ms
import com.bco.shared.resources.headset_status_duration_s
import com.bco.shared.resources.headset_status_duration_zero
import com.bco.shared.resources.headset_status_headset_unknown
import com.bco.shared.resources.onboarding_device_select_empty
import com.bco.shared.resources.onboarding_device_select_test_error_bt_off
import com.bco.shared.resources.onboarding_device_select_test_error_no_a2dp
import com.bco.shared.resources.onboarding_device_select_test_error_not_bonded
import com.bco.shared.resources.onboarding_device_select_test_error_not_connected
import com.bco.shared.resources.onboarding_device_select_title
import com.bco.shared.resources.onboarding_start_service_headset_no_address
import com.bco.shared.model.ServiceUiState
import com.bco.shared.platform.BluetoothA2dpTestResult
import com.bco.shared.designsystem.component.BCOCard
import com.bco.shared.platform.BluetoothDeviceInfo
import com.bco.shared.platform.LocalAppServiceBridge
import com.bco.shared.platform.LocalBluetoothA2dpTester
import com.bco.shared.platform.LocalBluetoothDeviceProvider
import com.bco.shared.platform.LocalPreferencesProvider
import com.bco.shared.platform.rememberBondedAudioDevices
import kotlinx.coroutines.launch
import kotlin.time.Duration.Companion.milliseconds
import org.jetbrains.compose.resources.stringResource

/**
 * Devices tab card: headset icon, name/MAC, side-by-side uptime and switch stats, and a chevron
 * "Change" row (opens [DeviceSelector]).
 */
@Composable
fun CurrentHeadsetCard(
    state: ServiceUiState,
    connectionMsToday: () -> Long,
    modifier: Modifier = Modifier,
    /** When this changes (e.g. activity resume counter), the selector list refreshes. */
    deviceListRefreshKey: Any? = null,
    onHeadsetChanged: () -> Unit = {},
) {
    var showSelector by remember { mutableStateOf(false) }
    var selectorRefresh by remember { mutableIntStateOf(0) }
    val scheme = MaterialTheme.colorScheme
    val preferences = LocalPreferencesProvider.current
    val bridge = LocalAppServiceBridge.current
    val btTester = LocalBluetoothA2dpTester.current

    val headsetDisplay = state.headsetName?.takeIf { it.isNotBlank() }
        ?: stringResource(Res.string.headset_status_headset_unknown)
    val macDisplay = state.headsetMac?.takeIf { it.isNotBlank() }
        ?: stringResource(Res.string.onboarding_start_service_headset_no_address)
    val btMsToday = connectionMsToday()
    val uptimeValue = formatElapsedMs(btMsToday)
    val changeRowCd = stringResource(Res.string.devices_current_headset_change_content_description)

    if (showSelector) {
        var pendingDevice by remember { mutableStateOf<BluetoothDeviceInfo?>(null) }
        var testResult by remember { mutableStateOf<BluetoothA2dpTestResult>(BluetoothA2dpTestResult.None) }
        val dialogScope = rememberCoroutineScope()
        val testErrorBtOff = stringResource(Res.string.onboarding_device_select_test_error_bt_off)
        val testErrorNotBonded = stringResource(Res.string.onboarding_device_select_test_error_not_bonded)
        val testErrorNoA2dp = stringResource(Res.string.onboarding_device_select_test_error_no_a2dp)
        val testErrorNotConnected = stringResource(Res.string.onboarding_device_select_test_error_not_connected)
        AlertDialog(
            onDismissRequest = {
                if (testResult !is BluetoothA2dpTestResult.Testing) {
                    showSelector = false
                }
            },
            title = {
                Text(
                    text = stringResource(Res.string.onboarding_device_select_title),
                    style = MaterialTheme.typography.titleLarge,
                )
            },
            text = {
                val btProvider = LocalBluetoothDeviceProvider.current
                Column(
                    modifier = Modifier
                        .heightIn(max = 400.dp)
                        .verticalScroll(rememberScrollState()),
                ) {
                    val bonded = rememberBondedAudioDevices(
                        refreshKey = Pair(deviceListRefreshKey, selectorRefresh),
                        provider = btProvider,
                    )
                    if (bonded.isEmpty()) {
                        Text(
                            text = stringResource(Res.string.onboarding_device_select_empty),
                            style = MaterialTheme.typography.bodyMedium,
                            color = scheme.onSurfaceVariant,
                        )
                    } else {
                        DeviceSelector(
                            autoSave = false,
                            modifier = Modifier.fillMaxWidth(),
                            refreshKey = deviceListRefreshKey ?: selectorRefresh,
                            onDeviceClick = { device ->
                                pendingDevice = device
                                testResult = BluetoothA2dpTestResult.None
                            },
                        )
                    }
                    if (testResult is BluetoothA2dpTestResult.Error) {
                        Text(
                            text = (testResult as BluetoothA2dpTestResult.Error).message,
                            style = MaterialTheme.typography.bodyMedium,
                            color = scheme.error,
                            modifier = Modifier.padding(top = 8.dp),
                        )
                    }
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val device = pendingDevice
                        if (device == null) {
                            showSelector = false
                            return@TextButton
                        }
                        testResult = BluetoothA2dpTestResult.Testing
                        dialogScope.launch {
                            val result = btTester.testA2dpForAddress(
                                device.address,
                                testErrorBtOff,
                                testErrorNotBonded,
                                testErrorNoA2dp,
                                testErrorNotConnected,
                            )
                            testResult = result
                            if (result is BluetoothA2dpTestResult.Success) {
                                preferences.targetBTAddress = device.address
                                preferences.targetBTName = device.name.takeIf { it.isNotBlank() } ?: ""
                                preferences.lastSelectedAt = kotlinx.datetime.Clock.System.now().toString()
                                selectorRefresh++
                                onHeadsetChanged()
                                bridge.startService()
                                showSelector = false
                            }
                        }
                    },
                    enabled = testResult !is BluetoothA2dpTestResult.Testing,
                ) {
                    if (testResult is BluetoothA2dpTestResult.Testing) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            strokeWidth = 2.dp,
                        )
                        Spacer(modifier = Modifier.size(6.dp))
                    }
                    Text(text = stringResource(Res.string.action_ok))
                }
            },
        )
    }

    BCOCard(
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    imageVector = Icons.Outlined.Headphones,
                    contentDescription = null,
                    modifier = Modifier.size(40.dp),
                    tint = scheme.primary,
                )
                Spacer(Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = headsetDisplay,
                        style = MaterialTheme.typography.titleLarge,
                        color = scheme.onSurface,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = macDisplay,
                        style = MaterialTheme.typography.bodyMedium,
                        color = scheme.onSurfaceVariant,
                    )
                }
            }
            Spacer(Modifier.height(16.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = stringResource(Res.string.devices_uptime_today_label),
                        style = MaterialTheme.typography.labelSmall,
                        color = scheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = uptimeValue,
                        style = MaterialTheme.typography.titleLarge,
                        color = scheme.onSurface,
                    )
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = stringResource(Res.string.devices_switches_today_label),
                        style = MaterialTheme.typography.labelSmall,
                        color = scheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = state.switchCount24h.toString(),
                        style = MaterialTheme.typography.titleLarge,
                        color = scheme.onSurface,
                    )
                }
            }
            Spacer(Modifier.height(8.dp))
            HorizontalDivider(color = scheme.outlineVariant)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(onClick = { showSelector = true })
                    .semantics {
                        role = Role.Button
                        contentDescription = changeRowCd
                    }
                    .padding(vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = stringResource(Res.string.devices_current_headset_change),
                    style = MaterialTheme.typography.titleMedium,
                    color = scheme.primary,
                )
                Spacer(Modifier.weight(1f))
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                    contentDescription = null,
                    tint = scheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun formatElapsedMs(elapsedMs: Long): String {
    if (elapsedMs <= 0L) {
        return stringResource(Res.string.headset_status_duration_zero)
    }
    val d = elapsedMs.milliseconds
    val hours = d.inWholeHours
    val minutes = d.inWholeMinutes % 60
    val seconds = d.inWholeSeconds % 60
    return when {
        hours > 0L -> stringResource(
            Res.string.headset_status_duration_hm,
            hours,
            minutes,
        )
        minutes > 0L -> stringResource(
            Res.string.headset_status_duration_ms,
            minutes,
            seconds,
        )
        else -> stringResource(Res.string.headset_status_duration_s, seconds)
    }
}
