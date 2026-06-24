package com.bco.android.audio

import com.bco.android.service.AudioState
import kotlinx.coroutines.flow.StateFlow

/** Test seam for [CallDetector]; exposes call-related [AudioState] only. */
interface CallAudioMonitor {
    val callAudioState: StateFlow<AudioState>
    fun start()
    fun stop()
}
