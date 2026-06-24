package com.bco.shared.platform

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.nio.file.Files
import java.nio.file.Path
import java.util.Properties
import java.util.concurrent.CopyOnWriteArrayList

class DesktopPreferencesProvider(
    private val file: Path = DesktopPaths.preferencesFile,
) : PreferencesProvider {
    private val lock = Any()
    private val properties = Properties()
    private val listeners = CopyOnWriteArrayList<(String) -> Unit>()

    private val _theme = MutableStateFlow(PreferencesProvider.THEME_DARK)
    private val _onboarding = MutableStateFlow(false)

    init {
        loadFromDisk()
        _theme.value = getString(Key.THEME_PREFERENCE, PreferencesProvider.THEME_DARK)
        _onboarding.value = getBoolean(Key.ONBOARDING_COMPLETE, false)
    }

    override val themePreferenceFlow: Flow<String> = _theme.asStateFlow()
    override val onboardingCompleteFlow: Flow<Boolean> = _onboarding.asStateFlow()

    override var themePreference: String
        get() = getString(Key.THEME_PREFERENCE, PreferencesProvider.THEME_DARK)
        set(value) = setValue(Key.THEME_PREFERENCE, value) {
            _theme.value = value
        }

    override var onboardingComplete: Boolean
        get() = getBoolean(Key.ONBOARDING_COMPLETE, false)
        set(value) = setValue(Key.ONBOARDING_COMPLETE, value.toString()) {
            _onboarding.value = value
        }

    override var targetBTAddress: String?
        get() = getNullableString(Key.TARGET_BT_ADDRESS)
        set(value) = setValue(Key.TARGET_BT_ADDRESS, value)

    override var targetBTName: String?
        get() = getNullableString(Key.TARGET_BT_NAME)
        set(value) = setValue(Key.TARGET_BT_NAME, value)

    override var lastSelectedAt: String?
        get() = getNullableString(Key.LAST_SELECTED_AT)
        set(value) = setValue(Key.LAST_SELECTED_AT, value)

    override var autoStart: Boolean
        get() = getBoolean(Key.AUTO_START, false)
        set(value) = setValue(Key.AUTO_START, value.toString())

    override var coreLogLevel: Int
        get() = getInt(
            key = Key.CORE_LOG_LEVEL,
            default = PreferencesProvider.CORE_LOG_LEVEL_INFO,
            min = PreferencesProvider.CORE_LOG_LEVEL_DEBUG,
            max = PreferencesProvider.CORE_LOG_LEVEL_ERROR,
        )
        set(value) = setValue(
            key = Key.CORE_LOG_LEVEL,
            value = value.coerceIn(
                PreferencesProvider.CORE_LOG_LEVEL_DEBUG,
                PreferencesProvider.CORE_LOG_LEVEL_ERROR,
            ).toString(),
        )

    override var baseBias: Int
        get() = getInt(Key.BASE_BIAS, 0)
        set(value) = setValue(Key.BASE_BIAS, value.toString())

    override var detailedNotifications: Boolean
        get() = getBoolean(Key.DETAILED_NOTIFICATIONS, true)
        set(value) = setValue(Key.DETAILED_NOTIFICATIONS, value.toString())

    override var peerEventSoundEnabled: Boolean
        get() = getBoolean(Key.PEER_EVENT_SOUND, true)
        set(value) = setValue(Key.PEER_EVENT_SOUND, value.toString())

    override var hasPromptedBatteryOptimizationExemption: Boolean
        get() = getBoolean(Key.BATTERY_OPT_PROMPTED, false)
        set(value) = setValue(Key.BATTERY_OPT_PROMPTED, value.toString())

    override var btUptimeDateKey: String?
        get() = getNullableString(Key.BT_UPTIME_DATE_KEY)
        set(value) = setValue(Key.BT_UPTIME_DATE_KEY, value)

    override var btUptimeAccumulatedMs: Long
        get() = getLong(Key.BT_UPTIME_ACCUMULATED_MS, 0L)
        set(value) = setValue(Key.BT_UPTIME_ACCUMULATED_MS, value.toString())

    override var btUptimeConnectStartedAt: Long?
        get() = getNullableString(Key.BT_UPTIME_CONNECT_STARTED_AT)?.toLongOrNull()
        set(value) = setValue(Key.BT_UPTIME_CONNECT_STARTED_AT, value?.toString())

    var localPaused: Boolean
        get() = getBoolean(Key.LOCAL_PAUSED, false)
        set(value) = setValue(Key.LOCAL_PAUSED, value.toString())

    fun addChangeListener(listener: (String) -> Unit) {
        listeners += listener
    }

    fun removeChangeListener(listener: (String) -> Unit) {
        listeners -= listener
    }

    override fun clearTargetDevice() {
        setValues(
            changedKeys = listOf(Key.TARGET_BT_ADDRESS, Key.TARGET_BT_NAME, Key.LAST_SELECTED_AT),
            mutate = {
                remove(Key.TARGET_BT_ADDRESS)
                remove(Key.TARGET_BT_NAME)
                remove(Key.LAST_SELECTED_AT)
            },
        )
    }

    private fun loadFromDisk() {
        synchronized(lock) {
            properties.clear()
            if (!Files.exists(file)) return
            try {
                Files.newInputStream(file).use(properties::load)
            } catch (error: Throwable) {
                throw IllegalStateException("Could not load desktop preferences from $file", error)
            }
        }
    }

    private fun getNullableString(key: String): String? = synchronized(lock) {
        properties.getProperty(key)?.takeIf { it.isNotEmpty() }
    }

    private fun getString(key: String, default: String): String = synchronized(lock) {
        properties.getProperty(key, default)
    }

    private fun getBoolean(key: String, default: Boolean): Boolean = synchronized(lock) {
        properties.getProperty(key)?.toBooleanStrictOrNull() ?: default
    }

    private fun getInt(key: String, default: Int, min: Int? = null, max: Int? = null): Int = synchronized(lock) {
        val parsed = properties.getProperty(key)?.toIntOrNull() ?: default
        when {
            min != null && max != null -> parsed.coerceIn(min, max)
            min != null -> maxOf(parsed, min)
            max != null -> minOf(parsed, max)
            else -> parsed
        }
    }

    private fun getLong(key: String, default: Long): Long = synchronized(lock) {
        properties.getProperty(key)?.toLongOrNull() ?: default
    }

    private fun setValue(key: String, value: String?, afterPersist: (() -> Unit)? = null) {
        setValues(
            changedKeys = listOf(key),
            mutate = {
                if (value == null) {
                    remove(key)
                } else {
                    setProperty(key, value)
                }
            },
            afterPersist = afterPersist,
        )
    }

    private fun setValues(
        changedKeys: List<String>,
        mutate: Properties.() -> Unit,
        afterPersist: (() -> Unit)? = null,
    ) {
        synchronized(lock) {
            val snapshot = Properties().apply { putAll(properties) }
            try {
                properties.mutate()
                persist()
            } catch (error: Throwable) {
                properties.clear()
                properties.putAll(snapshot)
                throw error
            }
            afterPersist?.invoke()
        }
        changedKeys.forEach { key ->
            listeners.forEach { listener -> listener(key) }
        }
    }

    private fun persist() {
        file.parent?.let(Files::createDirectories)
        val tempFile = file.resolveSibling("${file.fileName}.tmp")
        try {
            runCatching {
                Files.newOutputStream(tempFile).use { out ->
                    properties.store(out, "BCO desktop preferences")
                }
                Files.move(
                    tempFile,
                    file,
                    java.nio.file.StandardCopyOption.REPLACE_EXISTING,
                    java.nio.file.StandardCopyOption.ATOMIC_MOVE,
                )
            }.recoverCatching {
                Files.newOutputStream(file).use { out ->
                    properties.store(out, "BCO desktop preferences")
                }
            }.getOrElse { error ->
                throw IllegalStateException("Could not persist desktop preferences to $file", error)
            }
        } finally {
            runCatching {
                Files.deleteIfExists(tempFile)
            }
        }
    }

    private object Key {
        const val THEME_PREFERENCE: String = "theme_preference"
        const val TARGET_BT_ADDRESS: String = "bco.targetBTAddress"
        const val TARGET_BT_NAME: String = "bco.targetBTName"
        const val LAST_SELECTED_AT: String = "bco.lastSelectedAt"
        const val AUTO_START: String = "bco.autoStart"
        const val BATTERY_OPT_PROMPTED: String = "bco.batteryOptPrompted"
        const val ONBOARDING_COMPLETE: String = "bco.onboardingComplete"
        const val BT_UPTIME_DATE_KEY: String = "bco.btUptimeDateKey"
        const val BT_UPTIME_ACCUMULATED_MS: String = "bco.btUptimeAccumulatedMs"
        const val BT_UPTIME_CONNECT_STARTED_AT: String = "bco.btUptimeConnectStartedAt"
        const val DETAILED_NOTIFICATIONS: String = "bco.detailedNotifications"
        const val PEER_EVENT_SOUND: String = "bco.peerEventSound"
        const val CORE_LOG_LEVEL: String = "bco.coreLogLevel"
        const val BASE_BIAS: String = "bco.baseBias"
        const val LOCAL_PAUSED: String = "bco.localPaused"
    }
}
