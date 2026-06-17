#pragma once
#include "pulse/core/types.hpp"
#include <vector>
#include <functional>
#include <cstdint>
#include <list>
#include <unordered_map>

namespace pulse {

using TimerId = uint64_t;
using TimerCallback = std::function<void(TimerId)>;

class TimerWheel {
public:
    TimerWheel(size_t slots = 256, uint64_t tick_duration_ms = 1);

    TimerId schedule(uint64_t delay_ms, TimerCallback callback);
    TimerId schedule_recurring(uint64_t interval_ms, TimerCallback callback);
    bool cancel(TimerId id);

    void advance(Timestamp now);
    void tick();

    Timestamp current_time() const { return current_time_; }
    size_t pending_count() const { return pending_count_; }
    uint64_t total_fired() const { return total_fired_; }
    uint64_t total_cancelled() const { return total_cancelled_; }
    size_t slot_count() const { return slots_; }

private:
    struct Timer {
        TimerId id;
        Timestamp deadline;
        TimerCallback callback;
        bool recurring;
        uint64_t interval_ms;
    };

    size_t slot_for(Timestamp deadline) const;
    void insert_timer(Timer timer);
    void promote_overflow();

    size_t slots_;
    uint64_t tick_duration_ms_;
    Timestamp current_time_ = 0;
    size_t current_slot_ = 0;

    std::vector<std::list<Timer>> wheel_;
    std::list<Timer> overflow_;
    std::unordered_map<TimerId, bool> active_ids_;

    TimerId next_id_ = 1;
    size_t pending_count_ = 0;
    uint64_t total_fired_ = 0;
    uint64_t total_cancelled_ = 0;
};

} // namespace pulse