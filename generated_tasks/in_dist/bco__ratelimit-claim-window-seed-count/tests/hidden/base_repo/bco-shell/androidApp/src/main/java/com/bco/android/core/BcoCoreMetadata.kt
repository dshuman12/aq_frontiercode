package com.bco.android.core

/** Build/version info from `libbconet` (no engine required). */
object BcoCoreMetadata {
    /**
     * Version string from [LibBCONet.BCOGetCoreVersion], or null if the native library is missing
     * or the call fails.
     */
    fun getCoreVersionOrNull(): String? = try {
        val lib = LibBCONet.INSTANCE
        val p = lib.BCOGetCoreVersion() ?: return null
        try {
            p.getString(0)
        } finally {
            lib.BCOFreeString(p)
        }
    } catch (_: UnsatisfiedLinkError) {
        null
    } catch (_: Throwable) {
        null
    }
}
