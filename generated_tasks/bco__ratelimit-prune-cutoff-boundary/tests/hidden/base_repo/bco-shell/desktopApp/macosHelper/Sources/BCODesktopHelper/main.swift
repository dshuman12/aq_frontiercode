import Darwin
import Foundation

final class JsonLineWriter {
    private let lock = NSLock()

    func send(_ object: [String: Any]) {
        guard JSONSerialization.isValidJSONObject(object) else {
            HelperLogger.log("Tried to write invalid JSON object: \(object)")
            return
        }
        do {
            let data = try JSONSerialization.data(withJSONObject: object)
            lock.lock()
            defer { lock.unlock() }
            FileHandle.standardOutput.write(data)
            FileHandle.standardOutput.write(Data([0x0A]))
        } catch {
            HelperLogger.log("Failed to encode JSON line: \(error)")
        }
    }
}

final class HelperRuntime {
    private let writer = JsonLineWriter()
    private let stateLock = NSLock()
    private let callbackSink: RuntimeCallbackSink
    private let bluetoothController: TargetBluetoothController
    private let audioMonitor: AudioMonitor
    private let networkMonitor: NetworkMonitor

    private var lastPriority: Int?
    private var lastHasBluetooth: Bool?
    private var running = false

    init() {
        let callbackSink = RuntimeCallbackSink()
        self.callbackSink = callbackSink
        self.bluetoothController = TargetBluetoothController { [callbackSink] in
            callbackSink.emitAudioState(force: true)
        }
        self.audioMonitor = AudioMonitor { [callbackSink] force in
            callbackSink.emitAudioState(force: force)
        }
        self.networkMonitor = NetworkMonitor { [callbackSink] in
            callbackSink.emitEvent(type: "networkRefresh")
        }
        callbackSink.owner = self
    }

    func start() {
        stateLock.lock()
        if running {
            stateLock.unlock()
            return
        }
        running = true
        lastPriority = nil
        lastHasBluetooth = nil
        stateLock.unlock()
        audioMonitor.start()
        networkMonitor.start()
        emitAudioStateIfNeeded(force: true)
    }

    func stop() {
        stateLock.lock()
        let wasRunning = running
        running = false
        stateLock.unlock()
        guard wasRunning else { return }
        audioMonitor.stop()
        networkMonitor.stop()
    }

    func handle(request: [String: Any]) {
        guard let type = request["type"] as? String else { return }
        let requestID = request["id"] as? String ?? UUID().uuidString
        let payload = request["payload"]

        switch type {
        case "listDevices":
            emitResponse(id: requestID, type: type, success: true, payload: bluetoothController.listAudioDevices())

        case "adapterName":
            let adapterName = bluetoothController.adapterName()
            emitResponse(
                id: requestID,
                type: type,
                success: true,
                payload: [
                    "value": adapterName ?? NSNull(),
                ] as [String: Any]
            )

        case "setTargetDevice":
            let payloadDict = payload as? [String: Any]
            let address = stringValue(payloadDict?["address"])
            let name = stringValue(payloadDict?["name"])
            bluetoothController.setTarget(address: address, name: name)
            emitAudioStateIfNeeded(force: true)
            emitResponse(id: requestID, type: type, success: true)

        case "connect":
            let result = bluetoothController.connect(address: stringValue((payload as? [String: Any])?["value"]) ?? "")
            emitAudioStateIfNeeded(force: true)
            emitResponse(id: requestID, type: type, success: true, payload: result)

        case "disconnect":
            let result = bluetoothController.disconnect(address: stringValue((payload as? [String: Any])?["value"]) ?? "")
            emitAudioStateIfNeeded(force: true)
            emitResponse(id: requestID, type: type, success: true, payload: result)

        case "testConnection":
            let result = bluetoothController.testConnection(address: stringValue((payload as? [String: Any])?["value"]) ?? "")
            emitAudioStateIfNeeded(force: true)
            emitResponse(id: requestID, type: type, success: true, payload: result)

        default:
            emitResponse(id: requestID, type: type, success: false, error: "Unknown request: \(type)")
        }
    }

    fileprivate func emitAudioStateIfNeeded(force: Bool) {
        let priority = audioMonitor.currentPriority()
        let hasBluetooth = bluetoothController.isTargetConnected()
        stateLock.lock()
        defer { stateLock.unlock() }
        guard running else { return }
        if !force, priority == lastPriority, hasBluetooth == lastHasBluetooth {
            return
        }
        lastPriority = priority
        lastHasBluetooth = hasBluetooth
        HelperLogger.log(
            "emitAudioStateIfNeeded force=\(force) priority=\(priority) hasBluetooth=\(hasBluetooth)"
        )
        emitEvent(
            type: "audioState",
            payload: [
                "priority": priority,
                "hasBluetooth": hasBluetooth,
            ]
        )
    }

    fileprivate func emitEvent(type: String, payload: Any? = nil) {
        var object: [String: Any] = [
            "kind": "event",
            "type": type,
        ]
        if let payload {
            object["payload"] = payload
        }
        writer.send(object)
    }

    private func emitResponse(
        id: String,
        type: String,
        success: Bool,
        payload: Any? = nil,
        error: String? = nil
    ) {
        var object: [String: Any] = [
            "kind": "response",
            "type": type,
            "id": id,
            "success": success,
        ]
        if let payload {
            object["payload"] = payload
        }
        if let error {
            object["error"] = error
        }
        writer.send(object)
    }

    private func stringValue(_ raw: Any?) -> String? {
        if raw is NSNull { return nil }
        return raw as? String
    }
}

signal(SIGPIPE, SIG_IGN)

let runtime = HelperRuntime()
runtime.start()

let stdinHandle = FileHandle.standardInput
let lineDelimiter = Data([0x0A])
var stdinBuffer = Data()

func processBufferedInputLine(_ data: Data) {
    guard let line = String(data: data, encoding: .utf8)?
        .trimmingCharacters(in: .whitespacesAndNewlines),
        !line.isEmpty
    else {
        return
    }
    guard let requestData = line.data(using: .utf8) else { return }
    do {
        guard let request = try JSONSerialization.jsonObject(with: requestData) as? [String: Any] else {
            return
        }
        runtime.handle(request: request)
    } catch {
        HelperLogger.log("Failed to decode request: \(error)")
    }
}

stdinHandle.readabilityHandler = { handle in
    let chunk = handle.availableData
    if chunk.isEmpty {
        if !stdinBuffer.isEmpty {
            processBufferedInputLine(stdinBuffer)
            stdinBuffer.removeAll(keepingCapacity: false)
        }
        handle.readabilityHandler = nil
        runtime.stop()
        exit(0)
    }

    stdinBuffer.append(chunk)
    while let range = stdinBuffer.range(of: lineDelimiter) {
        let lineData = stdinBuffer.subdata(in: stdinBuffer.startIndex..<range.lowerBound)
        stdinBuffer.removeSubrange(stdinBuffer.startIndex..<range.upperBound)
        processBufferedInputLine(lineData)
    }
}

RunLoop.main.run()

private final class RuntimeCallbackSink {
    weak var owner: HelperRuntime?

    func emitAudioState(force: Bool) {
        owner?.emitAudioStateIfNeeded(force: force)
    }

    func emitEvent(type: String) {
        owner?.emitEvent(type: type)
    }
}
