#pragma once
#include "pulse/core/event.hpp"
#include <vector>
#include <deque>
#include <functional>
#include <cstdint>
#include <stdexcept>
#include <algorithm>

namespace pulse {

/// SlidingCountWindow implements a count-based sliding window.
///
/// The window emits every `slide_size` events, producing a snapshot of
/// the last `window_size` events (or fewer if not enough have arrived yet).
/// Internally backed by a std::deque; old events beyond
/// window_size + slide_size are evicted from the front to bound memory.
///
/// Example with window_size=5, slide_size=2:
///   After  2 events added: emits [e1, e2]           (partial)
///   After  4 events added: emits [e1, e2, e3, e4]   (partial)
///   After  6 events added: emits [e2, e3, e4, e5, e6] (full window)
///   After  8 events added: emits [e4, e5, e6, e7, e8] (full window)
class SlidingCountWindow {
public:
    /// Construct a sliding count window.
    /// @param window_size Number of events in each emitted window.
    /// @param slide_size  Number of new events between emissions.
    /// @param on_emit     Callback receiving the window contents.
    /// @throws std::invalid_argument if window_size or slide_size is 0,
    ///         or if on_emit is null.
    SlidingCountWindow(size_t window_size,
                       size_t slide_size,
                       std::function<void(const std::vector<Event>&)> on_emit)
        : window_size_(window_size)
        , slide_size_(slide_size)
        , on_emit_(std::move(on_emit))
        , total_added_(0)
        , windows_emitted_(0)
    {
        if (window_size_ == 0) {
            throw std::invalid_argument(
                "SlidingCountWindow: window_size must be > 0");
        }
        if (slide_size_ == 0) {
            throw std::invalid_argument(
                "SlidingCountWindow: slide_size must be > 0");
        }
        if (!on_emit_) {
            throw std::invalid_argument(
                "SlidingCountWindow: on_emit callback must not be null");
        }
    }

    /// Add an event to the window buffer.
    /// When the total number of events added is a multiple of slide_size,
    /// the last window_size events (or fewer if not enough) are emitted
    /// via the callback.
    void add(const Event& event) {
        buffer_.push_back(event);
        total_added_++;

        // Evict old events from the front to bound memory usage
        while (buffer_.size() > window_size_ + slide_size_) {
            buffer_.pop_front();
        }

        // Emit a window every slide_size events
        if (total_added_ % slide_size_ == 0) {
            emit_window();
        }
    }

    /// Flush remaining buffered events as a (possibly partial) window.
    /// If the buffer is empty, this is a no-op.
    void flush() {
        if (buffer_.empty()) {
            return;
        }
        size_t count = std::min(window_size_, buffer_.size());
        auto start = buffer_.end() - static_cast<std::ptrdiff_t>(count);
        std::vector<Event> window(start, buffer_.end());
        on_emit_(window);
        windows_emitted_++;
        buffer_.clear();
    }

    /// The configured window size (maximum events per emitted window).
    size_t window_size() const { return window_size_; }

    /// The configured slide size (events between emissions).
    size_t slide_size() const { return slide_size_; }

    /// How many windows have been emitted so far (including flush).
    uint64_t windows_emitted() const { return windows_emitted_; }

    /// Current number of events in the internal buffer.
    size_t buffer_size() const { return buffer_.size(); }

private:
    /// Emit the last window_size events (or all buffered if fewer).
    void emit_window() {
        size_t count = std::min(window_size_, buffer_.size());
        auto start = buffer_.end() - static_cast<std::ptrdiff_t>(count);
        std::vector<Event> window(start, buffer_.end());
        on_emit_(window);
        windows_emitted_++;
    }

    size_t window_size_;
    size_t slide_size_;
    std::function<void(const std::vector<Event>&)> on_emit_;
    std::deque<Event> buffer_;
    uint64_t total_added_;
    uint64_t windows_emitted_;
};

} // namespace pulse
