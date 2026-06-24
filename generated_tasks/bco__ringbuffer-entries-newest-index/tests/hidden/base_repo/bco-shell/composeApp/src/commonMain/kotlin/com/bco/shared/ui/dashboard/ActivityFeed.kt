package com.bco.shared.ui.dashboard

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BluetoothConnected
import androidx.compose.material.icons.filled.BluetoothDisabled
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.PauseCircleOutline
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.PersonRemove
import androidx.compose.material.icons.filled.PlayCircleOutline
import androidx.compose.material.icons.filled.PowerSettingsNew
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.bco.shared.resources.Res
import com.bco.shared.resources.activity_feed_collapse
import com.bco.shared.resources.activity_feed_days_ago
import com.bco.shared.resources.activity_feed_empty
import com.bco.shared.resources.activity_feed_expand
import com.bco.shared.resources.activity_feed_header_content_description
import com.bco.shared.resources.activity_feed_hours_ago
import com.bco.shared.resources.activity_feed_just_now
import com.bco.shared.resources.activity_feed_minutes_ago
import com.bco.shared.resources.activity_feed_title
import com.bco.shared.model.ActivityEventUi
import com.bco.shared.designsystem.component.BCOCard
import com.bco.shared.designsystem.tokens.BCOStatusColors
import com.bco.shared.designsystem.tokens.LocalBCOStatusColors
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import org.jetbrains.compose.resources.stringResource

internal data class ActivityVisual(val icon: ImageVector, val color: Color)

internal fun activityEventVisual(
    type: String,
    scheme: ColorScheme,
    statusColors: BCOStatusColors,
): ActivityVisual {
    val t = type.trim().lowercase()
    return when (t) {
        "switch" -> ActivityVisual(Icons.Filled.SwapHoriz, scheme.primary)
        "connect", "connected", "force_connect" ->
            ActivityVisual(Icons.Filled.BluetoothConnected, statusColors.connected)
        "disconnect", "disconnected", "force_disconnect" ->
            ActivityVisual(Icons.Filled.BluetoothDisabled, scheme.error)
        "peer_joined" -> ActivityVisual(Icons.Filled.PersonAdd, statusColors.connected)
        "peer_left" -> ActivityVisual(Icons.Filled.PersonRemove, scheme.error)
        "peer_paused" -> ActivityVisual(Icons.Filled.PauseCircleOutline, scheme.onSurfaceVariant)
        "peer_resumed" -> ActivityVisual(Icons.Filled.PlayCircleOutline, statusColors.connected)
        "service_start" -> ActivityVisual(Icons.Filled.PowerSettingsNew, statusColors.connected)
        "error" -> ActivityVisual(Icons.Filled.ErrorOutline, scheme.error)
        else -> ActivityVisual(Icons.Filled.Info, scheme.onSurfaceVariant)
    }
}

/**
 * Relative label for [eventMillis] compared to [clockMillis] (for tests, inject [clockMillis];
 * default is wall clock).
 */
@Composable
internal fun activityEventRelativeTimeLabel(
    eventMillis: Long,
    clockMillis: Long,
): String {
    val secs = ((clockMillis - eventMillis) / 1000).coerceAtLeast(0)
    return when {
        secs < 60 -> stringResource(Res.string.activity_feed_just_now)
        secs < 3600 -> stringResource(Res.string.activity_feed_minutes_ago, secs / 60)
        secs < 86400 -> stringResource(Res.string.activity_feed_hours_ago, secs / 3600)
        secs < 7 * 86400L -> stringResource(Res.string.activity_feed_days_ago, secs / 86400)
        else -> {
            val dateStr = Instant.fromEpochMilliseconds(eventMillis)
                .toLocalDateTime(TimeZone.currentSystemDefault())
                .toString()
                .take(10)
            dateStr
        }
    }
}

/**
 * Collapsible recent-activity list. Events are shown **newest first** ([timestamp] descending)
 * regardless of input order.
 */
@Composable
fun ActivityFeed(
    events: List<ActivityEventUi>,
    modifier: Modifier = Modifier,
    clockMillis: Long = Clock.System.now().toEpochMilliseconds(),
) {
    val scheme = MaterialTheme.colorScheme
    val statusColors = LocalBCOStatusColors.current
    var expanded by rememberSaveable { mutableStateOf(true) }
    val sorted = remember(events) {
        events.sortedByDescending { it.timestamp }
    }
    val count = sorted.size
    val headerDescription = stringResource(Res.string.activity_feed_header_content_description, count)

    BCOCard(
        modifier = modifier
            .fillMaxWidth()
            .semantics(mergeDescendants = true) {
                contentDescription = headerDescription
            },
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { expanded = !expanded },
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Text(
                        text = stringResource(Res.string.activity_feed_title),
                        style = MaterialTheme.typography.titleSmall,
                        color = scheme.onSurface,
                    )
                    Surface(
                        shape = RoundedCornerShape(percent = 50),
                        color = scheme.primary.copy(alpha = 0.10f),
                    ) {
                        Text(
                            text = count.toString(),
                            style = MaterialTheme.typography.labelSmall,
                            color = scheme.primary,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                        )
                    }
                }
                Icon(
                    imageVector = if (expanded) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                    contentDescription = if (expanded) {
                        stringResource(Res.string.activity_feed_collapse)
                    } else {
                        stringResource(Res.string.activity_feed_expand)
                    },
                    tint = scheme.onSurfaceVariant,
                )
            }

            AnimatedVisibility(
                visible = expanded,
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically(),
            ) {
                Column(Modifier.padding(top = 12.dp)) {
                    if (sorted.isEmpty()) {
                        Text(
                            text = stringResource(Res.string.activity_feed_empty),
                            style = MaterialTheme.typography.bodyMedium,
                            color = scheme.onSurfaceVariant,
                        )
                    } else {
                        sorted.forEachIndexed { index, event ->
                            if (index > 0) {
                                Spacer(Modifier.height(8.dp))
                                HorizontalDivider(color = scheme.outlineVariant)
                                Spacer(Modifier.height(8.dp))
                            }
                            val visual = activityEventVisual(event.type, scheme, statusColors)
                            ActivityFeedRow(
                                event = event,
                                clockMillis = clockMillis,
                                visual = visual,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ActivityFeedRow(
    event: ActivityEventUi,
    clockMillis: Long,
    visual: ActivityVisual,
    modifier: Modifier = Modifier,
) {
    val scheme = MaterialTheme.colorScheme
    val timeLabel = activityEventRelativeTimeLabel(event.timestamp, clockMillis)
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Icon(
            imageVector = visual.icon,
            contentDescription = null,
            modifier = Modifier
                .padding(top = 2.dp)
                .size(16.dp),
            tint = visual.color,
        )
        Text(
            text = event.message,
            modifier = Modifier.weight(1f),
            style = MaterialTheme.typography.bodyMedium,
            color = scheme.onSurface,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            text = timeLabel,
            modifier = Modifier.padding(top = 2.dp, start = 4.dp),
            style = MaterialTheme.typography.bodySmall,
            color = scheme.onSurfaceVariant,
            maxLines = 1,
        )
    }
}
