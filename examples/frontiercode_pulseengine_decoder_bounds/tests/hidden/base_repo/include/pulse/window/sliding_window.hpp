#pragma once
#include "pulse/core/event.hpp"
#include "pulse/window/tumbling_window.hpp"
#include <vector>
#include <deque>
#include <functional>

namespace pulse {

class SlidingWindow {
public:
    SlidingWindow(uint64_t window_size_ms, uint64_t slide_ms, WindowCallback on_emit);

    void add(const Event& event);
    void advance_time(Timestamp now);
    void flush();

    size_t current_count() const { return events_.size(); }
    uint64_t window_size_ms() const { return window_size_ms_; }
    uint64_t slide_ms() const { return slide_ms_; }
    uint64_t windows_emitted() const { return windows_emitted_; }

private:
    void try_emit(Timestamp now);
    void evict_expired(Timestamp now);

    uint64_t window_size_ms_;
    uint64_t slide_ms_;
    Timestamp next_emit_ = 0;
    bool started_ = false;
    std::deque<Event> events_;
    WindowCallback on_emit_;
    uint64_t windows_emitted_ = 0;
};

} // namespace pulse