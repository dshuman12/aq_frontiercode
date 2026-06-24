package com.bco.android.fakes

import com.bco.android.audio.AudioPlaybackMonitor
import com.bco.android.service.AudioState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** JVM-test double for [com.bco.android.audio.AudioMonitor]. */
class FakeAudioPlaybackMonitor(
    initial: AudioState = AudioState.IDLE,
) : AudioPlaybackMonitor {
    private val _playbackState = MutableStateFlow(initial)
    override val playbackState: StateFlow<AudioState> = _playbackState.asStateFlow()

    fun setPlaybackState(state: AudioState) {
        _playbackState.value = state
    }

    override fun start() {}
    override fun stop() {}
}
