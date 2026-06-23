package com.bco.android.audio

import android.media.AudioAttributes
import android.media.AudioManager
import android.telephony.TelephonyManager
import com.bco.android.service.AudioState
import org.junit.Assert.assertEquals
import org.junit.Test

class CallDetectorLogicTest {
    @Test
    fun resolveVoicePlaybackFlags_detectsVoiceCommunicationAndSignallingUsages() {
        val (voiceCommunicationActive, voiceSignallingActive) = resolveVoicePlaybackFlags(
            listOf(
                AudioAttributes.USAGE_MEDIA,
                AudioAttributes.USAGE_VOICE_COMMUNICATION,
                AudioAttributes.USAGE_VOICE_COMMUNICATION_SIGNALLING,
            ),
        )

        assertEquals(true, voiceCommunicationActive)
        assertEquals(true, voiceSignallingActive)
    }

    @Test
    fun resolveCallAudioState_prioritizesTelephonyOverPlaybackFlags() {
        val state = resolveCallAudioState(
            telephonyCallState = TelephonyManager.CALL_STATE_RINGING,
            audioMode = AudioManager.MODE_NORMAL,
            voiceCommunicationActive = true,
            voiceSignallingActive = false,
        )

        assertEquals(AudioState.INCOMING_CALL, state)
    }

    @Test
    fun resolveCallAudioState_requiresCommunicationModeForVoiceCommunicationOnly() {
        val state = resolveCallAudioState(
            telephonyCallState = TelephonyManager.CALL_STATE_IDLE,
            audioMode = AudioManager.MODE_NORMAL,
            voiceCommunicationActive = true,
            voiceSignallingActive = false,
        )

        assertEquals(AudioState.IDLE, state)
    }

    @Test
    fun resolveCallAudioState_promotesVoiceCommunicationWhenModeIsInCommunication() {
        val state = resolveCallAudioState(
            telephonyCallState = TelephonyManager.CALL_STATE_IDLE,
            audioMode = AudioManager.MODE_IN_COMMUNICATION,
            voiceCommunicationActive = true,
            voiceSignallingActive = false,
        )

        assertEquals(AudioState.ACTIVE_CALL, state)
    }

    @Test
    fun resolveCallAudioState_returnsIncomingForVoiceSignallingOrRingtoneMode() {
        val state = resolveCallAudioState(
            telephonyCallState = TelephonyManager.CALL_STATE_IDLE,
            audioMode = AudioManager.MODE_RINGTONE,
            voiceCommunicationActive = false,
            voiceSignallingActive = true,
        )

        assertEquals(AudioState.INCOMING_CALL, state)
    }
}
