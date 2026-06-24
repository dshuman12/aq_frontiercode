package com.bco.shared.platform

import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.ImageBitmap

/**
 * Platform QR generation (e.g. ZXing on Android). Desktop or unsupported targets may return null.
 */
interface QrCodeProvider {
    /** @param foregroundArgb Packed ARGB color (0xAARRGGBB) for dark QR modules.
     *  @param backgroundArgb Packed ARGB color (0xAARRGGBB) for light QR modules. */
    fun generateQrBitmap(
        content: String,
        size: Int,
        foregroundArgb: Long = 0xFF000000L,
        backgroundArgb: Long = 0xFFFFFFFFL,
    ): ImageBitmap?
}

val LocalQrCodeProvider = staticCompositionLocalOf<QrCodeProvider> {
    error("No QrCodeProvider")
}
