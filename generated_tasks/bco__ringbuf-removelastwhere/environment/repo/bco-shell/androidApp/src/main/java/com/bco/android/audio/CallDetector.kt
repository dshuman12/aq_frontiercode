package com.bco.android.audio

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.AudioPlaybackConfiguration
import android.os.Handler
import android.os.Looper
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import androidx.core.content.ContextCompat
import com.bco.android.service.AudioState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.concurrent.Executor

internal fun resolveVoicePlaybackFlags(
    playbackUsages: Collection<Int>,
): Pair<Boolean, Boolean> {
    val voiceCommunicationActive = playbackUsages.any { usage ->
        usage == AudioAttributes.USAGE_VOICE_COMMUNICATION
    }
    val voiceSignallingActive = playbackUsages.any { usage ->
        usage == AudioAttributes.USAGE_VOICE_COMMUNICATION_SIGNALLING
    }
    return voiceCommunicationActive to voiceSignallingActive
}

internal fun isCommunicationAudioMode(audioMode: Int): Boolean =
    audioMode == AudioManager.MODE_IN_COMMUNICATION || audioMode == AudioManager.MODE_IN_CALL

internal fun resolveCallAudioState(
    telephonyCallState: Int,
    audioMode: Int,
    voiceCommunicationActive: Boolean,
    voiceSignallingActive: Boolean,
): AudioState = when {
    telephonyCallState == TelephonyManager.CALL_STATE_RINGING -> AudioState.INCOMING_CALL
    telephonyCallState == TelephonyManager.CALL_STATE_OFFHOOK -> AudioState.ACTIVE_CALL
    audioMode == AudioManager.MODE_RINGTONE -> AudioState.INCOMING_CALL
    voiceCommunicationActive && (isCommunicationAudioMode(audioMode) || voiceSignallingActive) ->
        AudioState.ACTIVE_CALL
    voiceSignallingActive -> AudioState.INCOMING_CALL
    else -> AudioState.IDLE
}

/**
 * Cellular calls via [TelephonyManager.registerTelephonyCallback] and VoIP-style sessions via
 * [AudioManager.registerAudioPlaybackCallback] (no polling). Classifies into
 * [AudioState.INCOMING_CALL], [AudioState.ACTIVE_CALL], or [AudioState.IDLE] only; media is
 * handled by [AudioMonitor].
 */
class CallDetector(
    context: Context,
    private val mainHandler: Handler = Handler(Looper.getMainLooper()),
) : CallAudioMonitor {
    private val appContext = context.applicationContext
    private val telephonyManager = appContext.getSystemService(TelephonyManager::class.java)!!
    private val audioManager = appContext.getSystemService(AudioManager::class.java)!!

    private val mainExecutor: Executor = Executor { r -> mainHandler.post(r) }

    private val _callAudioState = MutableStateFlow(AudioState.IDLE)
    override val callAudioState: StateFlow<AudioState> = _callAudioState.asStateFlow()

    @Volatile
    private var telephonyCallState: Int = TelephonyManager.CALL_STATE_IDLE

    @Volatile
    private var voiceCommunicationActive: Boolean = false

    @Volatile
    private var voiceSignallingActive: Boolean = false

    private val modeChangedListener = AudioManager.OnModeChangedListener { recompute() }

    private val telephonyCallback =
        object : TelephonyCallback(), TelephonyCallback.CallStateListener {
            override fun onCallStateChanged(state: Int) {
                telephonyCallState = state
                recompute()
            }
        }

    private val playbackCallback = object : AudioManager.AudioPlaybackCallback() {
        override fun onPlaybackConfigChanged(configs: MutableList<AudioPlaybackConfiguration>) {
            updateVoiceFlags(configs)
        }
    }

    @Volatile
    private var telephonyRegistered: Boolean = false

    private fun hasPhoneStatePermission(): Boolean =
        ContextCompat.checkSelfPermission(appContext, Manifest.permission.READ_PHONE_STATE) ==
            PackageManager.PERMISSION_GRANTED

    @Volatile
    private var started: Boolean = false

    @SuppressLint("MissingPermission")
    override fun start() {
        if (started) return
        started = true
        audioManager.registerAudioPlaybackCallback(playbackCallback, mainHandler)
        audioManager.addOnModeChangedListener(mainExecutor, modeChangedListener)
        updateVoiceFlags(audioManager.activePlaybackConfigurations)
        syncTelephonyRegistration()
        recompute()
    }

    @SuppressLint("MissingPermission")
    private fun syncTelephonyRegistration() {
        if (!hasPhoneStatePermission()) {
            if (telephonyRegistered) {
                telephonyManager.unregisterTelephonyCallback(telephonyCallback)
                telephonyRegistered = false
            }
            telephonyCallState = TelephonyManager.CALL_STATE_IDLE
            return
        }
        telephonyCallState = telephonyManager.callStateForSubscription
        if (telephonyRegistered) return
        telephonyManager.registerTelephonyCallback(mainExecutor, telephonyCallback)
        telephonyRegistered = true
    }

    fun onPermissionsChanged() {
        if (!started) return
        syncTelephonyRegistration()
        recompute()
    }

    override fun stop() {
        started = false
        if (telephonyRegistered) {
            telephonyManager.unregisterTelephonyCallback(telephonyCallback)
            telephonyRegistered = false
        }
        audioManager.removeOnModeChangedListener(modeChangedListener)
        audioManager.unregisterAudioPlaybackCallback(playbackCallback)
        telephonyCallState = TelephonyManager.CALL_STATE_IDLE
        voiceCommunicationActive = false
        voiceSignallingActive = false
        _callAudioState.value = AudioState.IDLE
    }

    private fun updateVoiceFlags(configs: Collection<AudioPlaybackConfiguration>) {
        val (nextVoiceCommunicationActive, nextVoiceSignallingActive) = resolveVoicePlaybackFlags(
            configs.map { cfg -> cfg.audioAttributes.usage },
        )
        voiceCommunicationActive = nextVoiceCommunicationActive
        voiceSignallingActive = nextVoiceSignallingActive
        recompute()
    }

    private fun recompute() {
        val next = resolveCallAudioState(
            telephonyCallState = telephonyCallState,
            audioMode = audioManager.mode,
            voiceCommunicationActive = voiceCommunicationActive,
            voiceSignallingActive = voiceSignallingActive,
        )
        if (_callAudioState.value != next) {
            _callAudioState.value = next
        }
    }
}
