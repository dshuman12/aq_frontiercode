package com.bco.shared.platform

import android.annotation.SuppressLint
import android.bluetooth.BluetoothClass
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.content.Context

class AndroidBluetoothDeviceProvider(
    private val context: Context,
) : BluetoothDeviceProvider {

    @SuppressLint("MissingPermission")
    override suspend fun getAdapterDisplayNameOrNull(): String? {
        val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager ?: return null
        val adapter = manager.adapter ?: return null
        return try {
            adapter.name?.takeIf { it.isNotBlank() }
        } catch (_: SecurityException) {
            null
        }
    }

    @SuppressLint("MissingPermission")
    override suspend fun getBondedAudioDevices(): List<BluetoothDeviceInfo> {
        val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        val adapter = manager?.adapter ?: return emptyList()
        return try {
            adapter.bondedDevices
                .filter { it.isAudioRelevant() }
                .sortedWith(compareBy({ it.name.orEmpty().lowercase() }, { it.address }))
                .map { dev ->
                    BluetoothDeviceInfo(
                        name = dev.name.orEmpty(),
                        address = dev.address,
                        majorClass = dev.bluetoothClass?.majorDeviceClass ?: 0,
                        isConnected = false,
                        isLeOnly = dev.isLeOnlyType(),
                        headsetIconKind = dev.headsetIconKind(),
                    )
                }
        } catch (_: SecurityException) {
            emptyList()
        }
    }

    private fun BluetoothDevice.isLeOnlyType(): Boolean =
        type == BluetoothDevice.DEVICE_TYPE_LE

    private fun BluetoothDevice.headsetIconKind(): BluetoothHeadsetIconKind {
        val cls = bluetoothClass ?: return BluetoothHeadsetIconKind.Headphones
        return when (cls.deviceClass) {
            BluetoothClass.Device.AUDIO_VIDEO_CAR_AUDIO -> BluetoothHeadsetIconKind.CarAudio
            BluetoothClass.Device.AUDIO_VIDEO_PORTABLE_AUDIO -> BluetoothHeadsetIconKind.PortableSpeaker
            else -> BluetoothHeadsetIconKind.Headphones
        }
    }

    private fun BluetoothDevice.isAudioRelevant(): Boolean {
        val cls = bluetoothClass ?: return false
        return when (cls.deviceClass) {
            BluetoothClass.Device.AUDIO_VIDEO_HEADPHONES,
            BluetoothClass.Device.AUDIO_VIDEO_WEARABLE_HEADSET,
            BluetoothClass.Device.AUDIO_VIDEO_HANDSFREE,
            BluetoothClass.Device.AUDIO_VIDEO_PORTABLE_AUDIO,
            BluetoothClass.Device.AUDIO_VIDEO_CAR_AUDIO -> true
            else -> false
        }
    }
}
