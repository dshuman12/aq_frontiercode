package com.bco.shared.platform

import android.graphics.Bitmap
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter

class ZxingQrCodeProvider : QrCodeProvider {
    override fun generateQrBitmap(
        content: String,
        size: Int,
        foregroundArgb: Long,
        backgroundArgb: Long,
    ): ImageBitmap? {
        return try {
            val hints = mapOf(EncodeHintType.MARGIN to 1)
            val bitMatrix = QRCodeWriter().encode(
                content,
                BarcodeFormat.QR_CODE,
                size,
                size,
                hints,
            )
            val w = bitMatrix.width
            val h = bitMatrix.height
            val fg = (foregroundArgb and 0xFFFFFFFFL).toInt()
            val bg = (backgroundArgb and 0xFFFFFFFFL).toInt()
            val pixels = IntArray(w * h)
            for (y in 0 until h) {
                for (x in 0 until w) {
                    pixels[y * w + x] = if (bitMatrix[x, y]) fg else bg
                }
            }
            Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888).apply {
                setPixels(pixels, 0, w, 0, 0, w, h)
            }.asImageBitmap()
        } catch (_: Exception) {
            null
        }
    }
}
