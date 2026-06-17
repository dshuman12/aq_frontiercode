#pragma once
#include "pulse/core/event.hpp"
#include <vector>
#include <cstddef>

namespace pulse {

class EventPool {
public:
    explicit EventPool(size_t initial_capacity = 64) {
        pool_.reserve(initial_capacity);
    }

    Event acquire(const std::string& event_type, Timestamp ts) {
        if (!pool_.empty()) {
            Event e = std::move(pool_.back());
            pool_.pop_back();
            e.set_event_type(event_type);
            e.set_timestamp(ts);
            e.clear_fields();
            reused_++;
            return e;
        }
        allocated_++;
        return Event(event_type, ts);
    }

    void release(Event event) {
        if (pool_.size() < max_pool_size_) {
            pool_.push_back(std::move(event));
        }
    }

    size_t pool_size() const { return pool_.size(); }
    uint64_t allocated() const { return allocated_; }
    uint64_t reused() const { return reused_; }

private:
    std::vector<Event> pool_;
    size_t max_pool_size_ = 1024;
    uint64_t allocated_ = 0;
    uint64_t reused_ = 0;
};

} // namespace pulse