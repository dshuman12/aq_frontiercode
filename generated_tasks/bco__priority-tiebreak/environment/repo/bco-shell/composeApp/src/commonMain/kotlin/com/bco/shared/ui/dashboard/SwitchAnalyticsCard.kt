package com.bco.shared.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ShowChart
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.bco.shared.resources.Res
import com.bco.shared.resources.switch_analytics_avg_hold_label
import com.bco.shared.resources.switch_analytics_avg_hold_value
import com.bco.shared.resources.switch_analytics_chart_content_description
import com.bco.shared.resources.switch_analytics_last_24h
import com.bco.shared.resources.switch_analytics_title
import com.bco.shared.resources.switch_analytics_unit_switches
import com.bco.shared.model.ServiceUiState
import com.bco.shared.designsystem.component.BCOCard
import org.jetbrains.compose.resources.stringResource

internal const val SwitchAnalyticsBucketCount = 12

private fun List<Int>.normalizedSwitchBuckets(): List<Int> =
    List(SwitchAnalyticsBucketCount) { i -> getOrElse(i) { 0 } }

/**
 * Dashboard card: 24h switch frequency as 12 bars (2-hour buckets), total switches, average hold.
 *
 * Bar heights use [ServiceUiState.switchBucketCounts] (filled in T047); until then buckets are zero.
 */
@Composable
fun SwitchAnalyticsCard(
    state: ServiceUiState,
    modifier: Modifier = Modifier,
) {
    val buckets = remember(state.switchBucketCounts) {
        state.switchBucketCounts.normalizedSwitchBuckets()
    }
    SwitchAnalyticsCard(
        switchBucketCounts = buckets,
        switchCount24h = state.switchCount24h,
        avgHoldTimeMinutes = state.avgHoldTimeMinutes,
        modifier = modifier,
    )
}

/**
 * @param switchBucketCounts Exactly 12 values preferred; shorter lists are zero-padded, longer are truncated.
 */
@Composable
fun SwitchAnalyticsCard(
    switchBucketCounts: List<Int>,
    switchCount24h: Int,
    avgHoldTimeMinutes: Int,
    modifier: Modifier = Modifier,
) {
    val buckets = remember(switchBucketCounts) {
        switchBucketCounts.normalizedSwitchBuckets()
    }
    val scheme = MaterialTheme.colorScheme
    val maxCount = remember(buckets) {
        buckets.maxOrNull()?.coerceAtLeast(1) ?: 1
    }
    val chartDescription = stringResource(
        Res.string.switch_analytics_chart_content_description,
        switchCount24h,
        avgHoldTimeMinutes,
    )

    val lastIndex = buckets.size - 1

    BCOCard(
        modifier = modifier
            .fillMaxWidth()
            .semantics(mergeDescendants = true) {
                contentDescription = chartDescription
            },
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ShowChart,
                        contentDescription = null,
                        tint = scheme.primary,
                        modifier = Modifier.size(16.dp),
                    )
                    Text(
                        text = stringResource(Res.string.switch_analytics_title),
                        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                        color = scheme.onSurface,
                    )
                }
                Text(
                    text = stringResource(Res.string.switch_analytics_last_24h),
                    style = MaterialTheme.typography.bodySmall,
                    color = scheme.onSurfaceVariant,
                )
            }
            Spacer(Modifier.height(12.dp))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.Bottom,
            ) {
                buckets.forEachIndexed { index, count ->
                    val fraction = if (maxCount > 0) count.toFloat() / maxCount else 0f
                    val barColor = if (index == lastIndex) {
                        scheme.primary
                    } else {
                        scheme.primary.copy(alpha = 0.25f)
                    }
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight(),
                        contentAlignment = Alignment.BottomCenter,
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .fillMaxHeight(fraction.coerceIn(0f, 1f))
                                .clip(RoundedCornerShape(topStart = 2.dp, topEnd = 2.dp))
                                .background(barColor),
                        )
                    }
                }
            }

            Spacer(Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Bottom,
            ) {
                Row(
                    verticalAlignment = Alignment.Bottom,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Text(
                        text = switchCount24h.toString(),
                        style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
                        color = scheme.onSurface,
                    )
                    Text(
                        text = stringResource(Res.string.switch_analytics_unit_switches),
                        style = MaterialTheme.typography.bodySmall,
                        color = scheme.onSurfaceVariant,
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = stringResource(Res.string.switch_analytics_avg_hold_value, avgHoldTimeMinutes),
                        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                        color = scheme.onSurface,
                    )
                    Text(
                        text = stringResource(Res.string.switch_analytics_avg_hold_label),
                        style = MaterialTheme.typography.bodySmall,
                        color = scheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}
