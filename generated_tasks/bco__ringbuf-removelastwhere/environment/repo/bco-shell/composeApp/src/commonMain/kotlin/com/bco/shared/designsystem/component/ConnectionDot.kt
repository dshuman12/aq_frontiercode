package com.bco.shared.designsystem.component

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.bco.shared.designsystem.tokens.LocalBCOStatusColors
import com.bco.shared.model.ConnectionState

private const val PulseMinAlpha = 0.5f
private const val PulseMinScale = 0.88f
private const val PulseDurationMs = 800

@Composable
fun ConnectionDot(
    state: ConnectionState,
    modifier: Modifier = Modifier,
    size: Dp = 8.dp,
    contentDescriptionText: String = "",
) {
    val statusColors = LocalBCOStatusColors.current
    val baseColor = when (state) {
        ConnectionState.Connected -> statusColors.connected
        ConnectionState.Connecting -> statusColors.connecting
        ConnectionState.Disconnected -> statusColors.disconnected
    }

    val pulse = state != ConnectionState.Disconnected
    val transition = rememberInfiniteTransition(label = "connectionDotPulse")
    val pulsePhase by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(PulseDurationMs, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "pulsePhase",
    )
    val alpha = if (pulse) {
        PulseMinAlpha + (1f - PulseMinAlpha) * pulsePhase
    } else {
        1f
    }
    val scale = if (pulse) {
        PulseMinScale + (1f - PulseMinScale) * pulsePhase
    } else {
        1f
    }

    Box(
        modifier = modifier
            .then(
                if (contentDescriptionText.isNotBlank()) {
                    Modifier.semantics { this.contentDescription = contentDescriptionText }
                } else {
                    Modifier
                },
            )
            .size(size)
            .graphicsLayer {
                this.alpha = alpha
                scaleX = scale
                scaleY = scale
            }
            .clip(CircleShape)
            .background(baseColor),
    )
}
