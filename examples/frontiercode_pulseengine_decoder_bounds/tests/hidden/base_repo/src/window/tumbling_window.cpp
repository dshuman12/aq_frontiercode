#include "pulse/window/tumbling_window.hpp"

namespace pulse {

TumblingWindow::TumblingWindow(uint64_t duration_ms, WindowCallback on_close)
    : duration_ms_(duration_ms), on_close_(std::move(on_close)) {
    if (duration_ms == 0) {
        throw PulseError(ErrorCode::InvalidArgument, "Window duration must be > 0");
    }
}

void TumblingWindow::add(const Event& event) {
    Timestamp ts = event.timestamp();
    if (!started_) {
        window_start_ = (ts / duration_ms_) * duration_ms_;
        started_ = true;
    }

    while (ts >= window_start_ + duration_ms_) {
        close_window();
        window_start_ += duration_ms_;
    }

    current_.push_back(event);
}

void TumblingWindow::advance_time(Timestamp now) {
    if (!started_) return;
    while (now >= window_start_ + duration_ms_) {
        close_window();
        window_start_ += duration_ms_;
    }
}

void TumblingWindow::flush() {
    if (!current_.empty()) {
        close_window();
    }
}

void TumblingWindow::close_window() {
    if (on_close_) {
        on_close_(current_, window_start_, window_start_ + duration_ms_);
    }
    current_.clear();
    windows_closed_++;
}

} // namespace pulse