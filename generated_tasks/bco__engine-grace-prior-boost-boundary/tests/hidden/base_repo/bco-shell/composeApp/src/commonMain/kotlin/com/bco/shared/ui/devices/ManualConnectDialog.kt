package com.bco.shared.ui.devices

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.bco.shared.resources.Res
import com.bco.shared.resources.action_connect_peer
import com.bco.shared.resources.manual_connect_cancel
import com.bco.shared.resources.manual_connect_empty
import com.bco.shared.resources.manual_connect_failed
import com.bco.shared.resources.manual_connect_hint
import com.bco.shared.resources.manual_connect_service_stopped
import com.bco.shared.resources.manual_connect_success
import com.bco.shared.resources.manual_connect_title
import com.bco.shared.platform.ConnectPeerOutcome
import com.bco.shared.platform.LocalAppServiceBridge
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.jetbrains.compose.resources.stringResource

private sealed interface ManualConnectFeedback {
    data object None : ManualConnectFeedback
    data object EmptyInput : ManualConnectFeedback
    data object Success : ManualConnectFeedback
    data object ServiceStopped : ManualConnectFeedback
    data class Error(val detail: String) : ManualConnectFeedback
}

/**
 * US7 manual dial-out: user-entered multiaddr, connect via [LocalAppServiceBridge].
 */
@Composable
fun ManualConnectDialog(
    visible: Boolean,
    onDismiss: () -> Unit,
) {
    if (!visible) return

    val bridge = LocalAppServiceBridge.current
    var multiaddr by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var feedback by remember { mutableStateOf<ManualConnectFeedback>(ManualConnectFeedback.None) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(visible) {
        if (visible) {
            multiaddr = ""
            busy = false
            feedback = ManualConnectFeedback.None
        }
    }

    val f = feedback
    val feedbackText: String? = when (f) {
        ManualConnectFeedback.None -> null
        ManualConnectFeedback.EmptyInput -> stringResource(Res.string.manual_connect_empty)
        ManualConnectFeedback.Success -> stringResource(Res.string.manual_connect_success)
        ManualConnectFeedback.ServiceStopped -> stringResource(Res.string.manual_connect_service_stopped)
        is ManualConnectFeedback.Error -> stringResource(Res.string.manual_connect_failed, f.detail)
    }
    val isSuccess = feedback is ManualConnectFeedback.Success

    AlertDialog(
        onDismissRequest = {
            if (!busy) onDismiss()
        },
        title = { Text(stringResource(Res.string.manual_connect_title)) },
        text = {
            Column(modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = multiaddr,
                    onValueChange = {
                        multiaddr = it
                        feedback = ManualConnectFeedback.None
                    },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text(stringResource(Res.string.manual_connect_hint)) },
                    singleLine = true,
                    enabled = !busy,
                )
                feedbackText?.let { msg ->
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = msg,
                        style = MaterialTheme.typography.bodySmall,
                        color = when {
                            isSuccess -> MaterialTheme.colorScheme.primary
                            else -> MaterialTheme.colorScheme.error
                        },
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                enabled = !busy,
                onClick = {
                    scope.launch {
                        val trimmed = multiaddr.trim()
                        if (trimmed.isEmpty()) {
                            feedback = ManualConnectFeedback.EmptyInput
                            return@launch
                        }
                        busy = true
                        feedback = ManualConnectFeedback.None
                        try {
                            val outcome = withContext(Dispatchers.IO) {
                                bridge.connectPeerFromUi(trimmed)
                            }
                            when (outcome) {
                                ConnectPeerOutcome.Success -> {
                                    bridge.bumpPeerListRefreshEpoch()
                                    feedback = ManualConnectFeedback.Success
                                }
                                ConnectPeerOutcome.ServiceStopped -> {
                                    feedback = ManualConnectFeedback.ServiceStopped
                                }
                                is ConnectPeerOutcome.Error -> {
                                    feedback = ManualConnectFeedback.Error(outcome.message)
                                }
                            }
                        } catch (ce: kotlin.coroutines.cancellation.CancellationException) {
                            throw ce
                        } catch (t: Throwable) {
                            feedback = ManualConnectFeedback.Error(t.message ?: t.toString())
                        } finally {
                            busy = false
                        }
                    }
                },
            ) {
                Text(stringResource(Res.string.action_connect_peer))
            }
        },
        dismissButton = {
            TextButton(
                enabled = !busy,
                onClick = onDismiss,
            ) {
                Text(stringResource(Res.string.manual_connect_cancel))
            }
        },
    )
}
