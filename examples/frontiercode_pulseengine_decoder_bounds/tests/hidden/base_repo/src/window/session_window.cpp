#include "pulse/window/session_window.hpp"

namespace pulse {

SessionWindow::SessionWindow(uint64_t gap_ms, WindowCallback on_close,
                             const std::string& key_field)
    : gap_ms_(gap_ms), key_field_(key_field), on_close_(std::move(on_close)) {
    if (gap_ms == 0) {
        throw PulseError(ErrorCode::InvalidArgument, "Session gap must be > 0");
    }
}

std::string SessionWindow::extract_key(const Event& event) const {
    if (key_field_.empty()) return "__default__";
    if (!event.has_field(key_field_)) return "__no_key__";
    const auto& val = event.get_field(key_field_);
    if (auto p = std::get_if<std::string>(&val)) return *p;
    if (auto p = std::get_if<int64_t>(&val)) return std::to_string(*p);
    return "__unknown__";
}

void SessionWindow::add(const Event& event) {
    Timestamp ts = event.timestamp();
    std::string key = extract_key(event);

    check_timeouts(ts);

    auto it = sessions_.find(key);
    if (it == sessions_.end()) {
        Session s;
        s.start = ts;
        s.last_activity = ts;
        s.events.push_back(event);
        sessions_[key] = std::move(s);
    } else {
        if (ts - it->second.last_activity > gap_ms_) {
            close_session(key);
            Session s;
            s.start = ts;
            s.last_activity = ts;
            s.events.push_back(event);
            sessions_[key] = std::move(s);
        } else {
            it->second.last_activity = ts;
            it->second.events.push_back(event);
        }
    }
}

void SessionWindow::advance_time(Timestamp now) {
    check_timeouts(now);
}

void SessionWindow::check_timeouts(Timestamp now) {
    std::vector<std::string> expired;
    for (const auto& kv : sessions_) {
        if (now - kv.second.last_activity > gap_ms_) {
            expired.push_back(kv.first);
        }
    }
    for (const auto& key : expired) {
        close_session(key);
    }
}

void SessionWindow::close_session(const std::string& key) {
    auto it = sessions_.find(key);
    if (it == sessions_.end()) return;
    if (on_close_) {
        on_close_(it->second.events, it->second.start, it->second.last_activity);
    }
    sessions_.erase(it);
    sessions_closed_++;
}

void SessionWindow::flush_all() {
    std::vector<std::string> keys;
    for (const auto& kv : sessions_) keys.push_back(kv.first);
    for (const auto& key : keys) close_session(key);
}

} // namespace pulse