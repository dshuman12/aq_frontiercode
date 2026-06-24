package com.bco.shared.platform

import android.content.Context
import java.io.File

actual class PlatformContext(val context: Context)

actual fun PlatformContext.hostPlatform(): HostPlatform = HostPlatform.Android

actual fun PlatformContext.readBcoInstanceIdOrNull(): String? {
    val f = File(context.filesDir, "bco/instance.id")
    if (!f.isFile) return null
    return try {
        f.readText().trim().takeIf { it.isNotEmpty() }
    } catch (_: java.io.IOException) {
        null
    }
}
