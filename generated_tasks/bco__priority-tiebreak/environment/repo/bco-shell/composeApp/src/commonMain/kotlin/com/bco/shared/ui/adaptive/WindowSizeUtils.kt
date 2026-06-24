package com.bco.shared.ui.adaptive

import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

object BCOWindowWidthBreakpoints {
    val compactMaxExclusive: Dp = 600.dp
    val mediumMaxInclusive: Dp = 840.dp
}

fun windowWidthSizeClassFromWidthDp(widthDp: Dp): WindowWidthSizeClass =
    when {
        widthDp < BCOWindowWidthBreakpoints.compactMaxExclusive -> WindowWidthSizeClass.Compact
        widthDp <= BCOWindowWidthBreakpoints.mediumMaxInclusive -> WindowWidthSizeClass.Medium
        else -> WindowWidthSizeClass.Expanded
    }

fun WindowWidthSizeClass.isCompact(): Boolean = this == WindowWidthSizeClass.Compact

fun WindowWidthSizeClass.isMedium(): Boolean = this == WindowWidthSizeClass.Medium

fun WindowWidthSizeClass.isExpanded(): Boolean = this == WindowWidthSizeClass.Expanded

fun WindowWidthSizeClass.isAtLeastMedium(): Boolean =
    this >= WindowWidthSizeClass.Medium

fun WindowWidthSizeClass.isAtLeastExpanded(): Boolean =
    this >= WindowWidthSizeClass.Expanded
