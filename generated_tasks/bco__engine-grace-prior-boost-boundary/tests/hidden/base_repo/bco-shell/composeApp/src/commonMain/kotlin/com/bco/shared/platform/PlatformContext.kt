package com.bco.shared.platform

import androidx.compose.runtime.staticCompositionLocalOf

expect class PlatformContext

/** Reads `bco/instance.id` from the platform app storage, if present. */
expect fun PlatformContext.readBcoInstanceIdOrNull(): String?

val LocalPlatformContext = staticCompositionLocalOf<PlatformContext> {
    error("No PlatformContext provided")
}
