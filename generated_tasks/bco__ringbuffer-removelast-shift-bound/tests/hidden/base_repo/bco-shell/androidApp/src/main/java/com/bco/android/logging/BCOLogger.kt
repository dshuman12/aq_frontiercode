package com.bco.android.logging

import android.util.Log

/**
 * Shell logging with tags `BCO.<Subsystem>` per Android shell plan / constitution (Observable Behavior).
 */
object BCOLogger {

    fun v(subsystem: String, message: String, throwable: Throwable? = null) {
        Log.v(tag(subsystem), message, throwable)
    }

    fun d(subsystem: String, message: String, throwable: Throwable? = null) {
        Log.d(tag(subsystem), message, throwable)
    }

    fun i(subsystem: String, message: String, throwable: Throwable? = null) {
        Log.i(tag(subsystem), message, throwable)
    }

    fun w(subsystem: String, message: String, throwable: Throwable? = null) {
        Log.w(tag(subsystem), message, throwable)
    }

    fun e(subsystem: String, message: String, throwable: Throwable? = null) {
        Log.e(tag(subsystem), message, throwable)
    }

    private fun tag(subsystem: String): String = "BCO.$subsystem"
}
