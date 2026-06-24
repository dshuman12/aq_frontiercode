import Foundation
import CoreAudio
import IOBluetooth
import BCODesktopHelperSupport

enum BluetoothAudioDevices {
    private static let audioServiceMask: UInt32 =
        (1 << 18) | // Rendering
        (1 << 19) | // Capturing
        (1 << 21) | // Audio
        (1 << 22)   // Telephony
    private static let connectedAddressCacheQueue =
        DispatchQueue(label: "bco.desktop.helper.bluetooth.connected-addresses")
    private static let connectedAddressCacheTtl: TimeInterval = 5
    private static var cachedConnectedAddresses: (timestamp: Date, addresses: Set<String>)?

    static func normalizedAddress(_ raw: String) -> String {
        BluetoothConnectionHeuristics.normalizedAddress(raw)
    }

    static func classOfDevice(_ device: IOBluetoothDevice) -> UInt32 {
        UInt32(bitPattern: Int32(device.classOfDevice))
    }

    static func majorClass(_ device: IOBluetoothDevice) -> Int {
        Int((classOfDevice(device) >> 8) & 0x1F)
    }

    static func isAudioClassDevice(_ device: IOBluetoothDevice) -> Bool {
        majorClass(device) == 4
    }

    static func hasAudioServiceClass(_ device: IOBluetoothDevice) -> Bool {
        (classOfDevice(device) & audioServiceMask) != 0
    }

    static func looksLikeAudioByName(_ device: IOBluetoothDevice) -> Bool {
        let name = (device.nameOrAddress ?? "").lowercased()
        return [
            "airpods",
            "bud",
            "buds",
            "earbud",
            "earbuds",
            "headphone",
            "headphones",
            "headset",
            "speaker",
            "earphone",
            "earphones",
            "beats",
        ].contains { keyword in
            name.contains(keyword)
        }
    }

    /// Active helper eligibility is intentionally broader than deprecated `bco-macos`.
    /// In addition to major-class Audio/Video, it accepts audio service classes and connected
    /// devices with headset-like names so devices with sparse class metadata can still be selected.
    static func isRelevantAudioDevice(_ device: IOBluetoothDevice) -> Bool {
        isRelevantAudioDevice(device, connectedAddresses: connectedAudioAddresses())
    }

    static func isRelevantAudioDevice(_ device: IOBluetoothDevice, connectedAddresses: Set<String>) -> Bool {
        if isAudioClassDevice(device) || hasAudioServiceClass(device) {
            return true
        }
        guard isConnected(device, connectedAddresses: connectedAddresses) else {
            return false
        }
        return looksLikeAudioByName(device)
    }

    static func connectedAudioAddresses(forceRefresh: Bool = false) -> Set<String> {
        connectedAddressCacheQueue.sync {
            if !forceRefresh,
               let cachedConnectedAddresses,
               Date().timeIntervalSince(cachedConnectedAddresses.timestamp) < connectedAddressCacheTtl {
                return cachedConnectedAddresses.addresses
            }

            let addresses = readConnectedAudioAddressesFromSystemProfiler()
            cachedConnectedAddresses = (timestamp: Date(), addresses: addresses)
            return addresses
        }
    }

    static func invalidateConnectedAddressCache() {
        connectedAddressCacheQueue.sync {
            cachedConnectedAddresses = nil
        }
    }

    static func isConnected(_ device: IOBluetoothDevice, connectedAddresses: Set<String>) -> Bool {
        if device.isConnected() {
            return true
        }
        guard let raw = device.addressString else {
            return false
        }
        return connectedAddresses.contains(normalizedAddress(raw))
    }

    static func isDefaultOutputBluetoothDevice(matchingAddress address: String, targetName: String?) -> Bool {
        let deviceID = defaultDeviceID(selector: kAudioHardwarePropertyDefaultOutputDevice)
        guard deviceID != kAudioObjectUnknown else { return false }

        let transport = transportType(of: deviceID)
        let isBluetoothTransport = transport == kAudioDeviceTransportTypeBluetooth ||
            transport == kAudioDeviceTransportTypeBluetoothLE
        guard isBluetoothTransport else { return false }

        let uid = deviceUID(of: deviceID)
        let name = deviceName(of: deviceID)
        return defaultOutputMatchesTarget(
            deviceUID: uid,
            deviceName: name,
            targetAddress: address,
            targetName: targetName
        )
    }

    static func defaultOutputMatchesTarget(
        deviceUID: String?,
        deviceName: String?,
        targetAddress address: String,
        targetName: String?
    ) -> Bool {
        BluetoothConnectionHeuristics.defaultOutputMatchesTarget(
            deviceUID: deviceUID,
            deviceName: deviceName,
            targetAddress: address,
            targetName: targetName
        )
    }

    static func isBluetoothPoweredOff() -> Bool {
        guard let powerState = IOBluetoothHostController.default()?.powerState else {
            return false
        }
        return powerState.rawValue == 0
    }

    static func pairedSorted(connectedAddresses: Set<String> = connectedAudioAddresses()) -> [IOBluetoothDevice] {
        guard let paired = IOBluetoothDevice.pairedDevices() as? [IOBluetoothDevice] else {
            return []
        }

        let sorted = paired
            .filter { isRelevantAudioDevice($0, connectedAddresses: connectedAddresses) }
            .sorted {
                let lhsConnected = isConnected($0, connectedAddresses: connectedAddresses)
                let rhsConnected = isConnected($1, connectedAddresses: connectedAddresses)
                if lhsConnected != rhsConnected {
                    return lhsConnected && !rhsConnected
                }
                let a = $0.nameOrAddress ?? ""
                let b = $1.nameOrAddress ?? ""
                return a.localizedCaseInsensitiveCompare(b) == .orderedAscending
            }

        var seen = Set<String>()
        var unique: [IOBluetoothDevice] = []
        unique.reserveCapacity(sorted.count)
        for device in sorted {
            guard let raw = device.addressString else { continue }
            let normalized = normalizedAddress(raw)
            guard !normalized.isEmpty, seen.insert(normalized).inserted else { continue }
            unique.append(device)
        }
        return unique
    }

    static func isPairedAudioAddress(_ address: String) -> Bool {
        let want = normalizedAddress(address)
        return pairedSorted().contains { device in
            guard let raw = device.addressString else { return false }
            return normalizedAddress(raw) == want
        }
    }

    private static func readConnectedAudioAddressesFromSystemProfiler() -> Set<String> {
        guard let output = systemProfilerOutput() else {
            return []
        }

        var connectedAddresses = Set<String>()
        var inConnectedSection = false
        for rawLine in output.split(separator: "\n", omittingEmptySubsequences: false) {
            let line = rawLine.trimmingCharacters(in: .whitespacesAndNewlines)
            switch line {
            case "Connected:":
                inConnectedSection = true
            case "Not Connected:":
                inConnectedSection = false
            default:
                guard inConnectedSection, line.hasPrefix("Address:") else { continue }
                let address = line
                    .replacingOccurrences(of: "Address:", with: "")
                    .trimmingCharacters(in: .whitespacesAndNewlines)
                let normalized = normalizedAddress(address)
                if !normalized.isEmpty {
                    connectedAddresses.insert(normalized)
                }
            }
        }
        return connectedAddresses
    }

    private static func systemProfilerOutput() -> String? {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/sbin/system_profiler")
        process.arguments = ["SPBluetoothDataType"]

        let outputPipe = Pipe()
        process.standardOutput = outputPipe
        process.standardError = Pipe()

        do {
            try process.run()
        } catch {
            return nil
        }

        let data = outputPipe.fileHandleForReading.readDataToEndOfFile()
        process.waitUntilExit()
        guard process.terminationStatus == 0 else {
            return nil
        }
        return String(data: data, encoding: .utf8)
    }

    private static func transportType(of deviceID: AudioObjectID) -> UInt32 {
        var address = AudioObjectPropertyAddress(
            mSelector: kAudioDevicePropertyTransportType,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        var transport: UInt32 = 0
        var size = UInt32(MemoryLayout<UInt32>.size)
        let err = AudioObjectGetPropertyData(deviceID, &address, 0, nil, &size, &transport)
        return err == noErr ? transport : 0
    }

    private static func deviceUID(of deviceID: AudioObjectID) -> String? {
        var address = AudioObjectPropertyAddress(
            mSelector: kAudioDevicePropertyDeviceUID,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        var uid: Unmanaged<CFString>?
        var size = UInt32(MemoryLayout<Unmanaged<CFString>?>.size)
        let err = AudioObjectGetPropertyData(deviceID, &address, 0, nil, &size, &uid)
        guard err == noErr, let raw = uid else { return nil }
        return raw.takeUnretainedValue() as String
    }

    private static func deviceName(of deviceID: AudioObjectID) -> String? {
        var address = AudioObjectPropertyAddress(
            mSelector: kAudioObjectPropertyName,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        var name: Unmanaged<CFString>?
        var size = UInt32(MemoryLayout<Unmanaged<CFString>?>.size)
        let err = AudioObjectGetPropertyData(deviceID, &address, 0, nil, &size, &name)
        guard err == noErr, let raw = name else { return nil }
        return raw.takeUnretainedValue() as String
    }

    private static func defaultDeviceID(selector: AudioObjectPropertySelector) -> AudioObjectID {
        var address = AudioObjectPropertyAddress(
            mSelector: selector,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        var deviceID = AudioObjectID()
        var size = UInt32(MemoryLayout<AudioObjectID>.size)
        let systemObject = AudioObjectID(kAudioObjectSystemObject)
        let err = AudioObjectGetPropertyData(systemObject, &address, 0, nil, &size, &deviceID)
        guard err == noErr else { return kAudioObjectUnknown }
        return deviceID
    }

}

final class TargetBluetoothController {
    private let queue = DispatchQueue(label: "bco.desktop.helper.bluetooth", qos: .userInitiated)
    private let queueKey = DispatchSpecificKey<Void>()
    private let notificationSink = BTACLNotificationSink()
    private let onStateChanged: () -> Void

    private var connectNotification: IOBluetoothUserNotification?
    private var disconnectNotification: IOBluetoothUserNotification?
    private var targetAddress: String?
    private var targetName: String?

    init(onStateChanged: @escaping () -> Void) {
        self.onStateChanged = onStateChanged
        queue.setSpecific(key: queueKey, value: ())
        notificationSink.owner = self

        syncOnQueue {
            connectNotification = IOBluetoothDevice.register(
                forConnectNotifications: notificationSink,
                selector: #selector(BTACLNotificationSink.connected(_:fromDevice:))
            )
            resyncDisconnectRegistrationLocked()
        }
    }

    deinit {
        syncOnQueue {
            disconnectNotification?.unregister()
            disconnectNotification = nil
            connectNotification?.unregister()
            connectNotification = nil
        }
        notificationSink.owner = nil
    }

    func setTarget(address: String?, name: String?) {
        asyncOnQueue { [weak self] in
            guard let self else { return }
            self.targetAddress = address?.trimmingCharacters(in: .whitespacesAndNewlines)
            self.targetName = name?.trimmingCharacters(in: .whitespacesAndNewlines)
            self.resyncDisconnectRegistrationLocked()
            self.notifyStateChanged()
        }
    }

    func adapterName() -> String? {
        let name = Host.current().localizedName?.trimmingCharacters(in: .whitespacesAndNewlines)
        if let name, !name.isEmpty {
            return name
        }
        return nil
    }

    func listAudioDevices() -> [[String: Any]] {
        syncOnQueue {
            let connectedAddresses = BluetoothAudioDevices.connectedAudioAddresses()
            return BluetoothAudioDevices.pairedSorted(connectedAddresses: connectedAddresses).compactMap { device in
                guard let address = device.addressString else { return nil }
                let name = (device.nameOrAddress ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
                return [
                    "name": name,
                    "address": address,
                    "majorClass": BluetoothAudioDevices.majorClass(device),
                    "isConnected": BluetoothAudioDevices.isConnected(device, connectedAddresses: connectedAddresses),
                    "isLeOnly": false,
                    "iconKind": iconKind(for: device),
                ]
            }
        }
    }

    func isTargetConnected() -> Bool {
        syncOnQueue {
            isTargetConnectedLocked()
        }
    }

    func connect(address: String) -> [String: Any] {
        let result = syncOnQueue {
            let trimmed = address.trimmingCharacters(in: .whitespacesAndNewlines)
            guard BluetoothAudioDevices.isPairedAudioAddress(trimmed) else {
                return operationResult(code: "not_paired", message: "The selected headset is not paired with this Mac.")
            }
            guard let device = IOBluetoothDevice(addressString: trimmed) else {
                return operationResult(code: "not_paired", message: "The selected headset is not paired with this Mac.")
            }
            let connectedAddresses = BluetoothAudioDevices.connectedAudioAddresses(forceRefresh: true)
            if BluetoothAudioDevices.isConnected(device, connectedAddresses: connectedAddresses) {
                BluetoothConnectionShadow.shared.believeConnected(address: trimmed)
                return operationResult(code: "already_connected", message: "The headset is already connected.")
            }
            let status = device.openConnection()
            BluetoothAudioDevices.invalidateConnectedAddressCache()
            resyncDisconnectRegistrationLocked()
            scheduleDelayedStateRefreshLocked()
            if status == kIOReturnSuccess {
                BluetoothConnectionShadow.shared.believeConnected(address: trimmed)
                return operationResult(code: "success", message: "Connected")
            }
            BluetoothConnectionShadow.shared.clearIfMatches(address: trimmed)
            return operationResult(code: "connect_failed", message: "Bluetooth connect failed (IOReturn \(status)).")
        }
        notifyStateChanged()
        return result
    }

    func disconnect(address: String) -> [String: Any] {
        let result = syncOnQueue {
            let trimmed = address.trimmingCharacters(in: .whitespacesAndNewlines)
            guard let device = IOBluetoothDevice(addressString: trimmed) else {
                return operationResult(code: "not_paired", message: "The selected headset is not paired with this Mac.")
            }
            let connectedAddresses = BluetoothAudioDevices.connectedAudioAddresses(forceRefresh: true)
            if !BluetoothAudioDevices.isConnected(device, connectedAddresses: connectedAddresses) {
                BluetoothConnectionShadow.shared.clearIfMatches(address: trimmed)
                return operationResult(code: "not_connected", message: "The headset is not connected.")
            }
            let status = device.closeConnection()
            BluetoothConnectionShadow.shared.clearIfMatches(address: trimmed)
            BluetoothAudioDevices.invalidateConnectedAddressCache()
            resyncDisconnectRegistrationLocked()
            scheduleDelayedStateRefreshLocked()
            if status == kIOReturnSuccess {
                return operationResult(code: "success", message: "Disconnected")
            }
            return operationResult(code: "disconnect_failed", message: "Bluetooth disconnect finished with IOReturn \(status).")
        }
        notifyStateChanged()
        return result
    }

    func testConnection(address: String) -> [String: Any] {
        let result = syncOnQueue {
            let trimmed = address.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty else {
                return operationResult(code: "not_paired", message: "Select a headset before running the test.")
            }
            guard BluetoothAudioDevices.isPairedAudioAddress(trimmed) else {
                return operationResult(code: "not_paired", message: "The selected headset is not paired with this Mac.")
            }
            guard let device = IOBluetoothDevice(addressString: trimmed) else {
                return operationResult(code: "not_paired", message: "The selected headset is not paired with this Mac.")
            }
            guard BluetoothAudioDevices.isRelevantAudioDevice(device) else {
                return operationResult(code: "not_audio", message: "The selected Bluetooth device is not an audio headset.")
            }
            let connectedAddresses = BluetoothAudioDevices.connectedAudioAddresses(forceRefresh: true)
            if BluetoothAudioDevices.isConnected(device, connectedAddresses: connectedAddresses) {
                BluetoothConnectionShadow.shared.believeConnected(address: trimmed)
                return operationResult(code: "already_connected", message: "The headset is already connected.")
            }

            let status = device.openConnection()
            BluetoothAudioDevices.invalidateConnectedAddressCache()
            resyncDisconnectRegistrationLocked()
            scheduleDelayedStateRefreshLocked()
            if status == kIOReturnSuccess {
                BluetoothConnectionShadow.shared.believeConnected(address: trimmed)
                return operationResult(code: "connected", message: "Connected")
            }
            BluetoothConnectionShadow.shared.clearIfMatches(address: trimmed)
            return operationResult(code: "connect_failed", message: "Bluetooth test connect failed (IOReturn \(status)).")
        }
        notifyStateChanged()
        return result
    }

    fileprivate func handleExternalACLChange(device: IOBluetoothDevice) {
        asyncOnQueue { [weak self] in
            guard let self else { return }
            guard let targetAddress, let raw = device.addressString else { return }
            guard BluetoothAudioDevices.normalizedAddress(raw) == BluetoothAudioDevices.normalizedAddress(targetAddress) else {
                return
            }
            BluetoothAudioDevices.invalidateConnectedAddressCache()
            if device.isConnected() {
                BluetoothConnectionShadow.shared.refreshIfActive(address: raw)
            } else {
                BluetoothConnectionShadow.shared.clearIfMatches(address: raw)
            }
            self.resyncDisconnectRegistrationLocked()
            self.notifyStateChanged()
        }
    }

    private func isTargetConnectedLocked() -> Bool {
        guard let targetAddress else {
            return false
        }
        if BluetoothAudioDevices.isBluetoothPoweredOff() {
            BluetoothConnectionShadow.shared.clear()
            return false
        }
        if BluetoothAudioDevices.isDefaultOutputBluetoothDevice(
            matchingAddress: targetAddress,
            targetName: targetName,
        ) {
            BluetoothConnectionShadow.shared.refreshIfActive(address: targetAddress)
            return true
        }
        guard let device = IOBluetoothDevice(addressString: targetAddress) else {
            return BluetoothConnectionShadow.shared.isBelievedConnected(address: targetAddress)
        }
        let connected = BluetoothAudioDevices.isConnected(
            device,
            connectedAddresses: BluetoothAudioDevices.connectedAudioAddresses(),
        )
        if connected {
            BluetoothConnectionShadow.shared.refreshIfActive(address: targetAddress)
            return true
        }
        return BluetoothConnectionShadow.shared.isBelievedConnected(address: targetAddress)
    }

    private func resyncDisconnectRegistrationLocked() {
        disconnectNotification?.unregister()
        disconnectNotification = nil
        guard let targetAddress,
              let device = IOBluetoothDevice(addressString: targetAddress),
              BluetoothAudioDevices.isConnected(
                  device,
                  connectedAddresses: BluetoothAudioDevices.connectedAudioAddresses(),
              )
        else {
            return
        }
        disconnectNotification = device.register(
            forDisconnectNotification: notificationSink,
            selector: #selector(BTACLNotificationSink.disconnected(_:fromDevice:))
        )
    }

    private func scheduleDelayedStateRefreshLocked() {
        queue.asyncAfter(deadline: .now() + 1.0) { [weak self] in
            BluetoothAudioDevices.invalidateConnectedAddressCache()
            self?.notifyStateChanged()
        }
    }

    private func iconKind(for device: IOBluetoothDevice) -> String {
        let name = (device.nameOrAddress ?? "").lowercased()
        if name.contains("car") {
            return "CarAudio"
        }
        if name.contains("speaker") {
            return "PortableSpeaker"
        }
        return "Headphones"
    }

    private func operationResult(code: String, message: String) -> [String: Any] {
        [
            "code": code,
            "message": message,
        ]
    }

    private func notifyStateChanged() {
        DispatchQueue.main.async { [onStateChanged] in
            onStateChanged()
        }
    }

    private func syncOnQueue<T>(_ block: () -> T) -> T {
        if DispatchQueue.getSpecific(key: queueKey) != nil {
            return block()
        }
        return queue.sync(execute: block)
    }

    private func asyncOnQueue(_ block: @escaping () -> Void) {
        if DispatchQueue.getSpecific(key: queueKey) != nil {
            block()
            return
        }
        queue.async(execute: block)
    }
}

private final class BTACLNotificationSink: NSObject {
    weak var owner: TargetBluetoothController?

    @objc func connected(_ notification: IOBluetoothUserNotification, fromDevice device: IOBluetoothDevice) {
        owner?.handleExternalACLChange(device: device)
    }

    @objc func disconnected(_ notification: IOBluetoothUserNotification, fromDevice device: IOBluetoothDevice) {
        owner?.handleExternalACLChange(device: device)
    }
}
