package com.bco.shared.designsystem.component

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.VolumeOff
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.automirrored.filled.PhoneCallback
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.bco.shared.designsystem.tokens.BCOStatusColors
import com.bco.shared.designsystem.tokens.LocalBCOStatusColors
import com.bco.shared.model.AudioState

@Composable
fun AudioStateBadge(
    state: AudioState,
    modifier: Modifier = Modifier,
    label: String = state.defaultLabel(),
) {
    val statusColors = LocalBCOStatusColors.current
    val (accent, icon) = state.resolvePresentation(statusColors)

    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(50),
        color = accent.copy(alpha = SurfaceTintAlpha),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = accent,
                modifier = Modifier.size(12.dp),
            )
            Spacer(Modifier.width(4.dp))
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = accent,
            )
        }
    }
}

private const val SurfaceTintAlpha = 0.18f

private data class AudioStatePresentation(
    val accent: Color,
    val icon: ImageVector,
)

private fun AudioState.resolvePresentation(status: BCOStatusColors): AudioStatePresentation =
    when (this) {
        AudioState.Idle -> AudioStatePresentation(status.idle, Icons.AutoMirrored.Filled.VolumeOff)
        AudioState.Media -> AudioStatePresentation(status.media, Icons.Filled.MusicNote)
        AudioState.IncomingCall -> AudioStatePresentation(status.connecting, Icons.AutoMirrored.Filled.PhoneCallback)
        AudioState.ActiveCall -> AudioStatePresentation(status.call, Icons.Filled.Phone)
    }

private fun AudioState.defaultLabel(): String = when (this) {
    AudioState.Idle -> "Idle"
    AudioState.Media -> "Media"
    AudioState.IncomingCall -> "Incoming call"
    AudioState.ActiveCall -> "Active call"
}
