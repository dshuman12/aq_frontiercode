package com.bco.shared.ui.devices

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.DragHandle
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.bco.shared.resources.Res
import com.bco.shared.resources.devices_per_app_drag_handle_cd
import com.bco.shared.resources.devices_per_app_name_maps
import com.bco.shared.resources.devices_per_app_name_phone
import com.bco.shared.resources.devices_per_app_name_slack
import com.bco.shared.resources.devices_per_app_name_spotify
import com.bco.shared.resources.devices_per_app_priority_section_title
import com.bco.shared.resources.devices_per_app_tier_critical
import com.bco.shared.resources.devices_per_app_tier_high
import com.bco.shared.resources.devices_per_app_tier_low
import com.bco.shared.resources.devices_per_app_tier_media
import com.bco.shared.resources.devices_per_app_upgrade_row
import com.bco.shared.resources.devices_per_app_upgrade_row_cd
import com.bco.shared.resources.pro_badge_label
import com.bco.shared.model.SubscriptionPlan
import com.bco.shared.designsystem.component.BCOCard
import com.bco.shared.designsystem.tokens.BCOBrandColors
import com.bco.shared.designsystem.tokens.LocalBCOStatusColors
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

private data class PerAppRow(
    val icon: ImageVector,
    val appNameRes: StringResource,
    val tierLabelRes: StringResource,
    val iconTint: Color,
    val iconBackground: Color,
)

private val IllustrativePerAppRows = listOf(
    PerAppRow(
        icon = Icons.Filled.Phone,
        appNameRes = Res.string.devices_per_app_name_phone,
        tierLabelRes = Res.string.devices_per_app_tier_critical,
        iconTint = BCOBrandColors.phoneGreen,
        iconBackground = BCOBrandColors.phoneGreen.copy(alpha = 0.22f),
    ),
    PerAppRow(
        icon = Icons.Filled.MusicNote,
        appNameRes = Res.string.devices_per_app_name_spotify,
        tierLabelRes = Res.string.devices_per_app_tier_media,
        iconTint = BCOBrandColors.spotifyGreen,
        iconBackground = BCOBrandColors.spotifyGreen.copy(alpha = 0.22f),
    ),
    PerAppRow(
        icon = Icons.AutoMirrored.Filled.Chat,
        appNameRes = Res.string.devices_per_app_name_slack,
        tierLabelRes = Res.string.devices_per_app_tier_low,
        iconTint = BCOBrandColors.slackPurple,
        iconBackground = BCOBrandColors.slackPurple.copy(alpha = 0.22f),
    ),
    PerAppRow(
        icon = Icons.Filled.Map,
        appNameRes = Res.string.devices_per_app_name_maps,
        tierLabelRes = Res.string.devices_per_app_tier_high,
        iconTint = BCOBrandColors.mapsBlue,
        iconBackground = BCOBrandColors.mapsBlue.copy(alpha = 0.22f),
    ),
)

private const val ProBadgeSurfaceAlpha = 0.2f

private val AppIconSize = 40.dp

/**
 * Devices tab section: illustrative per-app priority tiers (v0 card). Free tier: list visible with
 * Pro badge in header and upgrade row with chevron. Pro: [SubscriptionPlan.hasPerAppPriority] hides
 * the upgrade row.
 */
@Composable
fun PerAppPrioritySection(
    plan: SubscriptionPlan,
    onUpgradeClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val scheme = MaterialTheme.colorScheme
    val unlocked = plan.hasPerAppPriority
    val upgradeRowCd = stringResource(Res.string.devices_per_app_upgrade_row_cd)

    BCOCard(
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = stringResource(Res.string.devices_per_app_priority_section_title),
                    style = MaterialTheme.typography.titleMedium,
                    color = scheme.onSurface,
                    modifier = Modifier.weight(1f),
                )
                if (!unlocked) {
                    PerAppProFeatureBadge()
                }
            }
            Spacer(Modifier.height(16.dp))

            PerAppPriorityList()

            if (!unlocked) {
                Spacer(Modifier.height(8.dp))
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
                        text = stringResource(Res.string.devices_per_app_upgrade_row),
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
private fun PerAppProFeatureBadge() {
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
private fun PerAppPriorityList() {
    val scheme = MaterialTheme.colorScheme
    val dragCd = stringResource(Res.string.devices_per_app_drag_handle_cd)
    IllustrativePerAppRows.forEachIndexed { index, row ->
        if (index > 0) {
            Spacer(Modifier.height(8.dp))
            HorizontalDivider(color = scheme.outlineVariant)
            Spacer(Modifier.height(8.dp))
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = row.iconBackground,
                modifier = Modifier.size(AppIconSize),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .clip(RoundedCornerShape(10.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = row.icon,
                        contentDescription = null,
                        modifier = Modifier.size(22.dp),
                        tint = row.iconTint,
                    )
                }
            }
            Spacer(Modifier.width(12.dp))
            Text(
                text = stringResource(row.appNameRes),
                style = MaterialTheme.typography.bodyMedium,
                color = scheme.onSurface,
                modifier = Modifier.weight(1f),
            )
            Text(
                text = stringResource(row.tierLabelRes),
                style = MaterialTheme.typography.labelLarge,
                color = scheme.primary,
            )
            Spacer(Modifier.width(8.dp))
            Icon(
                imageVector = Icons.Filled.DragHandle,
                contentDescription = dragCd,
                tint = scheme.onSurfaceVariant,
            )
        }
    }
}
