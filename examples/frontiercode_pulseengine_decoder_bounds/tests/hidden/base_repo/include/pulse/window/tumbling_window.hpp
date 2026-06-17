#pragma once
#include "pulse/core/event.hpp"
#include <vector>
#include <functional>
#include <cstdint>

namespace pulse {

using WindowCallback = std::function<void(const std::vector<Event>&, Timestamp, Timestamp)>;

class TumblingWindow {
public:
    TumblingWindow(uint64_t duration_ms, WindowCallback on_close);

    void add(const Event& event);
    void advance_time(Timestamp now);
    void flush();

    size_t current_count() const { return current_.size(); }
    uint64_t duration_ms() const { return duration_ms_; }
    uint64_t windows_closed() const { return windows_closed_; }
    Timestamp window_start() const { return window_start_; }

private:
    void close_window();

    uint64_t duration_ms_;
    Timestamp window_start_ = 0;
    bool started_ = false;
    std::vector<Event> current_;
    WindowCallback on_close_;
    uint64_t windows_closed_ = 0;
};

} // namespace pulse