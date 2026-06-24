package com.bco.shared.platform

import java.nio.file.Files
import java.nio.file.Path
import java.util.Locale
import kotlin.io.path.Path

object DesktopPaths {
    private val osName: String by lazy {
        System.getProperty("os.name").lowercase(Locale.US)
    }

    val applicationSupportDir: Path by lazy {
        ensureDirectory(applicationSupportBaseDir().resolve("BCO"))
    }

    val engineStorageDir: Path by lazy {
        ensureDirectory(applicationSupportDir)
    }

    val runtimeDir: Path by lazy {
        ensureDirectory(applicationSupportDir.resolve("desktop-runtime"))
    }

    val nativeRuntimeDir: Path by lazy {
        ensureDirectory(runtimeDir.resolve("native"))
    }

    val helperRuntimeDir: Path by lazy {
        ensureDirectory(runtimeDir.resolve("helper"))
    }

    val preferencesFile: Path by lazy {
        applicationSupportDir.resolve("preferences.properties")
    }

    val instanceIdFile: Path by lazy {
        applicationSupportDir.resolve("instance.id")
    }

    private fun ensureDirectory(path: Path): Path {
        Files.createDirectories(path)
        return path
    }

    private fun applicationSupportBaseDir(): Path {
        val userHome = System.getProperty("user.home")
        return when {
            osName.contains("mac") -> Path(userHome, "Library", "Application Support")
            osName.contains("win") -> Path(
                System.getenv("LOCALAPPDATA")
                    ?: System.getenv("APPDATA")
                    ?: Path(userHome, "AppData", "Local").toString(),
            )
            else -> Path(
                System.getenv("XDG_DATA_HOME")
                    ?: Path(userHome, ".local", "share").toString(),
            )
        }
    }
}
