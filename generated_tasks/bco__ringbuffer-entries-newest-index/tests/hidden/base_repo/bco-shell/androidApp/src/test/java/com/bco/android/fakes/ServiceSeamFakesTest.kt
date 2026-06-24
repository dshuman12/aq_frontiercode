package com.bco.android.fakes

import com.bco.android.bluetooth.BluetoothA2dpActuator
import com.bco.android.service.AudioState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ServiceSeamFakesTest {

    @Test
    fun fakeAudioPlaybackMonitor_stateIsControllable() {
        val fake = FakeAudioPlaybackMonitor()
        assertEquals(AudioState.IDLE, fake.playbackState.value)
        fake.setPlaybackState(AudioState.MEDIA)
        assertEquals(AudioState.MEDIA, fake.playbackState.value)
    }

    @Test
    fun fakeCallAudioMonitor_stateIsControllable() {
        val fake = FakeCallAudioMonitor()
        fake.setCallAudioState(AudioState.ACTIVE_CALL)
        assertEquals(AudioState.ACTIVE_CALL, fake.callAudioState.value)
    }

    @Test
    fun fakeBluetoothA2dpActuator_connectAndDisconnect() {
        val fake = FakeBluetoothA2dpActuator()
        assertFalse(fake.isTargetA2dpConnected())
        fake.connectTarget {}
        assertTrue(fake.isTargetA2dpConnected())
        assertNull(fake.lastErrorMessage)
        fake.disconnectTarget {}
        assertFalse(fake.isTargetA2dpConnected())
    }

    @Test
    fun fakeBluetoothA2dpActuator_btConnectedStateTracksConnection() {
        val fake = FakeBluetoothA2dpActuator()
        assertFalse(fake.btConnectedState.value)
        fake.connectTarget {}
        assertTrue(fake.btConnectedState.value)
        fake.disconnectTarget {}
        assertFalse(fake.btConnectedState.value)
    }

    @Test
    fun fakeBluetoothA2dpActuator_errorConstantsMatchInterface() {
        assertEquals(
            BluetoothA2dpActuator.ERROR_NO_TARGET,
            FakeBluetoothA2dpActuator().apply { setLastError(BluetoothA2dpActuator.ERROR_NO_TARGET) }.lastErrorMessage,
        )
    }
}
