package com.bco.shared.designsystem.tokens

import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

data class BCOStatusColors(
    val connected: Color = Color(0xFF34C759),
    val connecting: Color = Color(0xFFF5A623),
    val disconnected: Color = Color(0xFFE04545),
    val call: Color = Color(0xFFE04545),
    val media: Color = Color(0xFF4D7CF6),
    val idle: Color = Color(0xFF7A7E91),
    val premium: Color = Color(0xFFA855F7),
)

val LocalBCOStatusColors = staticCompositionLocalOf { BCOStatusColors() }

data class BCOExtendedColors(
    val warningAccent: Color = Color(0xFFFF9800),
)

val LocalBCOExtendedColors = staticCompositionLocalOf { BCOExtendedColors() }

object BCOBrandColors {
    val phoneGreen = Color(0xFF4CAF50)
    val spotifyGreen = Color(0xFF1DB954)
    val slackPurple = Color(0xFF611F69)
    val mapsBlue = Color(0xFF4285F4)
}
