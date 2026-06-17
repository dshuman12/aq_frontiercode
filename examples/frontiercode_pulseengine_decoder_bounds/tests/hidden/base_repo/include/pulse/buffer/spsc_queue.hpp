#pragma once
#include "pulse/core/event.hpp"
#include <atomic>
#include <optional>
#include <cstddef>

namespace pulse {

class SPSCQueue {
public:
    explicit SPSCQueue(size_t capacity);
    ~SPSCQueue();

    SPSCQueue(const SPSCQueue&) = delete;
    SPSCQueue& operator=(const SPSCQueue&) = delete;

    bool try_push(Event event);
    std::optional<Event> try_pop();

    size_t capacity() const { return cap_; }
    bool empty() const;
    size_t size_approx() const;

private:
    static size_t next_power_of_two(size_t n);

    Event* buffer_;
    size_t cap_;
    size_t mask_;

    alignas(64) std::atomic<uint64_t> head_{0};
    alignas(64) std::atomic<uint64_t> tail_{0};
};

} // namespace pulse