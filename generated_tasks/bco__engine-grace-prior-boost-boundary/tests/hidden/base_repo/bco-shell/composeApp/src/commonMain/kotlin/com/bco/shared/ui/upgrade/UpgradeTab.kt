package com.bco.shared.ui.upgrade

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Button
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.bco.shared.resources.Res
import com.bco.shared.resources.*
import com.bco.shared.model.DefaultEffectiveSubscriptionPlan
import com.bco.shared.model.SubscriptionUnlimited
import com.bco.shared.platform.LocalPlatformActions
import com.bco.shared.ui.adaptive.isCompact
import com.bco.shared.ui.dashboard.dashboardHorizontalPadding
import org.jetbrains.compose.resources.stringResource

/**
 * Upgrade tab: current plan summary (stub: [DefaultEffectiveSubscriptionPlan]), Free vs Pro switching explanation, [PlanSelector],
 * [FeatureComparisonTable], and purchase CTAs (stub).
 */
@Composable
fun UpgradeTab(
    windowWidthSizeClass: WindowWidthSizeClass,
    modifier: Modifier = Modifier,
) {
    val platformActions = LocalPlatformActions.current
    val horizontalPadding = dashboardHorizontalPadding(windowWidthSizeClass)
    val upgradeCtaStubToast = stringResource(Res.string.upgrade_cta_stub_toast)
    val upgradeRestorePurchasesStubToast = stringResource(Res.string.upgrade_restore_purchases_stub)

    var selectedPaidPlan by remember { mutableStateOf(SelectablePaidPlan.Premium) }

    val ctaLabel = when (selectedPaidPlan) {
        SelectablePaidPlan.Pro -> stringResource(
            Res.string.upgrade_cta_template,
            stringResource(Res.string.upgrade_tier_pro),
            stringResource(Res.string.upgrade_plan_pro_price),
        )
        SelectablePaidPlan.Premium -> stringResource(
            Res.string.upgrade_cta_template,
            stringResource(Res.string.upgrade_tier_premium),
            stringResource(Res.string.upgrade_plan_premium_price),
        )
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = horizontalPadding),
        contentPadding = PaddingValues(top = 16.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            CurrentPlanCard(
                modifier = Modifier.fillMaxWidth(),
            )
        }
        item {
            Text(
                text = stringResource(Res.string.upgrade_switching_styles_title),
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.onSurface,
            )
        }
        item {
            FreeVsProComparison(
                windowWidthClass = windowWidthSizeClass,
                modifier = Modifier.fillMaxWidth(),
            )
        }
        item {
            PlanSelector(
                selectedPlan = selectedPaidPlan,
                onPlanSelected = { selectedPaidPlan = it },
                modifier = Modifier.fillMaxWidth(),
            )
        }
        item {
            FeatureComparisonTable(
                windowWidthClass = windowWidthSizeClass,
                modifier = Modifier.fillMaxWidth(),
            )
        }
        item {
            Button(
                onClick = {
                    platformActions.showToast(upgradeCtaStubToast)
                },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(ctaLabel)
            }
        }
        item {
            TextButton(
                onClick = {
                    platformActions.showToast(upgradeRestorePurchasesStubToast)
                },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(stringResource(Res.string.upgrade_restore_purchases))
            }
        }
    }
}

@Composable
private fun CurrentPlanCard(modifier: Modifier = Modifier) {
    val scheme = MaterialTheme.colorScheme
    val typography = MaterialTheme.typography
    val plan = DefaultEffectiveSubscriptionPlan
    val peersLine = if (plan.maxPeers == SubscriptionUnlimited) {
        stringResource(Res.string.upgrade_current_plan_peers_unlimited)
    } else {
        stringResource(Res.string.upgrade_current_plan_peers, plan.maxPeers)
    }
    val historyLine = if (plan.switchHistoryDays == SubscriptionUnlimited) {
        stringResource(Res.string.upgrade_history_unlimited)
    } else {
        stringResource(Res.string.upgrade_history_days, plan.switchHistoryDays)
    }
    OutlinedCard(
        modifier = modifier,
        colors = CardDefaults.outlinedCardColors(containerColor = scheme.surfaceContainerLow),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                text = stringResource(Res.string.upgrade_current_plan_title),
                style = typography.titleMedium,
                color = scheme.onSurface,
            )
            Text(
                text = stringResource(Res.string.upgrade_tier_premium),
                style = typography.titleSmall,
                color = scheme.primary,
            )
            Text(
                text = stringResource(
                    Res.string.upgrade_current_plan_peers_history,
                    peersLine,
                    historyLine,
                ),
                style = typography.bodyMedium,
                color = scheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun FreeVsProComparison(
    windowWidthClass: WindowWidthSizeClass,
    modifier: Modifier = Modifier,
) {
    val scheme = MaterialTheme.colorScheme
    val typography = MaterialTheme.typography
    if (windowWidthClass.isCompact()) {
        Column(
            modifier = modifier,
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            TierHighlightCard(
                title = stringResource(Res.string.upgrade_tier_free),
                subtitle = stringResource(Res.string.upgrade_free_column_subtitle),
                body = stringResource(Res.string.upgrade_free_column_body),
                modifier = Modifier.fillMaxWidth(),
            )
            TierHighlightCard(
                title = stringResource(Res.string.upgrade_tier_pro),
                subtitle = stringResource(Res.string.upgrade_pro_column_subtitle),
                body = stringResource(Res.string.upgrade_pro_column_body),
                modifier = Modifier.fillMaxWidth(),
                emphasized = true,
            )
        }
    } else {
        Row(
            modifier = modifier,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            TierHighlightCard(
                title = stringResource(Res.string.upgrade_tier_free),
                subtitle = stringResource(Res.string.upgrade_free_column_subtitle),
                body = stringResource(Res.string.upgrade_free_column_body),
                modifier = Modifier.weight(1f),
            )
            TierHighlightCard(
                title = stringResource(Res.string.upgrade_tier_pro),
                subtitle = stringResource(Res.string.upgrade_pro_column_subtitle),
                body = stringResource(Res.string.upgrade_pro_column_body),
                modifier = Modifier.weight(1f),
                emphasized = true,
            )
        }
    }
}

@Composable
private fun TierHighlightCard(
    title: String,
    subtitle: String,
    body: String,
    modifier: Modifier = Modifier,
    emphasized: Boolean = false,
) {
    val scheme = MaterialTheme.colorScheme
    val typography = MaterialTheme.typography
    OutlinedCard(
        modifier = modifier,
        border = if (emphasized) {
            BorderStroke(2.dp, scheme.primary)
        } else {
            CardDefaults.outlinedCardBorder()
        },
        colors = CardDefaults.outlinedCardColors(
            containerColor = if (emphasized) {
                scheme.primaryContainer.copy(alpha = 0.35f)
            } else {
                scheme.surfaceContainerLow
            },
        ),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text(text = title, style = typography.titleSmall, color = scheme.onSurface)
            Text(
                text = subtitle,
                style = typography.labelLarge,
                color = if (emphasized) scheme.primary else scheme.onSurfaceVariant,
            )
            Text(text = body, style = typography.bodySmall, color = scheme.onSurfaceVariant)
        }
    }
}
