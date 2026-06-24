import Darwin
import Foundation

enum HelperLogger {
    static func log(_ message: String) {
        // Packaged GUI launches may not provide a usable stderr; raw write avoids aborting the helper.
        "[BCODesktopHelper] \(message)\n".utf8CString.withUnsafeBufferPointer { buffer in
            guard let baseAddress = buffer.baseAddress, buffer.count > 1 else { return }
            _ = Darwin.write(STDERR_FILENO, baseAddress, buffer.count - 1)
        }
    }
}
