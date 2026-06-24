package com.bco.shared.designsystem.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.text.font.FontFamily
import com.bco.shared.designsystem.tokens.BCOExtendedColors
import com.bco.shared.designsystem.tokens.BCOSpacing
import com.bco.shared.designsystem.tokens.LocalBCOExtendedColors
import com.bco.shared.designsystem.tokens.LocalBCOFontFamily
import com.bco.shared.designsystem.tokens.LocalBCOSpacing
import com.bco.shared.designsystem.tokens.LocalBCOStatusColors
import com.bco.shared.designsystem.tokens.bcoTypography

@Composable
fun BCOTheme(
    palette: BCOColorPalette = BCOColorPalette.Dark,
    fontFamily: FontFamily = FontFamily.Default,
    content: @Composable () -> Unit,
) {
    CompositionLocalProvider(
        LocalBCOStatusColors provides palette.statusColors,
        LocalBCOFontFamily provides fontFamily,
        LocalBCOSpacing provides BCOSpacing(),
        LocalBCOExtendedColors provides BCOExtendedColors(),
    ) {
        MaterialTheme(
            colorScheme = palette.colorScheme,
            typography = bcoTypography(fontFamily),
            content = content,
        )
    }
}
