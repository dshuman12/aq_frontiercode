package com.bco.shared.ui.devices

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.bco.shared.resources.Res
import com.bco.shared.resources.discovery_scanning
import org.jetbrains.compose.resources.stringResource

private const val RING_COUNT = 3
private const val PULSE_DURATION_MS = 2400

@Composable
fun RadarScanAnimation(
    modifier: Modifier = Modifier,
    scanning: Boolean = true,
    size: Dp = 160.dp,
    label: String = stringResource(Res.string.discovery_scanning),
) {
    val ringColor = MaterialTheme.colorScheme.primary
    val dotColor = MaterialTheme.colorScheme.primary

    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            modifier = Modifier.size(size),
            contentAlignment = Alignment.Center,
        ) {
            if (scanning) {
                val transition = rememberInfiniteTransition(label = "radar")
                for (i in 0 until RING_COUNT) {
                    val delay = i * (PULSE_DURATION_MS / RING_COUNT)
                    val progress by transition.animateFloat(
                        initialValue = 0f,
                        targetValue = 1f,
                        animationSpec = infiniteRepeatable(
                            animation = tween(
                                durationMillis = PULSE_DURATION_MS,
                                delayMillis = delay,
                                easing = LinearEasing,
                            ),
                            repeatMode = RepeatMode.Restart,
                        ),
                        label = "ring_$i",
                    )
                    PulseRing(
                        progress = progress,
                        color = ringColor,
                        modifier = Modifier.matchParentSize(),
                    )
                }
            }
            Canvas(modifier = Modifier.size(12.dp)) {
                drawCircle(color = dotColor, radius = this.size.minDimension / 2f)
            }
        }
        Spacer(Modifier.height(8.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun PulseRing(
    progress: Float,
    color: Color,
    modifier: Modifier = Modifier,
) {
    val alpha = (1f - progress).coerceIn(0f, 0.45f)
    Canvas(modifier = modifier) {
        val maxRadius = this.size.minDimension / 2f
        val radius = maxRadius * 0.15f + maxRadius * 0.85f * progress
        drawCircle(
            color = color.copy(alpha = alpha),
            radius = radius,
            center = Offset(this.size.width / 2f, this.size.height / 2f),
            style = Stroke(width = 2f),
        )
    }
}
