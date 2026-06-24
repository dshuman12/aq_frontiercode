package com.bco.shared.platform

enum class HostPlatform {
    Android,
    Desktop,
}

expect fun PlatformContext.hostPlatform(): HostPlatform

fun PlatformContext.isDesktopHost(): Boolean = hostPlatform() == HostPlatform.Desktop
