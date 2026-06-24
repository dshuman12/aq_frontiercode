import Darwin
import BCODesktopHelperSupport

private func expect(_ condition: @autoclosure () -> Bool, _ message: String) {
    if !condition() {
        fputs("BCODesktopHelperSelfTest failed: \(message)\n", stderr)
        exit(1)
    }
}

BluetoothConnectionShadow.shared.clear()
BluetoothConnectionShadow.shared.believeConnected(address: "AA-BB-CC-DD-EE-FF", ttl: 60)
expect(
    BluetoothConnectionShadow.shared.isBelievedConnected(address: "aa:bb:cc:dd:ee:ff"),
    "shadow should match normalized address formats"
)
BluetoothConnectionShadow.shared.clearIfMatches(address: "AA:BB:CC:DD:EE:FF")
expect(
    !BluetoothConnectionShadow.shared.isBelievedConnected(address: "aa:bb:cc:dd:ee:ff"),
    "shadow should clear matching addresses"
)

BluetoothConnectionShadow.shared.believeConnected(address: "AA:BB:CC:DD:EE:FF", ttl: -1)
BluetoothConnectionShadow.shared.believeConnected(address: "   ", ttl: 60)
expect(
    !BluetoothConnectionShadow.shared.isBelievedConnected(address: "AA:BB:CC:DD:EE:FF"),
    "shadow should ignore invalid input"
)

expect(
    BluetoothConnectionHeuristics.defaultOutputMatchesTarget(
        deviceUID: "AppleUSBAudioEngine:AA-BB-CC-DD-EE-FF",
        deviceName: "Other Device",
        targetAddress: "AA:BB:CC:DD:EE:FF",
        targetName: "Target Headset"
    ),
    "CoreAudio target match should use normalized addresses embedded in device UID"
)

expect(
    BluetoothConnectionHeuristics.defaultOutputMatchesTarget(
        deviceUID: nil,
        deviceName: "  My   Headset  ",
        targetAddress: "11:22:33:44:55:66",
        targetName: "my headset"
    ),
    "CoreAudio target match should use normalized name fallback"
)

expect(
    !BluetoothConnectionHeuristics.defaultOutputMatchesTarget(
        deviceUID: "AppleUSBAudioEngine:AA-BB-CC-DD-EE-FF",
        deviceName: "Laptop Speakers",
        targetAddress: "11:22:33:44:55:66",
        targetName: "My Headset"
    ),
    "CoreAudio target match should reject unrelated devices"
)

print("BCODesktopHelperSelfTest passed")
