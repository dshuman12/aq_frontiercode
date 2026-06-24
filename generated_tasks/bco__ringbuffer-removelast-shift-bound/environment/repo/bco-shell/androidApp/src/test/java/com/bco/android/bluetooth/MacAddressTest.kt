package com.bco.android.bluetooth

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class MacAddressTest {

    @Test
    fun canonicalize_passesThroughCanonicalAndroidForm() {
        assertEquals("78:C1:1D:46:28:B4", MacAddress.canonicalize("78:C1:1D:46:28:B4"))
    }

    @Test
    fun canonicalize_acceptsHyphenLowercaseFromMacOSIOBluetooth() {
        assertEquals("78:C1:1D:46:28:B4", MacAddress.canonicalize("78-c1-1d-46-28-b4"))
    }

    @Test
    fun canonicalize_acceptsMixedCaseAndUnseparatedHex() {
        assertEquals("78:C1:1D:46:28:B4", MacAddress.canonicalize("78C11d4628b4"))
        assertEquals("78:C1:1D:46:28:B4", MacAddress.canonicalize(" 78 c1 1d 46 28 b4 "))
        assertEquals("78:C1:1D:46:28:B4", MacAddress.canonicalize("78.c1.1d.46.28.b4"))
    }

    @Test
    fun canonicalize_returnsNullForNonHexOrWrongLength() {
        assertNull(MacAddress.canonicalize(null))
        assertNull(MacAddress.canonicalize(""))
        assertNull(MacAddress.canonicalize("not-a-mac"))
        assertNull(MacAddress.canonicalize("78:C1:1D:46:28"))
        assertNull(MacAddress.canonicalize("78:C1:1D:46:28:B4:00"))
    }

    @Test
    fun sameDevice_isFormatAndCaseInsensitive() {
        assertTrue(MacAddress.sameDevice("78:C1:1D:46:28:B4", "78-c1-1d-46-28-b4"))
        assertTrue(MacAddress.sameDevice("78c11d4628b4", "78:C1:1D:46:28:B4"))
        assertFalse(MacAddress.sameDevice("78:C1:1D:46:28:B4", "78:C1:1D:46:28:B5"))
        assertFalse(MacAddress.sameDevice(null, "78:C1:1D:46:28:B4"))
        assertFalse(MacAddress.sameDevice("78:C1:1D:46:28:B4", "garbage"))
    }
}
