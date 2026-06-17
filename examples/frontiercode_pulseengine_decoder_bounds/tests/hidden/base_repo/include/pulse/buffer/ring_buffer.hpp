#pragma once
#include "pulse/core/types.hpp"
#include "pulse/core/event.hpp"
#include <vector>
#include <cstddef>
#include <optional>
#include <functional>

namespace pulse {

enum class OverflowPolicy {
    DropOldest,
    DropNewest,
    Block
};

class RingBuffer {
public:
    explicit RingBuffer(size_t capacity, OverflowPolicy policy = OverflowPolicy::DropOldest);

    bool push(Event event);
    std::optional<Event> pop();
    const Event* peek() const;

    size_t size() const { return count_; }
    size_t capacity() const { return capacity_; }
    bool empty() const { return count_ == 0; }
    bool full() const { return count_ == capacity_; }

    void clear();
    double fill_ratio() const;

    std::vector<Event> drain(size_t max_count);
    size_t drain_into(std::vector<Event>& out, size_t max_count);

    void set_overflow_callback(std::function<void(const Event&)> cb);

    struct Stats {
        uint64_t total_pushed = 0;
        uint64_t total_popped = 0;
        uint64_t total_dropped = 0;
    };
    Stats stats() const { return stats_; }

private:
    size_t next(size_t idx) const { return (idx + 1) % capacity_; }

    std::vector<Event> buffer_;
    size_t capacity_;
    size_t head_ = 0;
    size_t tail_ = 0;
    size_t count_ = 0;
    OverflowPolicy policy_;
    Stats stats_;
    std::function<void(const Event&)> overflow_cb_;
};

} // namespace pulse