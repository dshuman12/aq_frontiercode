#include "pulse/timer/timer_wheel.hpp"
#include <algorithm>

namespace pulse {

TimerWheel::TimerWheel(size_t slots, uint64_t tick_duration_ms)
    : slots_(slots), tick_duration_ms_(tick_duration_ms) {
    if (slots == 0) throw PulseError(ErrorCode::InvalidArgument, "Slots must be > 0");
    if (tick_duration_ms == 0) throw PulseError(ErrorCode::InvalidArgument, "Tick must be > 0");
    wheel_.resize(slots);
}

size_t TimerWheel::slot_for(Timestamp deadline) const {
    uint64_t ticks_from_now = 0;
    if (deadline > current_time_) {
        ticks_from_now = (deadline - current_time_) / tick_duration_ms_;
    }
    if (ticks_from_now >= slots_) {
        return slots_; // overflow
    }
    return (current_slot_ + ticks_from_now) % slots_;
}

void TimerWheel::insert_timer(Timer timer) {
    size_t slot = slot_for(timer.deadline);
    if (slot >= slots_) {
        overflow_.push_back(std::move(timer));
    } else {
        wheel_[slot].push_back(std::move(timer));
    }
}

TimerId TimerWheel::schedule(uint64_t delay_ms, TimerCallback callback) {
    TimerId id = next_id_++;
    Timer t{id, current_time_ + delay_ms, std::move(callback), false, 0};
    active_ids_[id] = true;
    insert_timer(std::move(t));
    pending_count_++;
    return id;
}

TimerId TimerWheel::schedule_recurring(uint64_t interval_ms, TimerCallback callback) {
    TimerId id = next_id_++;
    Timer t{id, current_time_ + interval_ms, std::move(callback), true, interval_ms};
    active_ids_[id] = true;
    insert_timer(std::move(t));
    pending_count_++;
    return id;
}

bool TimerWheel::cancel(TimerId id) {
    auto it = active_ids_.find(id);
    if (it == active_ids_.end() || !it->second) return false;
    it->second = false;
    total_cancelled_++;
    pending_count_--;
    return true;
}

void TimerWheel::tick() {
    current_time_ += tick_duration_ms_;
    current_slot_ = (current_slot_ + 1) % slots_;

    auto& slot_list = wheel_[current_slot_];
    auto it = slot_list.begin();
    while (it != slot_list.end()) {
        if (it->deadline <= current_time_) {
            auto& timer = *it;
            auto ait = active_ids_.find(timer.id);
            if (ait != active_ids_.end() && ait->second) {
                timer.callback(timer.id);
                total_fired_++;
                if (timer.recurring) {
                    Timer next{timer.id, current_time_ + timer.interval_ms,
                               timer.callback, true, timer.interval_ms};
                    insert_timer(std::move(next));
                } else {
                    active_ids_.erase(ait);
                    pending_count_--;
                }
            }
            it = slot_list.erase(it);
        } else {
            ++it;
        }
    }
}

void TimerWheel::promote_overflow() {
    auto oit = overflow_.begin();
    while (oit != overflow_.end()) {
        size_t slot = slot_for(oit->deadline);
        if (slot < slots_) {
            wheel_[slot].push_back(std::move(*oit));
            oit = overflow_.erase(oit);
        } else {
            ++oit;
        }
    }
}

void TimerWheel::advance(Timestamp now) {
    size_t ticks_done = 0;
    while (current_time_ < now) {
        tick();
        ticks_done++;
        if (ticks_done % slots_ == 0) {
            promote_overflow();
        }
    }
    if (ticks_done % slots_ != 0) {
        promote_overflow();
    }
}

} // namespace pulse