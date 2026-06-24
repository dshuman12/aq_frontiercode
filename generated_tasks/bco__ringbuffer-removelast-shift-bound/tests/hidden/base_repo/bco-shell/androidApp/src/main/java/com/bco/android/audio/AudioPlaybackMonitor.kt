package com.bco.android.audio

import com.bco.android.service.AudioState
import kotlinx.coroutines.flow.StateFlow

/** Test seam for [AudioMonitor]; exposes playback-derived [AudioState] only. */
interface AudioPlaybackMonitor {
    val playbackState: StateFlow<AudioState>
    fun start()
    fun stop()
}
