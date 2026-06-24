package com.bco.android.service

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.bco.android.MainActivity
import com.bco.android.R
import com.bco.android.core.PairingRequest
import com.bco.android.prefs.DevicePreferences

/**
 * Foreground service notification: channel, template lines (audio / BT / peers), and Stop action.
 * Pairing uses a high-importance channel and Approve/Deny [PendingIntent]s targeting [BCOService] (T039 handles actions).
 */
object NotificationHelper {

    const val FOREGROUND_CHANNEL_ID: String = "bco_foreground"
    const val FOREGROUND_NOTIFICATION_ID: Int = 1001

    const val PAIRING_CHANNEL_ID: String = "bco_pairing_alerts"
    private const val PAIRING_SILENT_CHANNEL_ID: String = "bco_pairing_silent"

    private const val REQUEST_CODE_STOP: Int = 1002
    private const val REQUEST_CODE_OPEN_APP: Int = 1003
    private const val PAIRING_NOTIFICATION_ID_BASE: Int = 10_000
    private const val REQUEST_CODE_PAIRING_APPROVE_BASE: Int = 5_000
    private const val REQUEST_CODE_PAIRING_DENY_BASE: Int = 15_000

    /**
     * Default "…" lines are replaced when the service posts a [ServiceStatus]-backed template (T030).
     * Live audio labels use [R.string.audio_state_*] via [ServiceStatus.toForegroundTemplate] (US4).
     */
    data class ForegroundTemplate(
        val audioState: String = "…",
        val bluetoothStatus: String = "…",
        val peerSummary: String = "…",
        /** Primary one-line summary under the title; defaults to [R.string.notification_foreground_text_placeholder]. */
        val statusLine: String? = null,
    )

    fun ensureForegroundChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val mgr = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channel = NotificationChannel(
            FOREGROUND_CHANNEL_ID,
            context.getString(R.string.notification_channel_foreground_name),
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = context.getString(R.string.notification_channel_foreground_description)
            setShowBadge(false)
        }
        mgr.createNotificationChannel(channel)
    }

    fun ensurePairingChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val mgr = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val alertsChannel = NotificationChannel(
            PAIRING_CHANNEL_ID,
            context.getString(R.string.notification_channel_pairing_name),
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = context.getString(R.string.notification_channel_pairing_description)
            setShowBadge(true)
            enableVibration(true)
        }
        val silentChannel = NotificationChannel(
            PAIRING_SILENT_CHANNEL_ID,
            context.getString(R.string.notification_channel_pairing_silent_name),
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = context.getString(R.string.notification_channel_pairing_silent_description)
            setShowBadge(true)
            enableVibration(false)
            setSound(null, null)
        }
        mgr.createNotificationChannels(listOf(alertsChannel, silentChannel))
    }

    /** Stable id per [PairingRequest.peerId] so concurrent requests do not clobber each other. */
    fun pairingNotificationId(peerId: String): Int =
        PAIRING_NOTIFICATION_ID_BASE + (peerId.hashCode() and 0xFFF)

    private fun pairingApproveRequestCode(peerId: String): Int =
        REQUEST_CODE_PAIRING_APPROVE_BASE + (peerId.hashCode() and 0xFFF)

    private fun pairingDenyRequestCode(peerId: String): Int =
        REQUEST_CODE_PAIRING_DENY_BASE + (peerId.hashCode() and 0xFFF)

    private fun appOpenPendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        return PendingIntent.getActivity(context, REQUEST_CODE_OPEN_APP, intent, flags)
    }

    private fun pairingChannelId(context: Context): String =
        if (DevicePreferences(context).peerEventSoundEnabled) {
            PAIRING_CHANNEL_ID
        } else {
            PAIRING_SILENT_CHANNEL_ID
        }

    /**
     * Shows a heads-up pairing notification with peer name, compare code, and Approve/Deny actions.
     * Intents use [BCOService.ACTION_PAIRING_APPROVE] / [BCOService.ACTION_PAIRING_DENY] and
     * [BCOService.EXTRA_PAIRING_PEER_ID]; [BCOService] handling is implemented in T039.
     */
    fun notifyPairingRequest(context: Context, request: PairingRequest) {
        ensurePairingChannel(context)
        val notification = buildPairingNotification(context, request).build()
        notifyCompat(context, pairingNotificationId(request.peerId), notification)
    }

    fun buildPairingNotification(context: Context, request: PairingRequest): NotificationCompat.Builder {
        ensurePairingChannel(context)
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        val contentPending = appOpenPendingIntent(context)
        val approveIntent = Intent(context, BCOService::class.java).apply {
            action = BCOService.ACTION_PAIRING_APPROVE
            putExtra(BCOService.EXTRA_PAIRING_PEER_ID, request.peerId)
        }
        val denyIntent = Intent(context, BCOService::class.java).apply {
            action = BCOService.ACTION_PAIRING_DENY
            putExtra(BCOService.EXTRA_PAIRING_PEER_ID, request.peerId)
        }
        val approvePending = PendingIntent.getService(
            context,
            pairingApproveRequestCode(request.peerId),
            approveIntent,
            flags,
        )
        val denyPending = PendingIntent.getService(
            context,
            pairingDenyRequestCode(request.peerId),
            denyIntent,
            flags,
        )
        val text = if (request.targetBtDevice != null) {
            context.getString(
                R.string.notification_pairing_text_with_bt,
                request.peerName,
                request.targetBtDevice,
                request.compareCode,
            )
        } else {
            context.getString(
                R.string.notification_pairing_text,
                request.peerName,
                request.compareCode,
            )
        }
        return NotificationCompat.Builder(context, pairingChannelId(context))
            .setSmallIcon(R.drawable.ic_stat_bco)
            .setContentTitle(context.getString(R.string.notification_pairing_title))
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setContentIntent(contentPending)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setOnlyAlertOnce(true)
            .setAutoCancel(false)
            .addAction(
                R.drawable.ic_stat_bco,
                context.getString(R.string.notification_action_pairing_approve),
                approvePending,
            )
            .addAction(
                R.drawable.ic_stat_bco,
                context.getString(R.string.notification_action_pairing_deny),
                denyPending,
            )
    }

    fun buildForegroundPlaceholder(context: Context): NotificationCompat.Builder {
        return foregroundBuilder(context, ForegroundTemplate())
    }

    /** First-frame template before engine snapshot; audio line uses Idle (US4). */
    fun initialForegroundTemplate(context: Context): ForegroundTemplate =
        ForegroundTemplate(
            audioState = context.getString(R.string.audio_state_idle),
            bluetoothStatus = context.getString(R.string.bt_state_disconnected),
            peerSummary = "0",
        )

    /**
     * Posts [Service.startForeground] with the standard BCO notification (Stop action + template lines).
     */
    fun startForegroundWithTemplate(service: Service, template: ForegroundTemplate = ForegroundTemplate()) {
        val notification = foregroundBuilder(service, template).build()
        service.startForeground(FOREGROUND_NOTIFICATION_ID, notification)
    }

    /** Updates the foreground notification in place (same layout as [startForegroundWithTemplate]). */
    fun notifyForegroundRefresh(context: Context, contentText: CharSequence) {
        val notification = foregroundBuilder(
            context,
            ForegroundTemplate(statusLine = contentText.toString()),
        ).build()
        updateForegroundNotification(context, notification)
    }

    /** Full template refresh (e.g. once [ServiceStatus] is wired in T030). */
    fun notifyForegroundTemplate(context: Context, template: ForegroundTemplate) {
        val notification = foregroundBuilder(context, template).build()
        updateForegroundNotification(context, notification)
    }

    private fun foregroundBuilder(context: Context, template: ForegroundTemplate): NotificationCompat.Builder {
        ensureForegroundChannel(context)
        val detailedNotifications = DevicePreferences(context).detailedNotifications
        val stopIntent = Intent(context, BCOService::class.java).apply {
            action = BCOService.ACTION_STOP
        }
        val stopFlags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        val stopPending = PendingIntent.getService(context, REQUEST_CODE_STOP, stopIntent, stopFlags)
        val contentPending = appOpenPendingIntent(context)
        val summary = template.statusLine ?: context.getString(R.string.notification_foreground_text_placeholder)
        val inbox = NotificationCompat.InboxStyle()
            .setSummaryText(summary)
            .addLine(context.getString(R.string.notification_line_audio, template.audioState))
            .addLine(context.getString(R.string.notification_line_bt, template.bluetoothStatus))
            .addLine(context.getString(R.string.notification_line_peers, template.peerSummary))
        val builder = NotificationCompat.Builder(context, FOREGROUND_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_bco)
            .setContentTitle(context.getString(R.string.notification_foreground_title))
            .setContentText(summary)
            .setContentIntent(contentPending)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .addAction(
                R.drawable.ic_stat_bco,
                context.getString(R.string.notification_action_stop),
                stopPending,
            )
        if (detailedNotifications) {
            builder.setStyle(inbox)
        }
        return builder
    }

    private fun updateForegroundNotification(context: Context, notification: android.app.Notification) {
        if (context is Service) {
            context.startForeground(FOREGROUND_NOTIFICATION_ID, notification)
            return
        }
        notifyCompat(context, FOREGROUND_NOTIFICATION_ID, notification)
    }

    /**
     * API 33+ requires [Manifest.permission.POST_NOTIFICATIONS] for notifications shown via
     * [NotificationManager.notify]. Foreground service updates are handled separately via
     * [Service.startForeground]; this path covers non-FGS notifications like pairing alerts.
     */
    private fun notifyCompat(context: Context, id: Int, notification: android.app.Notification) {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            return
        }
        try {
            NotificationManagerCompat.from(context).notify(id, notification)
        } catch (_: SecurityException) {
            // Permission revoked or OEM restriction
        }
    }
}
