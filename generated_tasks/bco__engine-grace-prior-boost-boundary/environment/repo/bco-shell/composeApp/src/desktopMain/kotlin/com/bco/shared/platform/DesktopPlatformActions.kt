package com.bco.shared.platform

import java.awt.Desktop
import java.awt.GraphicsEnvironment
import java.awt.SystemTray
import java.awt.Toolkit
import java.awt.TrayIcon
import java.awt.datatransfer.StringSelection
import java.net.URI

class DesktopPlatformActions : PlatformActions {
    override fun copyToClipboard(text: String, label: String) {
        if (GraphicsEnvironment.isHeadless()) return
        try {
            val clipboard = Toolkit.getDefaultToolkit().systemClipboard
            clipboard.setContents(StringSelection(text), null)
        } catch (_: Exception) { }
    }

    override fun showToast(message: String) {
        println("[BCO] $message")
        if (GraphicsEnvironment.isHeadless()) return
        try {
            if (SystemTray.isSupported()) {
                val tray = SystemTray.getSystemTray()
                val existing = tray.trayIcons.firstOrNull()
                existing?.displayMessage("BCO", message, TrayIcon.MessageType.INFO)
            }
        } catch (_: Exception) { }
    }

    override fun shareText(subject: String, text: String, chooserTitle: String?) {
        copyToClipboard(text, subject)
        showToast("Copied to clipboard")
    }

    override fun openUrl(url: String) {
        try {
            if (!Desktop.isDesktopSupported() ||
                !Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)
            ) {
                showToast("Could not open URL: $url")
                return
            }
            Desktop.getDesktop().browse(URI(url))
        } catch (_: Exception) {
            showToast("Could not open URL: $url")
        }
    }

    override fun getAppVersion(): String {
        val pkgVersion = DesktopPlatformActions::class.java.`package`?.implementationVersion
        return pkgVersion?.takeIf { it.isNotBlank() } ?: "dev"
    }

    override fun getBuildDiagnosticText(): String = buildString {
        appendLine("Platform: Desktop (JVM)")
        appendLine("OS: ${System.getProperty("os.name")} ${System.getProperty("os.version")}")
        appendLine("Java: ${System.getProperty("java.version")}")
        appendLine("App support: ${DesktopPaths.applicationSupportDir}")
    }

    override fun getCoreVersionOrNull(): String? = DesktopCoreMetadata.getCoreVersionOrNull()
}
