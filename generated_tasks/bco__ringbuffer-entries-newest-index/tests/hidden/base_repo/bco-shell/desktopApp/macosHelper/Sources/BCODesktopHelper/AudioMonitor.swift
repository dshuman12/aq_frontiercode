import AppKit
import CoreAudio
import Foundation

final class AudioMonitor {
    private let onStateChanged: (Bool) -> Void

    private var workspaceActivateObserver: NSObjectProtocol?
    private var periodicResyncTimer: DispatchSourceTimer?

    private var started = false
    private var trackedOutputDevice: AudioObjectID = kAudioObjectUnknown
    private var trackedInputDevice: AudioObjectID = kAudioObjectUnknown

    init(onStateChanged: @escaping (Bool) -> Void) {
        self.onStateChanged = onStateChanged
    }

    deinit {
        stop()
    }

    func start() {
        runOnMainSync {
            guard !started else { return }
            started = true

            let systemObject = AudioObjectID(kAudioObjectSystemObject)
            Self.addListener(
                objectID: systemObject,
                selector: kAudioHardwarePropertyDefaultOutputDevice,
                proc: helperAudioPropertyListenerProc,
                clientData: Unmanaged.passUnretained(self).toOpaque()
            )
            Self.addListener(
                objectID: systemObject,
                selector: kAudioHardwarePropertyDefaultInputDevice,
                proc: helperAudioPropertyListenerProc,
                clientData: Unmanaged.passUnretained(self).toOpaque()
            )

            workspaceActivateObserver = NSWorkspace.shared.notificationCenter.addObserver(
                forName: NSWorkspace.didActivateApplicationNotification,
                object: nil,
                queue: .main
            ) { [weak self] _ in
                guard let self, self.started else { return }
                self.onStateChanged(false)
            }

            self.resyncTrackedDevices()
            self.onStateChanged(false)

            let timer = DispatchSource.makeTimerSource(queue: .main)
            timer.schedule(deadline: .now() + Self.periodicResyncInterval, repeating: Self.periodicResyncInterval)
            timer.setEventHandler { [weak self] in
                guard let self, self.started else { return }
                self.resyncTrackedDevices()
                self.onStateChanged(true)
            }
            timer.resume()
            periodicResyncTimer = timer
        }
    }

    func stop() {
        runOnMainSync {
            guard started else { return }
            started = false

            periodicResyncTimer?.cancel()
            periodicResyncTimer = nil

            if let workspaceActivateObserver {
                NSWorkspace.shared.notificationCenter.removeObserver(workspaceActivateObserver)
                self.workspaceActivateObserver = nil
            }

            let systemObject = AudioObjectID(kAudioObjectSystemObject)
            Self.removeListener(
                objectID: systemObject,
                selector: kAudioHardwarePropertyDefaultOutputDevice,
                proc: helperAudioPropertyListenerProc,
                clientData: Unmanaged.passUnretained(self).toOpaque()
            )
            Self.removeListener(
                objectID: systemObject,
                selector: kAudioHardwarePropertyDefaultInputDevice,
                proc: helperAudioPropertyListenerProc,
                clientData: Unmanaged.passUnretained(self).toOpaque()
            )

            removeRunningListenerIfNeeded(deviceID: trackedOutputDevice)
            removeRunningListenerIfNeeded(deviceID: trackedInputDevice)
            trackedOutputDevice = kAudioObjectUnknown
            trackedInputDevice = kAudioObjectUnknown
        }
    }

    func currentPriority() -> Int {
        let (outputDevice, inputDevice, frontmostBundleID) = runOnMainSync {
            (
                trackedOutputDevice,
                trackedInputDevice,
                NSWorkspace.shared.frontmostApplication?.bundleIdentifier,
            )
        }
        let defaultOutputRunning = Self.deviceIsRunningSomewhere(outputDevice)
        let fallbackOutputRunning = !defaultOutputRunning &&
            Self.anyOutputDeviceRunning(excluding: outputDevice)
        let outputRunning = defaultOutputRunning || fallbackOutputRunning
        let inputRunning = Self.deviceIsRunningSomewhere(inputDevice)
        if fallbackOutputRunning {
            HelperLogger.log(
                "AudioMonitor fallback output scan detected active playback outside the default output device"
            )
        }
        return AudioActivityPriority.priority(
            outputRunning: outputRunning,
            inputRunning: inputRunning,
            frontmostBundleID: frontmostBundleID
        )
    }

    fileprivate func handlePropertyChange() {
        runOnMainAsync { [weak self] in
            guard let self, self.started else { return }
            self.resyncTrackedDevices()
            self.onStateChanged(false)
        }
    }

    private func resyncTrackedDevices() {
        let newOutput = Self.defaultDeviceID(selector: kAudioHardwarePropertyDefaultOutputDevice)
        if newOutput != trackedOutputDevice {
            removeRunningListenerIfNeeded(deviceID: trackedOutputDevice)
            trackedOutputDevice = newOutput
            addRunningListenerIfNeeded(deviceID: trackedOutputDevice)
        }

        let newInput = Self.defaultDeviceID(selector: kAudioHardwarePropertyDefaultInputDevice)
        if newInput != trackedInputDevice {
            removeRunningListenerIfNeeded(deviceID: trackedInputDevice)
            trackedInputDevice = newInput
            addRunningListenerIfNeeded(deviceID: trackedInputDevice)
        }
    }

    private func addRunningListenerIfNeeded(deviceID: AudioObjectID) {
        guard Self.isValidDeviceObject(deviceID) else { return }
        Self.addListener(
            objectID: deviceID,
            selector: kAudioDevicePropertyDeviceIsRunningSomewhere,
            proc: helperAudioPropertyListenerProc,
            clientData: Unmanaged.passUnretained(self).toOpaque()
        )
    }

    private func removeRunningListenerIfNeeded(deviceID: AudioObjectID) {
        guard Self.isValidDeviceObject(deviceID) else { return }
        Self.removeListener(
            objectID: deviceID,
            selector: kAudioDevicePropertyDeviceIsRunningSomewhere,
            proc: helperAudioPropertyListenerProc,
            clientData: Unmanaged.passUnretained(self).toOpaque()
        )
    }

    private static func isValidDeviceObject(_ deviceID: AudioObjectID) -> Bool {
        deviceID != kAudioObjectUnknown
    }

    private static func deviceIsRunningSomewhere(_ deviceID: AudioObjectID) -> Bool {
        guard deviceID != kAudioObjectUnknown else { return false }
        var address = AudioObjectPropertyAddress(
            mSelector: kAudioDevicePropertyDeviceIsRunningSomewhere,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        var running: UInt32 = 0
        var size = UInt32(MemoryLayout<UInt32>.size)
        let err = AudioObjectGetPropertyData(deviceID, &address, 0, nil, &size, &running)
        if err == noErr, running != 0 {
            return true
        }

        var isRunningAddr = AudioObjectPropertyAddress(
            mSelector: kAudioDevicePropertyDeviceIsRunning,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        var isRunning: UInt32 = 0
        var isRunningSize = UInt32(MemoryLayout<UInt32>.size)
        let err2 = AudioObjectGetPropertyData(deviceID, &isRunningAddr, 0, nil, &isRunningSize, &isRunning)
        if err2 == noErr, isRunning != 0 {
            return true
        }

        return false
    }

    private static func anyOutputDeviceRunning(excluding defaultID: AudioObjectID) -> Bool {
        let systemObject = AudioObjectID(kAudioObjectSystemObject)
        var address = AudioObjectPropertyAddress(
            mSelector: kAudioHardwarePropertyDevices,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        var dataSize: UInt32 = 0
        guard AudioObjectGetPropertyDataSize(systemObject, &address, 0, nil, &dataSize) == noErr,
              dataSize > 0 else {
            return false
        }
        let deviceCount = Int(dataSize) / MemoryLayout<AudioObjectID>.size
        var deviceIDs = [AudioObjectID](repeating: 0, count: deviceCount)
        guard AudioObjectGetPropertyData(systemObject, &address, 0, nil, &dataSize, &deviceIDs) == noErr else {
            return false
        }
        for id in deviceIDs where id != defaultID && id != kAudioObjectUnknown {
            guard hasOutputStreams(id), deviceIsRunningSomewhere(id) else { continue }
            return true
        }
        return false
    }

    private static func hasOutputStreams(_ deviceID: AudioObjectID) -> Bool {
        var address = AudioObjectPropertyAddress(
            mSelector: kAudioDevicePropertyStreams,
            mScope: kAudioObjectPropertyScopeOutput,
            mElement: kAudioObjectPropertyElementMain
        )
        var dataSize: UInt32 = 0
        guard AudioObjectGetPropertyDataSize(deviceID, &address, 0, nil, &dataSize) == noErr else {
            return false
        }
        return dataSize > 0
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

    private static func addListener(
        objectID: AudioObjectID,
        selector: AudioObjectPropertySelector,
        proc: AudioObjectPropertyListenerProc,
        clientData: UnsafeMutableRawPointer?
    ) {
        var address = AudioObjectPropertyAddress(
            mSelector: selector,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        let status = AudioObjectAddPropertyListener(objectID, &address, proc, clientData)
        if status != noErr {
            HelperLogger.log("AudioObjectAddPropertyListener failed: \(status) selector=\(selector)")
        }
    }

    private static func removeListener(
        objectID: AudioObjectID,
        selector: AudioObjectPropertySelector,
        proc: AudioObjectPropertyListenerProc,
        clientData: UnsafeMutableRawPointer?
    ) {
        var address = AudioObjectPropertyAddress(
            mSelector: selector,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        _ = AudioObjectRemovePropertyListener(objectID, &address, proc, clientData)
    }

    private func runOnMainSync<T>(_ block: () -> T) -> T {
        if Thread.isMainThread {
            return block()
        }
        return DispatchQueue.main.sync(execute: block)
    }

    private func runOnMainAsync(_ block: @escaping () -> Void) {
        if Thread.isMainThread {
            block()
            return
        }
        DispatchQueue.main.async(execute: block)
    }

    private static let periodicResyncInterval: TimeInterval = 3
}

private func helperAudioPropertyListenerProc(
    objectID: AudioObjectID,
    numberAddresses: UInt32,
    addresses: UnsafePointer<AudioObjectPropertyAddress>,
    clientData: UnsafeMutableRawPointer?
) -> OSStatus {
    guard let clientData else { return noErr }
    let monitor = Unmanaged<AudioMonitor>.fromOpaque(clientData).takeUnretainedValue()
    monitor.handlePropertyChange()
    return noErr
}
