#include "pulse/window/sliding_window.hpp"

namespace pulse {

SlidingWindow::SlidingWindow(uint64_t window_size_ms, uint64_t slide_ms,
                             WindowCallback on_emit)
    : window_size_ms_(window_size_ms), slide_ms_(slide_ms),
      on_emit_(std::move(on_emit)) {
    if (window_size_ms == 0 || slide_ms == 0) {
        throw PulseError(ErrorCode::InvalidArgument,
                         "Window size and slide must be > 0");
    }
}

void SlidingWindow::add(const Event& event) {
    Timestamp ts = event.timestamp();
    if (!started_) {
        next_emit_ = (ts / slide_ms_) * slide_ms_ + slide_ms_;
        started_ = true;
    }
    events_.push_back(event);
    try_emit(ts);
}

void SlidingWindow::advance_time(Timestamp now) {
    if (!started_) return;
    try_emit(now);
}

void SlidingWindow::flush() {
    if (!events_.empty() && on_emit_) {
        Timestamp end = events_.back().timestamp();
        Timestamp start = end >= window_size_ms_ ? end - window_size_ms_ : 0;
        std::vector<Event> snapshot;
        snapshot.reserve(events_.size());
        for (const auto& e : events_) {
            if (e.timestamp() >= start) {
                snapshot.push_back(e);
            }
        }
        on_emit_(snapshot, start, end);
        windows_emitted_++;
    }
}

void SlidingWindow::try_emit(Timestamp now) {
    while (now >= next_emit_) {
        Timestamp window_end = next_emit_;
        Timestamp window_start = window_end >= window_size_ms_
                                     ? window_end - window_size_ms_ : 0;

        evict_expired(window_start);

        std::vector<Event> snapshot;
        snapshot.reserve(events_.size());
        for (const auto& e : events_) {
            if (e.timestamp() >= window_start && e.timestamp() < window_end) {
                snapshot.push_back(e);
            }
        }

        if (on_emit_) {
            on_emit_(snapshot, window_start, window_end);
        }
        windows_emitted_++;
        next_emit_ += slide_ms_;
    }
}

void SlidingWindow::evict_expired(Timestamp window_start) {
    while (!events_.empty() && events_.front().timestamp() < window_start) {
        events_.pop_front();
    }
}

} // namespace pulse