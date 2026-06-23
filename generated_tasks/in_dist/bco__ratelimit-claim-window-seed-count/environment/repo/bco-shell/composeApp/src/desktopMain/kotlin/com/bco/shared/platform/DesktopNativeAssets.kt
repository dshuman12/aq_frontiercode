package com.bco.shared.platform

import java.nio.file.Files
import java.nio.file.Path

object DesktopNativeAssets {
    private const val LIB_RESOURCE = "/native/macos/libbconet.dylib"
    private const val HELPER_RESOURCE = "/native/macos/BCODesktopHelper"

    data class ExtractedAssets(
        val nativeLibDir: Path,
        val libbconetPath: Path,
        val helperPath: Path?,
    )

    @Volatile
    private var cached: ExtractedAssets? = null

    fun ensureExtracted(): ExtractedAssets {
        cached?.let { return it }

        synchronized(this) {
            cached?.let { return it }

            val libPath = DesktopPaths.nativeRuntimeDir.resolve("libbconet.dylib")
            val libExtracted = copyResourceIfPresent(LIB_RESOURCE, libPath, executable = false)
            check(libExtracted) {
                "Required native library resource $LIB_RESOURCE was not found; expected to extract to $libPath"
            }

            val helperPath = DesktopPaths.helperRuntimeDir.resolve("BCODesktopHelper")
            val resolvedHelper = if (copyResourceIfPresent(HELPER_RESOURCE, helperPath, executable = true)) {
                helperPath
            } else {
                null
            }

            return ExtractedAssets(
                nativeLibDir = DesktopPaths.nativeRuntimeDir,
                libbconetPath = libPath,
                helperPath = resolvedHelper,
            ).also { cached = it }
        }
    }

    private fun copyResourceIfPresent(resourcePath: String, targetPath: Path, executable: Boolean): Boolean {
        val input = DesktopNativeAssets::class.java.getResourceAsStream(resourcePath) ?: return false
        input.use { stream ->
            Files.createDirectories(targetPath.parent)
            Files.copy(stream, targetPath, java.nio.file.StandardCopyOption.REPLACE_EXISTING)
        }
        targetPath.toFile().apply {
            check(setReadable(true, false)) {
                "Could not mark extracted asset as readable: $targetPath"
            }
            check(setWritable(true, true)) {
                "Could not mark extracted asset as owner-writable: $targetPath"
            }
            if (executable) {
                check(setExecutable(true, false)) {
                    "Could not mark extracted asset as executable: $targetPath"
                }
            }
        }
        return true
    }
}
