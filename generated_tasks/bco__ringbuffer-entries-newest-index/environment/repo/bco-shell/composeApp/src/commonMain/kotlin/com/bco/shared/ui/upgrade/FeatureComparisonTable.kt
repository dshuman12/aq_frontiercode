package com.bco.shared.ui.upgrade

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.bco.shared.resources.Res
import com.bco.shared.resources.*
import com.bco.shared.model.FreeSubscriptionPlan
import com.bco.shared.model.PremiumSubscriptionPlan
import com.bco.shared.model.ProSubscriptionPlan
import com.bco.shared.model.SubscriptionPlan
import com.bco.shared.model.SubscriptionUnlimited
import com.bco.shared.ui.adaptive.isExpanded
import com.bco.shared.ui.adaptive.isMedium
import org.jetbrains.compose.resources.stringResource

/**
 * Free / Pro / Premium feature matrix per [specs/007-android-ui-parity/data-model.md] §6 and US6.
 * Uses [MaterialTheme] only for colors and typography.
 */
@Composable
fun FeatureComparisonTable(
    windowWidthClass: WindowWidthSizeClass,
    modifier: Modifier = Modifier,
) {
    val scheme = MaterialTheme.colorScheme
    val typography = MaterialTheme.typography
    val featureColMax: Dp = when {
        windowWidthClass.isExpanded() -> 280.dp
        windowWidthClass.isMedium() -> 220.dp
        else -> Dp.Unspecified
    }
    val tierColMin: Dp = when {
        windowWidthClass.isExpanded() -> 88.dp
        windowWidthClass.isMedium() -> 72.dp
        else -> 56.dp
    }
    val tierColMax: Dp = when {
        windowWidthClass.isExpanded() -> 132.dp
        windowWidthClass.isMedium() -> 108.dp
        else -> 96.dp
    }
    val cellHPad = when {
        windowWidthClass.isExpanded() -> 12.dp
        windowWidthClass.isMedium() -> 8.dp
        else -> 4.dp
    }
    val rowVPad = when {
        windowWidthClass.isExpanded() -> 14.dp
        windowWidthClass.isMedium() -> 12.dp
        else -> 10.dp
    }

    val historyFree =
        stringResource(Res.string.upgrade_history_days, FreeSubscriptionPlan.switchHistoryDays)
    val historyPro =
        stringResource(Res.string.upgrade_history_days, ProSubscriptionPlan.switchHistoryDays)
    val historyPremium = stringResource(Res.string.upgrade_history_unlimited)

    val maxPeersFree = formatMaxPeersLabel(FreeSubscriptionPlan)
    val maxPeersPro = formatMaxPeersLabel(ProSubscriptionPlan)
    val maxPeersPremium = formatMaxPeersLabel(PremiumSubscriptionPlan)

    Surface(
        modifier = modifier.widthIn(max = if (windowWidthClass.isExpanded()) 640.dp else Dp.Unspecified),
        shape = MaterialTheme.shapes.large,
        color = scheme.surfaceContainerLow,
    ) {
        Column(Modifier.fillMaxWidth()) {
            Text(
                text = stringResource(Res.string.upgrade_comparison_title),
                style = typography.titleSmall,
                color = scheme.onSurface,
                modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 8.dp),
            )
            HorizontalDivider(color = scheme.outlineVariant)
            ComparisonHeaderRow(
                featureColMax = featureColMax,
                tierColMin = tierColMin,
                tierColMax = tierColMax,
                cellHPad = cellHPad,
                rowVPad = rowVPad,
            )
            HorizontalDivider(color = scheme.outlineVariant)
            ComparisonFeatureRow(
                label = stringResource(Res.string.upgrade_feature_basic_switching),
                featureColMax = featureColMax,
                tierColMin = tierColMin,
                tierColMax = tierColMax,
                cellHPad = cellHPad,
                rowVPad = rowVPad,
                free = { IncludedCheck() },
                pro = { IncludedCheck() },
                premium = { IncludedCheck() },
            )
            HorizontalDivider(color = scheme.outlineVariant)
            ComparisonFeatureRow(
                label = stringResource(Res.string.upgrade_feature_priority_switching),
                featureColMax = featureColMax,
                tierColMin = tierColMin,
                tierColMax = tierColMax,
                cellHPad = cellHPad,
                rowVPad = rowVPad,
                free = { ExcludedDash() },
                pro = { IncludedCheck() },
                premium = { IncludedCheck() },
            )
            HorizontalDivider(color = scheme.outlineVariant)
            ComparisonFeatureRow(
                label = stringResource(Res.string.upgrade_feature_per_app_rules),
                featureColMax = featureColMax,
                tierColMin = tierColMin,
                tierColMax = tierColMax,
                cellHPad = cellHPad,
                rowVPad = rowVPad,
                free = { ExcludedDash() },
                pro = { IncludedCheck() },
                premium = { IncludedCheck() },
            )
            HorizontalDivider(color = scheme.outlineVariant)
            ComparisonFeatureRow(
                label = stringResource(Res.string.upgrade_feature_custom_weight),
                featureColMax = featureColMax,
                tierColMin = tierColMin,
                tierColMax = tierColMax,
                cellHPad = cellHPad,
                rowVPad = rowVPad,
                free = { ExcludedDash() },
                pro = { IncludedCheck() },
                premium = { IncludedCheck() },
            )
            HorizontalDivider(color = scheme.outlineVariant)
            ComparisonFeatureRow(
                label = stringResource(Res.string.upgrade_feature_max_peers),
                featureColMax = featureColMax,
                tierColMin = tierColMin,
                tierColMax = tierColMax,
                cellHPad = cellHPad,
                rowVPad = rowVPad,
                free = { ValueText(maxPeersFree) },
                pro = { ValueText(maxPeersPro) },
                premium = { ValueText(maxPeersPremium) },
            )
            HorizontalDivider(color = scheme.outlineVariant)
            ComparisonFeatureRow(
                label = stringResource(Res.string.upgrade_feature_cloud_sync),
                featureColMax = featureColMax,
                tierColMin = tierColMin,
                tierColMax = tierColMax,
                cellHPad = cellHPad,
                rowVPad = rowVPad,
                free = { ExcludedDash() },
                pro = { IncludedCheck() },
                premium = { IncludedCheck() },
            )
            HorizontalDivider(color = scheme.outlineVariant)
            ComparisonFeatureRow(
                label = stringResource(Res.string.upgrade_feature_priority_support),
                featureColMax = featureColMax,
                tierColMin = tierColMin,
                tierColMax = tierColMax,
                cellHPad = cellHPad,
                rowVPad = rowVPad,
                free = { ExcludedDash() },
                pro = { ExcludedDash() },
                premium = { IncludedCheck() },
            )
            HorizontalDivider(color = scheme.outlineVariant)
            ComparisonFeatureRow(
                label = stringResource(Res.string.upgrade_feature_switch_history),
                featureColMax = featureColMax,
                tierColMin = tierColMin,
                tierColMax = tierColMax,
                cellHPad = cellHPad,
                rowVPad = rowVPad,
                free = { ValueText(historyFree) },
                pro = { ValueText(historyPro) },
                premium = { ValueText(historyPremium) },
                isLast = true,
            )
        }
    }
}

@Composable
private fun ComparisonHeaderRow(
    featureColMax: Dp,
    tierColMin: Dp,
    tierColMax: Dp,
    cellHPad: Dp,
    rowVPad: Dp,
) {
    val scheme = MaterialTheme.colorScheme
    val typography = MaterialTheme.typography
    Row(
        Modifier
            .fillMaxWidth()
            .padding(vertical = rowVPad),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = "",
            modifier = Modifier
                .weight(1.4f)
                .widthIn(max = featureColMax)
                .padding(horizontal = 16.dp),
            style = typography.labelLarge,
        )
        HeaderCell(
            text = stringResource(Res.string.upgrade_tier_free),
            modifier = Modifier
                .weight(1f)
                .widthIn(min = tierColMin, max = tierColMax)
                .padding(horizontal = cellHPad),
        )
        HeaderCell(
            text = stringResource(Res.string.upgrade_tier_pro),
            modifier = Modifier
                .weight(1f)
                .widthIn(min = tierColMin, max = tierColMax)
                .padding(horizontal = cellHPad),
        )
        HeaderCell(
            text = stringResource(Res.string.upgrade_tier_premium),
            modifier = Modifier
                .weight(1f)
                .widthIn(min = tierColMin, max = tierColMax)
                .padding(horizontal = cellHPad),
        )
    }
}

@Composable
private fun HeaderCell(text: String, modifier: Modifier = Modifier) {
    Text(
        text = text,
        modifier = modifier,
        style = MaterialTheme.typography.labelLarge,
        color = MaterialTheme.colorScheme.primary,
        textAlign = TextAlign.Center,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
    )
}

@Composable
private fun ComparisonFeatureRow(
    label: String,
    featureColMax: Dp,
    tierColMin: Dp,
    tierColMax: Dp,
    cellHPad: Dp,
    rowVPad: Dp,
    free: @Composable () -> Unit,
    pro: @Composable () -> Unit,
    premium: @Composable () -> Unit,
    isLast: Boolean = false,
) {
    val scheme = MaterialTheme.colorScheme
    val typography = MaterialTheme.typography
    Row(
        Modifier
            .fillMaxWidth()
            .padding(vertical = rowVPad),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            modifier = Modifier
                .weight(1.4f)
                .widthIn(max = featureColMax)
                .padding(start = 16.dp, end = 8.dp),
            style = typography.bodyMedium,
            color = scheme.onSurface,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
        TableCellBox(
            modifier = Modifier
                .weight(1f)
                .widthIn(min = tierColMin, max = tierColMax)
                .padding(horizontal = cellHPad),
            content = free,
        )
        TableCellBox(
            modifier = Modifier
                .weight(1f)
                .widthIn(min = tierColMin, max = tierColMax)
                .padding(horizontal = cellHPad),
            content = pro,
        )
        TableCellBox(
            modifier = Modifier
                .weight(1f)
                .widthIn(min = tierColMin, max = tierColMax)
                .padding(horizontal = cellHPad),
            content = premium,
        )
    }
    if (isLast) {
        HorizontalDivider(color = scheme.outlineVariant)
    }
}

@Composable
private fun TableCellBox(
    modifier: Modifier,
    content: @Composable () -> Unit,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        content()
    }
}

@Composable
private fun IncludedCheck() {
    Icon(
        imageVector = Icons.Outlined.Check,
        contentDescription = stringResource(Res.string.upgrade_cell_included_content_description),
        tint = MaterialTheme.colorScheme.primary,
    )
}

@Composable
private fun ExcludedDash() {
    Text(
        text = stringResource(Res.string.upgrade_cell_not_included),
        style = MaterialTheme.typography.bodyLarge,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        textAlign = TextAlign.Center,
    )
}

@Composable
private fun ValueText(value: String) {
    Text(
        text = value,
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurface,
        textAlign = TextAlign.Center,
        maxLines = 2,
        overflow = TextOverflow.Ellipsis,
    )
}

@Composable
private fun formatMaxPeersLabel(plan: SubscriptionPlan): String =
    if (plan.maxPeers == SubscriptionUnlimited) {
        stringResource(Res.string.upgrade_max_peers_unlimited)
    } else {
        plan.maxPeers.toString()
    }
