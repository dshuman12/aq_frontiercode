package com.bco.shared.ui.devices

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.bco.shared.resources.Res
import com.bco.shared.resources.devices_priority_formula_label_hold_bonus
import com.bco.shared.resources.devices_priority_formula_label_media_tier
import com.bco.shared.resources.devices_priority_formula_label_weight
import com.bco.shared.resources.devices_priority_upgrade_customize_row
import com.bco.shared.resources.devices_priority_upgrade_customize_row_cd
import com.bco.shared.resources.devices_priority_weight_section_title
import com.bco.shared.resources.devices_priority_weight_slider_label
import com.bco.shared.resources.pro_badge_label
import com.bco.shared.model.SubscriptionPlan
import com.bco.shared.designsystem.component.BCOCard
import com.bco.shared.designsystem.tokens.LocalBCOStatusColors
import org.jetbrains.compose.resources.stringResource

private const val WeightMin = 0
private const val WeightMax = 100

private const val ProBadgeSurfaceAlpha = 0.2f

private val FormulaOperatorColumnWidth = 20.dp

/**
 * Devices tab section: effective score as media tier + weight + hold bonus (v0 card layout), optional
 * priority weight slider for Pro. Free tier: formula visible; upgrade row with chevron opens billing.
 */
@Composable
fun PriorityWeightSection(
    plan: SubscriptionPlan,
    audioScore: Int,
    holdBonus: Int,
    priorityWeight: Int,
    onPriorityWeightChange: (Int) -> Unit,
    onUpgradeClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val scheme = MaterialTheme.colorScheme
    val statusColors = LocalBCOStatusColors.current
    val weightClamped = priorityWeight.coerceIn(WeightMin, WeightMax)
    val unlocked = plan.hasPriorityWeight

    val displayAudio = audioScore
    val displayWeight = weightClamped
    val displayHold = holdBonus
    val displayTotal = displayAudio + displayWeight + displayHold

    val sliderDescription = stringResource(Res.string.devices_priority_weight_slider_label)
    val upgradeRowCd = stringResource(Res.string.devices_priority_upgrade_customize_row_cd)

    BCOCard(
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = stringResource(Res.string.devices_priority_weight_section_title),
                    style = MaterialTheme.typography.titleMedium,
                    color = scheme.onSurface,
                    modifier = Modifier.weight(1f),
                )
                if (!unlocked) {
                    ProFeatureBadge()
                }
            }
            Spacer(Modifier.height(16.dp))

            ColoredPriorityFormula(
                mediaTier = displayAudio,
                weight = displayWeight,
                holdBonus = displayHold,
                total = displayTotal,
                mediaTierColor = statusColors.media,
                weightColor = scheme.primary,
                holdBonusColor = statusColors.premium,
            )

            if (unlocked) {
                Spacer(Modifier.height(16.dp))
                Slider(
                    value = weightClamped.toFloat(),
                    onValueChange = { onPriorityWeightChange(it.toInt().coerceIn(WeightMin, WeightMax)) },
                    valueRange = WeightMin.toFloat()..WeightMax.toFloat(),
                    steps = (WeightMax - WeightMin - 1).coerceAtLeast(0),
                    modifier = Modifier
                        .fillMaxWidth()
                        .semantics { contentDescription = sliderDescription },
                    colors = SliderDefaults.colors(
                        thumbColor = scheme.primary,
                        activeTrackColor = scheme.primary,
                        inactiveTrackColor = scheme.surfaceVariant,
                    ),
                )
            } else {
                Spacer(Modifier.height(12.dp))
                HorizontalDivider(color = scheme.outlineVariant)
                Spacer(Modifier.height(4.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(onClick = onUpgradeClick)
                        .semantics {
                            role = Role.Button
                            contentDescription = upgradeRowCd
                        }
                        .padding(vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = stringResource(Res.string.devices_priority_upgrade_customize_row),
                        style = MaterialTheme.typography.titleMedium,
                        color = scheme.primary,
                        modifier = Modifier.weight(1f),
                    )
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                        contentDescription = null,
                        tint = scheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

@Composable
private fun ProFeatureBadge() {
    val premium = LocalBCOStatusColors.current.premium
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = premium.copy(alpha = ProBadgeSurfaceAlpha),
    ) {
        Text(
            text = stringResource(Res.string.pro_badge_label),
            style = MaterialTheme.typography.labelLarge,
            color = premium,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
        )
    }
}

@Composable
private fun ColoredPriorityFormula(
    mediaTier: Int,
    weight: Int,
    holdBonus: Int,
    total: Int,
    mediaTierColor: Color,
    weightColor: Color,
    holdBonusColor: Color,
) {
    val scheme = MaterialTheme.colorScheme
    val operatorColor = scheme.onSurfaceVariant
    val numberStyle = MaterialTheme.typography.titleLarge
    val labelStyle = MaterialTheme.typography.labelSmall
    val labelColor = scheme.onSurfaceVariant

    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = mediaTier.toString(),
            style = numberStyle,
            color = mediaTierColor,
            modifier = Modifier.weight(1f),
            textAlign = TextAlign.Center,
        )
        FormulaOperator(text = "+", color = operatorColor, numberStyle = numberStyle)
        Text(
            text = weight.toString(),
            style = numberStyle,
            color = weightColor,
            modifier = Modifier.weight(1f),
            textAlign = TextAlign.Center,
        )
        FormulaOperator(text = "+", color = operatorColor, numberStyle = numberStyle)
        Text(
            text = holdBonus.toString(),
            style = numberStyle,
            color = holdBonusColor,
            modifier = Modifier.weight(1f),
            textAlign = TextAlign.Center,
        )
        FormulaOperator(text = "=", color = operatorColor, numberStyle = numberStyle)
        Text(
            text = total.toString(),
            style = numberStyle,
            color = scheme.primary,
            modifier = Modifier.widthIn(min = 44.dp),
            textAlign = TextAlign.Center,
        )
    }
    Spacer(Modifier.height(6.dp))
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top,
    ) {
        Text(
            text = stringResource(Res.string.devices_priority_formula_label_media_tier),
            style = labelStyle,
            color = labelColor,
            modifier = Modifier.weight(1f),
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.width(FormulaOperatorColumnWidth))
        Text(
            text = stringResource(Res.string.devices_priority_formula_label_weight),
            style = labelStyle,
            color = labelColor,
            modifier = Modifier.weight(1f),
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.width(FormulaOperatorColumnWidth))
        Text(
            text = stringResource(Res.string.devices_priority_formula_label_hold_bonus),
            style = labelStyle,
            color = labelColor,
            modifier = Modifier.weight(1f),
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.width(FormulaOperatorColumnWidth))
        Spacer(Modifier.widthIn(min = 44.dp))
    }
}

@Composable
private fun FormulaOperator(
    text: String,
    color: Color,
    numberStyle: TextStyle,
) {
    Text(
        text = text,
        style = numberStyle,
        color = color,
        textAlign = TextAlign.Center,
        modifier = Modifier.width(FormulaOperatorColumnWidth),
    )
}
