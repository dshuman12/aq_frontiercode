#include "pulse/buffer/spsc_queue.hpp"

namespace pulse {

size_t SPSCQueue::next_power_of_two(size_t n) {
    if (n == 0) return 1;
    n--;
    n |= n >> 1;
    n |= n >> 2;
    n |= n >> 4;
    n |= n >> 8;
    n |= n >> 16;
    n |= n >> 32;
    return n + 1;
}

SPSCQueue::SPSCQueue(size_t capacity) {
    if (capacity == 0) {
        throw PulseError(ErrorCode::InvalidArgument, "SPSCQueue capacity must be > 0");
    }
    cap_ = next_power_of_two(capacity);
    mask_ = cap_ - 1;
    buffer_ = new Event[cap_];
}

SPSCQueue::~SPSCQueue() {
    delete[] buffer_;
}

bool SPSCQueue::try_push(Event event) {
    uint64_t t = tail_.load(std::memory_order_relaxed);
    uint64_t h = head_.load(std::memory_order_acquire);
    if (t - h >= cap_) {
        return false;
    }
    buffer_[t & mask_] = std::move(event);
    tail_.store(t + 1, std::memory_order_release);
    return true;
}

std::optional<Event> SPSCQueue::try_pop() {
    uint64_t h = head_.load(std::memory_order_relaxed);
    uint64_t t = tail_.load(std::memory_order_acquire);
    if (h >= t) {
        return std::nullopt;
    }
    Event e = std::move(buffer_[h & mask_]);
    head_.store(h + 1, std::memory_order_release);
    return e;
}

bool SPSCQueue::empty() const {
    return head_.load(std::memory_order_acquire) ==
           tail_.load(std::memory_order_acquire);
}

size_t SPSCQueue::size_approx() const {
    uint64_t h = head_.load(std::memory_order_acquire);
    uint64_t t = tail_.load(std::memory_order_acquire);
    return t >= h ? static_cast<size_t>(t - h) : 0;
}

} // namespace pulse