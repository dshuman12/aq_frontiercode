#pragma once
#include "pulse/core/event.hpp"
#include "pulse/window/tumbling_window.hpp"
#include <vector>
#include <functional>
#include <unordered_map>
#include <string>

namespace pulse {

class SessionWindow {
public:
    SessionWindow(uint64_t gap_ms, WindowCallback on_close,
                  const std::string& key_field = "");

    void add(const Event& event);
    void advance_time(Timestamp now);
    void flush_all();

    size_t active_sessions() const { return sessions_.size(); }
    uint64_t gap_ms() const { return gap_ms_; }
    uint64_t sessions_closed() const { return sessions_closed_; }

private:
    struct Session {
        std::vector<Event> events;
        Timestamp start;
        Timestamp last_activity;
    };

    void check_timeouts(Timestamp now);
    void close_session(const std::string& key);
    std::string extract_key(const Event& event) const;

    uint64_t gap_ms_;
    std::string key_field_;
    WindowCallback on_close_;
    std::unordered_map<std::string, Session> sessions_;
    uint64_t sessions_closed_ = 0;
};

} // namespace pulse