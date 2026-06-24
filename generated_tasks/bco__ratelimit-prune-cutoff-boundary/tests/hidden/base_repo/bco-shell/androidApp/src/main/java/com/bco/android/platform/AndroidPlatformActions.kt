package com.bco.android.platform

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.widget.Toast
import com.bco.android.core.BcoCoreMetadata
import com.bco.shared.platform.PlatformActions

class AndroidPlatformActions(
    private val context: Context,
) : PlatformActions {

    private val appContext = context.applicationContext

    override fun copyToClipboard(text: String, label: String) {
        val cm = appContext.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clipLabel = label.ifEmpty { "text" }
        cm.setPrimaryClip(ClipData.newPlainText(clipLabel, text))
    }

    override fun showToast(message: String) {
        Toast.makeText(appContext, message, Toast.LENGTH_SHORT).show()
    }

    override fun shareText(subject: String, text: String, chooserTitle: String?) {
        val send = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, subject)
            putExtra(Intent.EXTRA_TEXT, text)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        val chooser = Intent.createChooser(send, chooserTitle).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        appContext.startActivity(chooser)
    }

    override fun openUrl(url: String) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        appContext.startActivity(intent)
    }

    override fun getAppVersion(): String {
        return runCatching {
            val pm = appContext.packageManager
            val pkg = appContext.packageName
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                pm.getPackageInfo(pkg, PackageManager.PackageInfoFlags.of(0)).versionName
            } else {
                @Suppress("DEPRECATION")
                pm.getPackageInfo(pkg, 0).versionName
            }
        }.getOrNull().orEmpty().ifEmpty { "unknown" }
    }

    override fun getBuildDiagnosticText(): String {
        val ver = runCatching {
            val pm = appContext.packageManager
            val pkg = appContext.packageName
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                pm.getPackageInfo(pkg, PackageManager.PackageInfoFlags.of(0))
            } else {
                @Suppress("DEPRECATION")
                pm.getPackageInfo(pkg, 0)
            }
        }.getOrNull()
        val name = ver?.versionName ?: "unknown"
        val code = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            ver?.longVersionCode?.toString() ?: "?"
        } else {
            @Suppress("DEPRECATION")
            ver?.versionCode?.toString() ?: "?"
        }
        return "version=$name ($code)"
    }

    override fun getCoreVersionOrNull(): String? = BcoCoreMetadata.getCoreVersionOrNull()
}
