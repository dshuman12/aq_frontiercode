package com.bco.android.audio

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.AudioPlaybackConfiguration
import android.os.Handler
import android.os.Looper
import com.bco.android.service.AudioState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Detects local media-style playback via [AudioManager.registerAudioPlaybackCallback] (no polling).
 * Emits [AudioState.MEDIA] when at least one active playback session reports a media-like
 * [AudioAttributes.usage]; otherwise [AudioState.IDLE]. Voice-communication and notification-style
 * usages are excluded so call detection (T032) can own call-related states.
 */
class AudioMonitor(
    context: Context,
    private val mainHandler: Handler = Handler(Looper.getMainLooper()),
) : AudioPlaybackMonitor {
    private val appContext = context.applicationContext
    private val audioManager = appContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    private val _playbackState = MutableStateFlow(AudioState.IDLE)
    /** MEDIA or IDLE from playback detection only (US4 T031). */
    override val playbackState: StateFlow<AudioState> = _playbackState.asStateFlow()

    private val callback = object : AudioManager.AudioPlaybackCallback() {
        override fun onPlaybackConfigChanged(configs: MutableList<AudioPlaybackConfiguration>) {
            updateFromConfigurations(configs)
        }
    }

    override fun start() {
        audioManager.registerAudioPlaybackCallback(callback, mainHandler)
        updateFromConfigurations(audioManager.activePlaybackConfigurations)
    }

    override fun stop() {
        audioManager.unregisterAudioPlaybackCallback(callback)
    }

    private fun updateFromConfigurations(configs: Collection<AudioPlaybackConfiguration>) {
        val mediaActive = configs.any { cfg ->
            isMediaLikeUsage(cfg.audioAttributes.usage)
        }
        val next = if (mediaActive) AudioState.MEDIA else AudioState.IDLE
        if (_playbackState.value != next) {
            _playbackState.value = next
        }
    }

    private fun isMediaLikeUsage(usage: Int): Boolean =
        when (usage) {
            AudioAttributes.USAGE_MEDIA,
            AudioAttributes.USAGE_GAME,
            AudioAttributes.USAGE_ASSISTANT,
            AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE,
            AudioAttributes.USAGE_ASSISTANCE_SONIFICATION,
            AudioAttributes.USAGE_ASSISTANCE_ACCESSIBILITY,
            -> true
            else -> false
        }
}
