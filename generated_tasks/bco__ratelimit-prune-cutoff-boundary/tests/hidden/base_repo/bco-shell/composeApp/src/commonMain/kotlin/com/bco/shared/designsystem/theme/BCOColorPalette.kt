package com.bco.shared.designsystem.theme

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.ui.graphics.Color
import com.bco.shared.designsystem.tokens.BCOStatusColors

sealed interface BCOColorPalette {
    val colorScheme: ColorScheme
    val statusColors: BCOStatusColors

    data object Dark : BCOColorPalette {
        override val colorScheme = darkColorScheme(
            primary = Color(0xFF4D7CF6),
            onPrimary = Color(0xFF141625),
            primaryContainer = Color(0xFF1A2A5E),
            onPrimaryContainer = Color(0xFFD0DEFF),
            secondary = Color(0xFF1C1E2E),
            onSecondary = Color(0xFFDCDDE5),
            background = Color(0xFF111827),
            onBackground = Color(0xFFE8E9ED),
            surface = Color(0xFF1E2030),
            onSurface = Color(0xFFE8E9ED),
            surfaceVariant = Color(0xFF232538),
            onSurfaceVariant = Color(0xFF8B8FA3),
            outline = Color(0xFF2E3348),
            outlineVariant = Color(0xFF2A2C3E),
            error = Color(0xFFC93B3B),
            onError = Color(0xFFE8E9ED),
        )
        override val statusColors = BCOStatusColors()
    }

    data object Light : BCOColorPalette {
        override val colorScheme = lightColorScheme(
            primary = Color(0xFF3B63CC),
            onPrimary = Color(0xFFFFFFFF),
            primaryContainer = Color(0xFFD8E2FF),
            onPrimaryContainer = Color(0xFF001A42),
            secondary = Color(0xFFE8E9F0),
            onSecondary = Color(0xFF1E1F28),
            background = Color(0xFFF8F9FC),
            onBackground = Color(0xFF1A1B23),
            surface = Color(0xFFFFFFFF),
            onSurface = Color(0xFF1A1B23),
            surfaceVariant = Color(0xFFE8E9F0),
            onSurfaceVariant = Color(0xFF5A5D6E),
            outline = Color(0xFFCDD0DC),
            outlineVariant = Color(0xFFE0E2EB),
            error = Color(0xFFBA1A1A),
            onError = Color(0xFFFFFFFF),
        )
        override val statusColors = BCOStatusColors(
            connected = Color(0xFF2DA44E),
            connecting = Color(0xFFD4920A),
            disconnected = Color(0xFFCF222E),
            call = Color(0xFFCF222E),
            media = Color(0xFF3B63CC),
            idle = Color(0xFF6E7281),
            premium = Color(0xFF8250DF),
        )
    }
}
