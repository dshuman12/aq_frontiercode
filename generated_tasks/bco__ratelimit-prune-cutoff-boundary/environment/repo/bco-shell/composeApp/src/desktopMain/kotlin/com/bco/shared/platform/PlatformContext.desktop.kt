package com.bco.shared.platform

actual class PlatformContext

actual fun PlatformContext.hostPlatform(): HostPlatform = HostPlatform.Desktop

actual fun PlatformContext.readBcoInstanceIdOrNull(): String? = runCatching {
    DesktopPaths.instanceIdFile
        .toFile()
        .takeIf { it.isFile }
        ?.readText()
        ?.trim()
        ?.takeIf { it.isNotEmpty() }
}.getOrNull()
