package com.bco.shared.designsystem.component

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.bco.shared.designsystem.tokens.LocalBCOStatusColors

private const val ScrimAlpha = 0.58f
private const val BadgeSurfaceTintAlpha = 0.2f

@Composable
fun ProLockedOverlay(
    onUpgradeClick: () -> Unit,
    modifier: Modifier = Modifier,
    lockIconDescription: String = "Pro feature locked",
    badgeLabel: String = "Pro",
    upgradeLabel: String = "Upgrade to Pro",
    content: @Composable () -> Unit,
) {
    val scheme = MaterialTheme.colorScheme
    val statusColors = LocalBCOStatusColors.current
    val premium = statusColors.premium

    Box(modifier = modifier) {
        Box {
            content()
        }

        Box(
            Modifier
                .matchParentSize()
                .background(scheme.scrim.copy(alpha = ScrimAlpha))
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                ) { },
        )

        Column(
            modifier = Modifier
                .align(Alignment.Center)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Icon(
                imageVector = Icons.Filled.Lock,
                contentDescription = lockIconDescription,
                modifier = Modifier.size(40.dp),
                tint = premium,
            )
            Spacer(Modifier.height(12.dp))
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = premium.copy(alpha = BadgeSurfaceTintAlpha),
            ) {
                Text(
                    text = badgeLabel,
                    style = MaterialTheme.typography.labelLarge,
                    color = premium,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                )
            }
            Spacer(Modifier.height(8.dp))
            TextButton(
                onClick = onUpgradeClick,
                colors = ButtonDefaults.textButtonColors(contentColor = premium),
            ) {
                Text(
                    text = upgradeLabel,
                    style = MaterialTheme.typography.labelLarge,
                )
            }
        }
    }
}
