import Foundation

public enum BluetoothConnectionHeuristics {
    public static func normalizedAddress(_ raw: String) -> String {
        raw.uppercased().filter { $0.isHexDigit }
    }

    public static func defaultOutputMatchesTarget(
        deviceUID: String?,
        deviceName: String?,
        targetAddress address: String,
        targetName: String?
    ) -> Bool {
        let uidNorm = deviceUID.map { normalizedAddress($0) } ?? ""
        let addrNorm = normalizedAddress(address)
        let targetNameNorm = normalizedDeviceName(targetName)
        let deviceNameNorm = normalizedDeviceName(deviceName)
        let matchedByAddress = !uidNorm.isEmpty && !addrNorm.isEmpty &&
            (uidNorm.contains(addrNorm) || addrNorm.contains(uidNorm))
        let matchedByName = !targetNameNorm.isEmpty && targetNameNorm == deviceNameNorm
        return matchedByAddress || matchedByName
    }

    private static func normalizedDeviceName(_ raw: String?) -> String {
        raw?
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()
            .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression) ?? ""
    }
}

public final class BluetoothConnectionShadow {
    public static let shared = BluetoothConnectionShadow()
    public static let defaultTTL: TimeInterval = 12

    private let lock = NSLock()
    private var addressNorm: String = ""
    private var expiresAt: Date = .distantPast
    private var ttl: TimeInterval = 0

    private init() {}

    public func believeConnected(address: String, ttl: TimeInterval = BluetoothConnectionShadow.defaultTTL) {
        let norm = BluetoothConnectionHeuristics.normalizedAddress(address)
        guard !norm.isEmpty, ttl > 0 else { return }
        lock.lock()
        defer { lock.unlock() }
        addressNorm = norm
        self.ttl = ttl
        expiresAt = Date().addingTimeInterval(ttl)
    }

    public func refreshIfActive(address: String) {
        let norm = BluetoothConnectionHeuristics.normalizedAddress(address)
        guard !norm.isEmpty else { return }
        lock.lock()
        defer { lock.unlock() }
        guard norm == addressNorm, ttl > 0 else { return }
        expiresAt = Date().addingTimeInterval(ttl)
    }

    public func isBelievedConnected(address: String) -> Bool {
        let norm = BluetoothConnectionHeuristics.normalizedAddress(address)
        guard !norm.isEmpty else { return false }
        lock.lock()
        defer { lock.unlock() }
        return norm == addressNorm && Date() < expiresAt
    }

    public func clear() {
        lock.lock()
        defer { lock.unlock() }
        addressNorm = ""
        expiresAt = .distantPast
        ttl = 0
    }

    public func clearIfMatches(address: String) {
        let norm = BluetoothConnectionHeuristics.normalizedAddress(address)
        guard !norm.isEmpty else { return }
        lock.lock()
        defer { lock.unlock() }
        if norm == addressNorm {
            addressNorm = ""
            expiresAt = .distantPast
            ttl = 0
        }
    }
}
