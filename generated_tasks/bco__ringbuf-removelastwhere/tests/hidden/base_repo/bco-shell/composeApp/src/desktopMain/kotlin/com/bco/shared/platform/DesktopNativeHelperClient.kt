package com.bco.shared.platform

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.encodeToJsonElement
import java.io.BufferedReader
import java.io.BufferedWriter
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

class DesktopNativeHelperClient : AutoCloseable {
    private data class PendingRequest(
        val generation: Long,
        val deferred: CompletableDeferred<HelperEnvelope>,
    )

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
    }

    private val pending = ConcurrentHashMap<String, PendingRequest>()
    private val processLock = Any()

    private val _audioState = MutableStateFlow(HelperAudioState(priority = 0, hasBluetooth = false))
    internal val audioState: StateFlow<HelperAudioState> = _audioState.asStateFlow()

    private val _networkRefreshEvents = MutableSharedFlow<Unit>(extraBufferCapacity = 8)
    internal val networkRefreshEvents: SharedFlow<Unit> = _networkRefreshEvents.asSharedFlow()

    @Volatile
    private var process: Process? = null

    @Volatile
    private var writer: BufferedWriter? = null

    @Volatile
    private var readerJob: Job? = null

    @Volatile
    private var restartJob: Job? = null

    @Volatile
    private var processGeneration: Long = 0L

    @Volatile
    private var closed = false

    internal fun isSupported(): Boolean =
        System.getProperty("os.name").contains("Mac", ignoreCase = true)

    internal fun start(): Boolean {
        if (!isSupported()) {
            log("start(): not macOS, skipping helper")
            return false
        }
        val gen = ensureProcessRunning()
        if (gen != null) {
            log("start(): helper process launched (generation=$gen)")
        } else {
            log("start(): failed to launch helper process")
        }
        return gen != null
    }

    internal suspend fun listAudioDevices(): List<BluetoothDeviceInfo> {
        val response = sendRequest(type = "listDevices") ?: return emptyList()
        val devices = decodePayload(response, ListSerializer(HelperBluetoothDevice.serializer())) ?: return emptyList()
        return devices.map { device ->
            BluetoothDeviceInfo(
                name = device.name,
                address = device.address,
                majorClass = device.majorClass,
                isConnected = device.isConnected,
                isLeOnly = device.isLeOnly,
                headsetIconKind = when (device.iconKind) {
                    "CarAudio" -> BluetoothHeadsetIconKind.CarAudio
                    "PortableSpeaker" -> BluetoothHeadsetIconKind.PortableSpeaker
                    else -> BluetoothHeadsetIconKind.Headphones
                },
            )
        }
    }

    internal suspend fun getAdapterDisplayNameOrNull(): String? {
        val response = sendRequest(type = "adapterName") ?: return null
        return decodePayload(response, HelperStringValue.serializer())?.value
    }

    internal suspend fun setTargetDevice(address: String?, name: String?) {
        sendRequest(
            type = "setTargetDevice",
            payload = json.encodeToJsonElement(HelperTargetDevice.serializer(), HelperTargetDevice(address, name)),
        )
    }

    internal suspend fun connect(address: String): HelperOperationResult {
        return sendOperation("connect", address)
    }

    internal suspend fun disconnect(address: String): HelperOperationResult {
        return sendOperation("disconnect", address)
    }

    internal suspend fun testConnection(address: String): HelperOperationResult {
        return sendOperation("testConnection", address)
    }

    private suspend fun sendOperation(type: String, address: String): HelperOperationResult {
        val response = sendRequest(
            type = type,
            payload = json.encodeToJsonElement(HelperStringValue.serializer(), HelperStringValue(address)),
        ) ?: return HelperOperationResult(code = "helper_unavailable", message = "Native helper unavailable")

        return decodePayload(response, HelperOperationResult.serializer())
            ?: HelperOperationResult(
                code = if (response.success == true) "ok" else "helper_error",
                message = response.error,
            )
    }

    private suspend fun sendRequest(type: String, payload: JsonElement? = null): HelperEnvelope? {
        val generation = ensureProcessRunning() ?: return null

        val id = UUID.randomUUID().toString()
        val deferred = CompletableDeferred<HelperEnvelope>()
        val pendingRequest = PendingRequest(generation = generation, deferred = deferred)
        pending[id] = pendingRequest

        val request = HelperEnvelope(
            kind = "request",
            type = type,
            id = id,
            payload = payload,
        )
        val encoded = json.encodeToString(HelperEnvelope.serializer(), request)

        val currentWriter = synchronized(processLock) {
            val activeProcess = process
            if (activeProcess == null || !activeProcess.isAlive || processGeneration != generation) {
                null
            } else {
                writer
            }
        } ?: run {
            pending.remove(id, pendingRequest)
            return null
        }

        return try {
            synchronized(currentWriter) {
                currentWriter.write(encoded)
                currentWriter.newLine()
                currentWriter.flush()
            }
            withTimeout(10_000) { deferred.await() }
        } catch (error: Throwable) {
            pending.remove(id, pendingRequest)
            if (error is CancellationException && error !is TimeoutCancellationException) throw error
            null
        }
    }

    private fun ensureProcessRunning(): Long? {
        synchronized(processLock) {
            if (closed) return null

            val existing = process
            if (existing != null && existing.isAlive) {
                return processGeneration
            }

            val assets = try {
                DesktopNativeAssets.ensureExtracted()
            } catch (e: Exception) {
                log("ensureProcessRunning: asset extraction failed: ${e.message}")
                return null
            }
            val helperPath = assets.helperPath
            if (helperPath == null) {
                log("ensureProcessRunning: helper binary not found in resources")
                return null
            }

            val launched = try {
                ProcessBuilder(helperPath.toString())
                    .redirectError(ProcessBuilder.Redirect.INHERIT)
                    .start()
            } catch (e: Exception) {
                log("ensureProcessRunning: failed to start helper: ${e.message}")
                return null
            }

            val nextGeneration = processGeneration + 1L
            log("ensureProcessRunning: helper pid=${launched.pid()} generation=$nextGeneration path=$helperPath")
            process = launched
            writer = BufferedWriter(OutputStreamWriter(launched.outputStream))
            readerJob?.cancel()
            readerJob = scope.launch {
                readLoop(launched, nextGeneration)
            }
            processGeneration = nextGeneration
            return nextGeneration
        }
    }

    private suspend fun readLoop(activeProcess: Process, generation: Long) {
        var linesRead = 0L
        try {
            BufferedReader(InputStreamReader(activeProcess.inputStream)).use { reader ->
                while (true) {
                    val line = reader.readLine() ?: break
                    linesRead++
                    if (line.isBlank()) continue
                    val envelope = runCatching {
                        json.decodeFromString(HelperEnvelope.serializer(), line)
                    }.getOrNull() ?: continue

                    when (envelope.kind) {
                        "response" -> {
                            val id = envelope.id ?: continue
                            pending.remove(id)?.takeIf { it.generation == generation }?.deferred?.complete(envelope)
                        }

                        "event" -> handleEvent(envelope)
                    }
                }
            }
        } finally {
            val exitCode = runCatching { activeProcess.waitFor() }.getOrNull()
            log("readLoop: helper exited (generation=$generation exitCode=$exitCode linesRead=$linesRead)")

            synchronized(processLock) {
                if (process === activeProcess) {
                    process = null
                    writer = null
                }
            }
            failPendingRequests(
                generation = generation,
                errorMessage = "Native helper exited",
            )
            scheduleRestart()
        }
    }

    private fun scheduleRestart() {
        if (closed) return
        restartJob?.cancel()
        restartJob = scope.launch {
            delay(RESTART_DELAY_MS)
            if (closed) return@launch
            val gen = ensureProcessRunning()
            if (gen != null) {
                log("scheduleRestart: helper restarted (generation=$gen)")
            } else {
                log("scheduleRestart: failed to restart helper")
            }
        }
    }

    private suspend fun handleEvent(envelope: HelperEnvelope) {
        when (envelope.type) {
            "audioState" -> {
                val state = decodePayload(envelope, HelperAudioState.serializer()) ?: return
                val prev = _audioState.value
                _audioState.value = state
                if (prev.priority != state.priority || prev.hasBluetooth != state.hasBluetooth) {
                    log("audioState changed: priority=${prev.priority}->${state.priority} hasBT=${prev.hasBluetooth}->${state.hasBluetooth}")
                }
            }

            "networkRefresh" -> {
                _networkRefreshEvents.emit(Unit)
            }
        }
    }

    private fun <T> decodePayload(
        envelope: HelperEnvelope,
        serializer: kotlinx.serialization.KSerializer<T>,
    ): T? {
        val payload = envelope.payload ?: return null
        return runCatching { json.decodeFromJsonElement(serializer, payload) }.getOrNull()
    }

    override fun close() {
        log("close(): shutting down helper client")
        closed = true
        restartJob?.cancel()
        restartJob = null
        val readerToCancel: Job?
        synchronized(processLock) {
            readerToCancel = readerJob
            readerJob = null
            runCatching { writer?.close() }
            writer = null
            process?.destroy()
            process = null
        }
        readerToCancel?.cancel()
        failPendingRequests(
            generation = null,
            errorMessage = "Native helper closed",
        )
        scope.cancel()
    }

    private fun failPendingRequests(generation: Long?, errorMessage: String) {
        pending.forEach { (id, request) ->
            if (generation == null || request.generation == generation) {
                if (pending.remove(id, request)) {
                    request.deferred.complete(
                        HelperEnvelope(
                            kind = "response",
                            type = "process_exit",
                            success = false,
                            error = errorMessage,
                        ),
                    )
                }
            }
        }
    }

    companion object {
        private const val RESTART_DELAY_MS = 2_000L

        private fun log(msg: String) {
            System.err.println("[HelperClient] $msg")
        }
    }
}
