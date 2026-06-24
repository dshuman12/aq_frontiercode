package com.bco.shared.ui.devices

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.bco.shared.resources.Res
import com.bco.shared.resources.device_bt_le_only_badge
import com.bco.shared.resources.device_bt_unnamed
import com.bco.shared.platform.BluetoothDeviceInfo
import com.bco.shared.platform.LocalBluetoothDeviceProvider
import com.bco.shared.platform.LocalPreferencesProvider
import com.bco.shared.platform.rememberBondedAudioDevices
import kotlinx.datetime.Clock
import org.jetbrains.compose.resources.stringResource

/**
 * Lists paired Bluetooth devices whose class is audio-oriented. Highlights the row whose address
 * matches the persisted target address when that device is still bonded.
 */
@Composable
fun DeviceSelector(
    modifier: Modifier = Modifier,
    /** When this value changes (e.g. activity ON_RESUME counter), the bonded list is recomputed. */
    refreshKey: Any? = null,
    /** When true, only devices reported as LE-only are listed. */
    leOnlyFilter: Boolean = false,
    /** When false, tapping a device updates the visual selection without persisting preferences. */
    autoSave: Boolean = true,
    onDeviceClick: (BluetoothDeviceInfo) -> Unit = {},
) {
    val preferences = LocalPreferencesProvider.current
    val btProvider = LocalBluetoothDeviceProvider.current
    var selectedAddress by remember(refreshKey, preferences.targetBTAddress) {
        mutableStateOf(preferences.targetBTAddress)
    }
    val devices = rememberBondedAudioDevices(
        refreshKey = refreshKey,
        provider = btProvider,
    ).let { list ->
        if (leOnlyFilter) list.filter { it.isLeOnly } else list
    }
    val unnamed = stringResource(Res.string.device_bt_unnamed)

    Column(modifier = modifier) {
        for (device in devices) {
            val selected = selectedAddress != null &&
                device.address.equals(selectedAddress, ignoreCase = true)
            val title = device.name.takeIf { it.isNotBlank() } ?: unnamed
            ListItem(
                headlineContent = { Text(title, style = MaterialTheme.typography.titleMedium) },
                supportingContent = {
                    Column {
                        Text(device.address, style = MaterialTheme.typography.bodyMedium)
                        if (device.isLeOnly) {
                            Text(
                                text = stringResource(Res.string.device_bt_le_only_badge),
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(top = 4.dp),
                            )
                        }
                    }
                },
                trailingContent = if (selected) {
                    {
                        Text(
                            text = "✓",
                            style = MaterialTheme.typography.titleLarge,
                            color = MaterialTheme.colorScheme.primary,
                        )
                    }
                } else {
                    null
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable {
                        if (autoSave) {
                            preferences.targetBTAddress = device.address
                            preferences.targetBTName = device.name.takeIf { it.isNotBlank() } ?: ""
                            preferences.lastSelectedAt = Clock.System.now().toString()
                        }
                        selectedAddress = device.address
                        onDeviceClick(device)
                    },
            )
            HorizontalDivider(thickness = 1.dp)
        }
    }
}
