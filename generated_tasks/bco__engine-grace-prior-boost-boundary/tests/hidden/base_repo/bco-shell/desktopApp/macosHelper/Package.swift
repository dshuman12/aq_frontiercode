// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "BCODesktopHelper",
    platforms: [
        .macOS(.v13),
    ],
    products: [
        .executable(name: "BCODesktopHelper", targets: ["BCODesktopHelper"]),
        .executable(name: "BCODesktopHelperSelfTest", targets: ["BCODesktopHelperSelfTest"]),
    ],
    targets: [
        .target(
            name: "BCODesktopHelperSupport",
            path: "Sources/BCODesktopHelperSupport"
        ),
        .executableTarget(
            name: "BCODesktopHelper",
            dependencies: ["BCODesktopHelperSupport"],
            path: "Sources/BCODesktopHelper",
            linkerSettings: [
                .linkedFramework("AppKit"),
                .linkedFramework("IOBluetooth"),
                .linkedFramework("CoreAudio"),
                .linkedFramework("Network"),
            ]
        ),
        .executableTarget(
            name: "BCODesktopHelperSelfTest",
            dependencies: ["BCODesktopHelperSupport"],
            path: "Tests/BCODesktopHelperSelfTest"
        ),
    ]
)
