package com.bco.shared.ui.upgrade

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.outlined.WorkspacePremium
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.bco.shared.resources.Res
import com.bco.shared.resources.*
import org.jetbrains.compose.resources.stringResource

/** Paid tier shown in [PlanSelector] (not Free). */
enum class SelectablePaidPlan {
    Pro,
    Premium,
}

/**
 * Two selectable subscription cards: Pro (with Popular badge) and Premium. Uses [MaterialTheme]
 * colors only.
 */
@Composable
fun PlanSelector(
    selectedPlan: SelectablePaidPlan,
    onPlanSelected: (SelectablePaidPlan) -> Unit,
    modifier: Modifier = Modifier,
) {
    val scheme = MaterialTheme.colorScheme
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        PlanOptionCard(
            title = stringResource(Res.string.upgrade_plan_pro_title),
            priceLine = stringResource(Res.string.upgrade_plan_pro_price),
            tagline = stringResource(Res.string.upgrade_plan_pro_tagline),
            icon = {
                Icon(
                    imageVector = Icons.Outlined.WorkspacePremium,
                    contentDescription = null,
                    modifier = Modifier.size(40.dp),
                    tint = scheme.primary,
                )
            },
            showPopularBadge = true,
            selected = selectedPlan == SelectablePaidPlan.Pro,
            onSelect = { onPlanSelected(SelectablePaidPlan.Pro) },
        )
        PlanOptionCard(
            title = stringResource(Res.string.upgrade_plan_premium_title),
            priceLine = stringResource(Res.string.upgrade_plan_premium_price),
            tagline = stringResource(Res.string.upgrade_plan_premium_tagline),
            icon = {
                Icon(
                    imageVector = Icons.Filled.AutoAwesome,
                    contentDescription = null,
                    modifier = Modifier.size(40.dp),
                    tint = scheme.tertiary,
                )
            },
            showPopularBadge = false,
            selected = selectedPlan == SelectablePaidPlan.Premium,
            onSelect = { onPlanSelected(SelectablePaidPlan.Premium) },
        )
    }
}

@Composable
private fun PlanOptionCard(
    title: String,
    priceLine: String,
    tagline: String,
    icon: @Composable () -> Unit,
    showPopularBadge: Boolean,
    selected: Boolean,
    onSelect: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val scheme = MaterialTheme.colorScheme
    val borderColor = if (selected) scheme.primary else scheme.outlineVariant
    val borderWidth = if (selected) 2.dp else 1.dp
    OutlinedCard(
        modifier = modifier
            .fillMaxWidth()
            .semantics { this.selected = selected }
            .clickable(onClick = onSelect),
        shape = MaterialTheme.shapes.large,
        border = BorderStroke(borderWidth, borderColor),
        colors = CardDefaults.outlinedCardColors(
            containerColor = if (selected) {
                scheme.primaryContainer
            } else {
                scheme.surfaceContainerHigh
            },
            contentColor = scheme.onSurface,
        ),
    ) {
        Row(
            Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            icon()
            Spacer(Modifier.width(16.dp))
            Column(Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.titleMedium,
                        color = scheme.onSurface,
                    )
                    if (showPopularBadge) {
                        Surface(
                            shape = MaterialTheme.shapes.small,
                            color = scheme.secondaryContainer,
                        ) {
                            Text(
                                text = stringResource(Res.string.upgrade_plan_popular_badge),
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                style = MaterialTheme.typography.labelMedium,
                                color = scheme.onSecondaryContainer,
                            )
                        }
                    }
                }
                Text(
                    text = priceLine,
                    style = MaterialTheme.typography.titleSmall,
                    color = scheme.primary,
                )
                Text(
                    text = tagline,
                    style = MaterialTheme.typography.bodyMedium,
                    color = scheme.onSurfaceVariant,
                )
            }
        }
    }
}
