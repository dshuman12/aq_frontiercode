package com.bco.android.bluetooth

/**
 * MAC-address helpers for the Android shell.
 *
 * Android's [android.bluetooth.BluetoothAdapter.checkBluetoothAddress] only accepts the canonical
 * `XX:XX:XX:XX:XX:XX` form (uppercase, colon-separated), and [android.bluetooth.BluetoothAdapter.getRemoteDevice]
 * throws `IllegalArgumentException` otherwise. Other platforms (notably macOS' `IOBluetoothDevice.addressString`)
 * surface MACs as `xx-xx-xx-xx-xx-xx` (lowercase, hyphen-separated). When a peer broadcasts its headset target,
 * the raw string would otherwise poison [com.bco.android.prefs.DevicePreferences.targetBTAddress] and break every
 * subsequent A2DP connect/disconnect on this phone (US5 handover).
 *
 * Normalize at every persistence and consumer boundary so format-mismatched inputs round-trip safely.
 */
internal object MacAddress {

    /**
     * Returns [raw] in canonical Android form (`AA:BB:CC:DD:EE:FF`), or null when [raw] does not contain
     * exactly 12 hex characters. Accepts colon-, hyphen-, dot-, or space-separated inputs as well as
     * unseparated `AABBCCDDEEFF`, in any case.
     */
    fun canonicalize(raw: String?): String? {
        if (raw == null) return null
        val hex = raw.uppercase().filter { it in '0'..'9' || it in 'A'..'F' }
        if (hex.length != 12) return null
        return buildString(17) {
            for (i in 0 until 6) {
                if (i > 0) append(':')
                append(hex, i * 2, i * 2 + 2)
            }
        }
    }

    /**
     * Whether two MAC addresses refer to the same device, ignoring case and any separator differences
     * (`78:C1:1D:46:28:B4` ≡ `78-c1-1d-46-28-b4`). Returns false if either side cannot be canonicalized.
     */
    fun sameDevice(a: String?, b: String?): Boolean {
        val ca = canonicalize(a) ?: return false
        val cb = canonicalize(b) ?: return false
        return ca == cb
    }
}
