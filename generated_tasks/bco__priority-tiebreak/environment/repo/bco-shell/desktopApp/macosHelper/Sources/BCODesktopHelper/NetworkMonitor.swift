import Foundation
import Network

final class NetworkMonitor {
    private let queue = DispatchQueue(label: "bco.desktop.helper.network")
    private let queueKey = DispatchSpecificKey<Void>()
    private let onNetworkRefresh: () -> Void
    private var monitor: NWPathMonitor?
    private var started = false

    init(onNetworkRefresh: @escaping () -> Void) {
        self.onNetworkRefresh = onNetworkRefresh
        queue.setSpecific(key: queueKey, value: ())
    }

    func start() {
        syncOnQueue {
            guard !started else { return }
            started = true

            let monitor = NWPathMonitor()
            self.monitor = monitor
            monitor.pathUpdateHandler = { [weak self] path in
                guard let self else { return }
                if path.status == .satisfied {
                    self.onNetworkRefresh()
                }
            }
            monitor.start(queue: queue)
        }
    }

    func stop() {
        syncOnQueue {
            monitor?.cancel()
            monitor = nil
            started = false
        }
    }

    private func syncOnQueue<T>(_ block: () -> T) -> T {
        if DispatchQueue.getSpecific(key: queueKey) != nil {
            return block()
        }
        return queue.sync(execute: block)
    }
}
