package com.bco.android.fakes

import com.bco.android.audio.CallAudioMonitor
import com.bco.android.service.AudioState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** JVM-test double for [com.bco.android.audio.CallDetector]. */
class FakeCallAudioMonitor(
    initial: AudioState = AudioState.IDLE,
) : CallAudioMonitor {
    private val _callAudioState = MutableStateFlow(initial)
    override val callAudioState: StateFlow<AudioState> = _callAudioState.asStateFlow()

    fun setCallAudioState(state: AudioState) {
        _callAudioState.value = state
    }

    override fun start() {}
    override fun stop() {}
}
