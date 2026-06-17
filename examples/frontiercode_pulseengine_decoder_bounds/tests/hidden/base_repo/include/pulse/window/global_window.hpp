#pragma once
#include "pulse/core/event.hpp"
#include <vector>
#include <functional>
#include <cstdint>
#include <stdexcept>

namespace pulse {

/// GlobalWindow accumulates all events indefinitely until explicitly flushed.
///
/// Unlike time-based or count-based windows, there is no automatic trigger.
/// The caller decides when to flush. This is useful for batch processing,
/// manual aggregation, or scenarios where all data must be collected before
/// a downstream computation can proceed.
class GlobalWindow {
public:
    /// Construct a GlobalWindow with a flush callback.
    /// @param on_flush Called with all accumulated events when flush() is invoked.
    /// @throws std::invalid_argument if on_flush is empty/null.
    explicit GlobalWindow(std::function<void(const std::vector<Event>&)> on_flush)
        : on_flush_(std::move(on_flush))
        , flush_count_(0)
    {
        if (!on_flush_) {
            throw std::invalid_argument(
                "GlobalWindow: on_flush callback must not be null");
        }
    }

    /// Add an event to the global buffer.
    void add(const Event& event) {
        buffer_.push_back(event);
    }

    /// Flush all accumulated events.
    /// Calls the callback with the full buffer, then clears it.
    /// If the buffer is empty, this is a no-op (callback is not invoked,
    /// flush counter is not incremented).
    void flush() {
        if (buffer_.empty()) {
            return;
        }
        on_flush_(buffer_);
        buffer_.clear();
        flush_count_++;
    }

    /// Number of events currently buffered.
    size_t size() const { return buffer_.size(); }

    /// Whether the buffer is empty.
    bool empty() const { return buffer_.empty(); }

    /// How many times flush() actually delivered events (non-empty flushes).
    uint64_t flushes() const { return flush_count_; }

    /// Discard all buffered events without invoking the callback.
    void clear() {
        buffer_.clear();
    }

private:
    std::vector<Event> buffer_;
    std::function<void(const std::vector<Event>&)> on_flush_;
    uint64_t flush_count_;
};

} // namespace pulse
