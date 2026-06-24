package com.bco.shared.designsystem.component

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SheetState
import androidx.compose.material3.Switch
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
import androidx.compose.ui.unit.dp
import com.bco.shared.resources.Res
import com.bco.shared.resources.*
import com.bco.shared.model.AudioState
import com.bco.shared.model.ServiceUiState
import com.bco.shared.platform.LocalBluetoothDeviceProvider
import com.bco.shared.platform.LocalPlatformActions
import com.bco.shared.platform.rememberAdapterDisplayNameOrNull
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource
import kotlin.random.Random

private const val MinDescriptionLength = 20

private enum class BugReportCategory(val label: StringResource) {
    BLUETOOTH(Res.string.bug_category_bluetooth),
    SWITCHING(Res.string.bug_category_switching),
    CRASH(Res.string.bug_category_crash),
    SERVICE(Res.string.bug_category_service),
    PEER(Res.string.bug_category_peer),
    UI(Res.string.bug_category_ui),
    OTHER(Res.string.bug_category_other),
}

private enum class BugReportSeverity(val label: StringResource) {
    MINOR(Res.string.bug_severity_minor),
    MAJOR(Res.string.bug_severity_major),
    UNUSABLE(Res.string.bug_severity_unusable),
}

private sealed interface BugSubmitUiState {
    data object Form : BugSubmitUiState
    data object Loading : BugSubmitUiState
    data class Success(val ticketId: String) : BugSubmitUiState
}

/**
 * Full-height style bottom sheet for bug reports (US7 / T044): category, description, repro steps,
 * severity, attachments, expandable device context, and mock submit with ticket id.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BugReportModal(
    visible: Boolean,
    onDismissRequest: () -> Unit,
    sheetState: SheetState,
    serviceUiState: ServiceUiState,
    coreVersion: String?,
    batteryOptimizationIgnored: Boolean,
    appVersion: String,
) {
    if (!visible) return

    val platformActions = LocalPlatformActions.current
    val btProvider = LocalBluetoothDeviceProvider.current
    val defaultEmailStub = stringResource(Res.string.settings_account_email_stub)
    val screenshotsStubToast = stringResource(Res.string.bug_report_screenshots_stub_toast)

    var category by remember { mutableStateOf<BugReportCategory?>(null) }
    var description by remember { mutableStateOf("") }
    var steps by remember { mutableStateOf("") }
    var severity by remember { mutableStateOf(BugReportSeverity.MINOR) }
    var attachLogs by remember { mutableStateOf(false) }
    var email by remember { mutableStateOf("") }
    var deviceInfoExpanded by remember { mutableStateOf(false) }
    var submitUi by remember { mutableStateOf<BugSubmitUiState>(BugSubmitUiState.Form) }
    var resolvedCoreVersion by remember { mutableStateOf<String?>(coreVersion) }

    LaunchedEffect(visible, defaultEmailStub) {
        if (visible) {
            category = null
            description = ""
            steps = ""
            severity = BugReportSeverity.MINOR
            attachLogs = false
            email = defaultEmailStub
            deviceInfoExpanded = false
            submitUi = BugSubmitUiState.Form
            resolvedCoreVersion = coreVersion
                ?: withContext(Dispatchers.Default) { platformActions.getCoreVersionOrNull() }
        }
    }

    LaunchedEffect(coreVersion) {
        if (coreVersion != null) resolvedCoreVersion = coreVersion
    }

    val scope = rememberCoroutineScope()
    val btName = rememberAdapterDisplayNameOrNull(
        refreshKey = visible,
        provider = btProvider,
    )
    val descTrimmed = description.trim()
    val canSubmit =
        category != null && descTrimmed.length >= MinDescriptionLength && submitUi is BugSubmitUiState.Form

    ModalBottomSheet(
        onDismissRequest = onDismissRequest,
        sheetState = sheetState,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp)
                .padding(bottom = 40.dp),
        ) {
            when (val s = submitUi) {
                is BugSubmitUiState.Success -> {
                    Text(
                        text = stringResource(Res.string.bug_report_success_title),
                        style = MaterialTheme.typography.titleLarge,
                    )
                    Text(
                        text = stringResource(Res.string.bug_report_success_ticket, s.ticketId),
                        style = MaterialTheme.typography.bodyLarge,
                        modifier = Modifier.padding(top = 12.dp),
                    )
                    Button(
                        onClick = onDismissRequest,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 24.dp),
                    ) {
                        Text(stringResource(Res.string.action_done))
                    }
                }

                BugSubmitUiState.Loading -> {
                    Text(
                        text = stringResource(Res.string.bug_report_submitting),
                        style = MaterialTheme.typography.titleLarge,
                    )
                    LinearProgressIndicator(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 24.dp),
                    )
                }

                BugSubmitUiState.Form -> {
                    Text(
                        text = stringResource(Res.string.settings_bug_report_sheet_title),
                        style = MaterialTheme.typography.titleLarge,
                    )

                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = stringResource(Res.string.bug_report_category_label),
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState())
                            .padding(top = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        BugReportCategory.entries.forEach { cat ->
                            FilterChip(
                                selected = category == cat,
                                onClick = { category = cat },
                                label = { Text(stringResource(cat.label)) },
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = description,
                        onValueChange = { description = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text(stringResource(Res.string.bug_report_description_label)) },
                        minLines = 4,
                        supportingText = {
                            Text(
                                stringResource(
                                    Res.string.bug_report_description_counter,
                                    description.length,
                                    MinDescriptionLength,
                                ),
                            )
                        },
                        isError = description.isNotEmpty() && descTrimmed.length < MinDescriptionLength,
                    )

                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = steps,
                        onValueChange = { steps = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text(stringResource(Res.string.bug_report_steps_label)) },
                        minLines = 3,
                    )

                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = stringResource(Res.string.bug_report_severity_label),
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState())
                            .padding(top = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        BugReportSeverity.entries.forEach { sev ->
                            FilterChip(
                                selected = severity == sev,
                                onClick = { severity = sev },
                                label = { Text(stringResource(sev.label)) },
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Column(modifier = Modifier.weight(1f).padding(end = 12.dp)) {
                            Text(
                                text = stringResource(Res.string.bug_report_attach_logs),
                                style = MaterialTheme.typography.bodyLarge,
                            )
                            Text(
                                text = stringResource(Res.string.bug_report_attach_logs_summary),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Switch(checked = attachLogs, onCheckedChange = { attachLogs = it })
                    }

                    OutlinedButton(
                        onClick = {
                            platformActions.showToast(screenshotsStubToast)
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp),
                    ) {
                        Text(stringResource(Res.string.bug_report_attach_screenshots))
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { deviceInfoExpanded = !deviceInfoExpanded }
                            .padding(vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(
                            text = stringResource(Res.string.bug_report_device_info_section),
                            style = MaterialTheme.typography.titleSmall,
                        )
                        Icon(
                            imageVector = if (deviceInfoExpanded) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                            contentDescription = null,
                        )
                    }
                    AnimatedVisibility(visible = deviceInfoExpanded) {
                        Column(
                            modifier = Modifier.padding(bottom = 8.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            DeviceInfoLine(
                                label = stringResource(Res.string.bug_report_info_model),
                                value = platformActions.getBuildDiagnosticText(),
                            )
                            DeviceInfoLine(
                                label = stringResource(Res.string.bug_report_info_app_version),
                                value = appVersion,
                            )
                            DeviceInfoLine(
                                label = stringResource(Res.string.bug_report_info_core_version),
                                value = resolvedCoreVersion
                                    ?: stringResource(Res.string.settings_core_version_unknown),
                            )
                            DeviceInfoLine(
                                label = stringResource(Res.string.bug_report_info_peers),
                                value = stringResource(
                                    Res.string.bug_report_info_peers_value,
                                    serviceUiState.peers.count { it.online },
                                    serviceUiState.peers.size,
                                ),
                            )
                            DeviceInfoLine(
                                label = stringResource(Res.string.bug_report_info_audio),
                                value = stringResource(audioStateLabelRes(serviceUiState.audioState)),
                            )
                            DeviceInfoLine(
                                label = stringResource(Res.string.bug_report_info_service),
                                value = stringResource(
                                    if (serviceUiState.serviceRunning) {
                                        Res.string.bug_report_info_service_running
                                    } else {
                                        Res.string.bug_report_info_service_stopped
                                    },
                                ),
                            )
                            DeviceInfoLine(
                                label = stringResource(Res.string.bug_report_info_bt_adapter),
                                value = btName ?: stringResource(Res.string.bug_report_info_unknown),
                            )
                            DeviceInfoLine(
                                label = stringResource(Res.string.bug_report_info_battery_opt),
                                value = stringResource(
                                    if (batteryOptimizationIgnored) {
                                        Res.string.bug_report_info_battery_ignored
                                    } else {
                                        Res.string.bug_report_info_battery_not_ignored
                                    },
                                ),
                            )
                            DeviceInfoLine(
                                label = stringResource(Res.string.bug_report_info_headset),
                                value = serviceUiState.headsetName
                                    ?: stringResource(Res.string.bug_report_info_unknown),
                            )
                        }
                    }

                    HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))

                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text(stringResource(Res.string.bug_report_email_label)) },
                        singleLine = true,
                    )

                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = {
                            scope.launch {
                                submitUi = BugSubmitUiState.Loading
                                delay(1200)
                                val id = "BCO-${Random.nextInt(100_000, 1_000_000)}"
                                submitUi = BugSubmitUiState.Success(id)
                            }
                        },
                        enabled = canSubmit,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(stringResource(Res.string.bug_report_submit))
                    }
                    TextButton(
                        onClick = onDismissRequest,
                        modifier = Modifier.align(Alignment.End),
                    ) {
                        Text(stringResource(Res.string.action_close))
                    }
                }
            }
        }
    }
}

@Composable
private fun DeviceInfoLine(label: String, value: String) {
    Text(
        text = label,
        style = MaterialTheme.typography.labelMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
    Text(
        text = value,
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurface,
    )
}

private fun audioStateLabelRes(state: AudioState): StringResource = when (state) {
    AudioState.Idle -> Res.string.audio_state_idle
    AudioState.Media -> Res.string.audio_state_media
    AudioState.IncomingCall -> Res.string.audio_state_incoming
    AudioState.ActiveCall -> Res.string.audio_state_active
}
