package com.bco.android

import android.app.Application
import android.util.Log

/**
 * Application entry point. Loads native `bconet` in [onCreate] before any JNA `Native.load`
 * elsewhere so the `.so` symbols resolve correctly.
 */
class BCOApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        isNativeLibraryLoaded = try {
            System.loadLibrary("bconet")
            true
        } catch (e: UnsatisfiedLinkError) {
            Log.e(TAG, "libbconet not loaded (missing jniLibs .so?)", e)
            false
        }
    }

    companion object {
        private const val TAG = "BCOApplication"

        @JvmStatic
        var isNativeLibraryLoaded: Boolean = false
    }
}
