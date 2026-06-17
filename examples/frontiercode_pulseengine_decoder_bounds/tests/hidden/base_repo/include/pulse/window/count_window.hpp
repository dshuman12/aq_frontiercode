#pragma once
#include "pulse/core/event.hpp"
#include <vector>
#include <functional>
#include <cstdint>
#include <stdexcept>

namespace pulse {

// ---------------------------------------------------------------------------
// CountWindow — count-based tumbling window that closes after N events.
//
// Unlike time-based windows, this window triggers solely on event count.
// When the number of buffered events reaches window_size, the on_close
// callback is invoked and the buffer is cleared for the next window.
// ---------------------------------------------------------------------------
class CountWindow {
public:
    using WindowCallback = std::function<void(const std::vector<Event>&)>;

    /// Construct a CountWindow.
    /// @param window_size  Number of events per window (must be > 0).
    /// @param on_close     Callback invoked each time a window closes.
    CountWindow(size_t window_size, WindowCallback on_close)
        : window_size_(window_size)
        , on_close_(std::move(on_close)) {
        if (window_size_ == 0) {
            throw PulseError(ErrorCode::InvalidArgument,
                             "CountWindow: window_size must be > 0");
        }
        if (!on_close_) {
            throw PulseError(ErrorCode::InvalidArgument,
                             "CountWindow: on_close callback must not be null");
        }
        buffer_.reserve(window_size_);
    }

    /// Add an event to the current window.
    /// When the window reaches window_size events, it is closed automatically.
    void add(const Event& event) {
        buffer_.push_back(event.clone());
        total_events_++;

        if (buffer_.size() >= window_size_) {
            close_window();
        }
    }

    /// Flush any remaining events as a partial window.
    void flush() {
        if (!buffer_.empty()) {
            on_close_(buffer_);
            windows_closed_++;
            buffer_.clear();
        }
    }

    // --- Accessors ---

    /// Configured window size (number of events per window).
    size_t window_size() const { return window_size_; }

    /// Number of events currently buffered in the open window.
    size_t current_count() const { return buffer_.size(); }

    /// Total number of windows that have been closed.
    uint64_t windows_closed() const { return windows_closed_; }

    /// Total number of events added across all windows.
    uint64_t total_events() const { return total_events_; }

    /// Access the current (open) window's buffer for inspection.
    const std::vector<Event>& current_buffer() const { return buffer_; }

    /// Reset the window: clears buffer and zeroes all counters.
    void reset() {
        buffer_.clear();
        windows_closed_ = 0;
        total_events_ = 0;
    }

private:
    void close_window() {
        on_close_(buffer_);
        windows_closed_++;
        buffer_.clear();
    }

    size_t          window_size_;
    WindowCallback  on_close_;

    std::vector<Event> buffer_;
    uint64_t windows_closed_ = 0;
    uint64_t total_events_   = 0;
};

} // namespace pulse
