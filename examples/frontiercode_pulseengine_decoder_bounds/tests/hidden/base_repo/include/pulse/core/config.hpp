#pragma once
#include <cstddef>
#include <cstdint>

namespace pulse {

struct EngineConfig {
    size_t default_buffer_capacity = 4096;
    size_t default_queue_capacity = 1024;
    uint64_t default_window_duration_ms = 60000;
    uint64_t default_session_gap_ms = 30000;
    size_t default_state_capacity = 10000;
    uint64_t default_ttl_ms = 300000;
    size_t timer_wheel_slots = 256;
    size_t timer_wheel_levels = 4;
    bool enable_stats = true;
};

inline EngineConfig default_config() {
    return EngineConfig{};
}

} // namespace pulse