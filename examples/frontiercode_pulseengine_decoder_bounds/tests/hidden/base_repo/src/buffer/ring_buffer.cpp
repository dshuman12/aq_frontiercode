#include "pulse/buffer/ring_buffer.hpp"
#include <algorithm>

namespace pulse {

RingBuffer::RingBuffer(size_t capacity, OverflowPolicy policy)
    : capacity_(capacity), policy_(policy) {
    if (capacity == 0) {
        throw PulseError(ErrorCode::InvalidArgument, "RingBuffer capacity must be > 0");
    }
    buffer_.resize(capacity);
}

bool RingBuffer::push(Event event) {
    if (count_ == capacity_) {
        switch (policy_) {
            case OverflowPolicy::DropOldest: {
                if (overflow_cb_) overflow_cb_(buffer_[head_]);
                head_ = next(head_);
                count_--;
                stats_.total_dropped++;
                break;
            }
            case OverflowPolicy::DropNewest:
                if (overflow_cb_) overflow_cb_(event);
                stats_.total_dropped++;
                return false;
            case OverflowPolicy::Block:
                return false;
        }
    }
    buffer_[tail_] = std::move(event);
    tail_ = next(tail_);
    count_++;
    stats_.total_pushed++;
    return true;
}

std::optional<Event> RingBuffer::pop() {
    if (count_ == 0) return std::nullopt;
    Event e = std::move(buffer_[head_]);
    head_ = next(head_);
    count_--;
    stats_.total_popped++;
    return e;
}

const Event* RingBuffer::peek() const {
    if (count_ == 0) return nullptr;
    return &buffer_[head_];
}

void RingBuffer::clear() {
    head_ = 0;
    tail_ = 0;
    count_ = 0;
}

double RingBuffer::fill_ratio() const {
    return static_cast<double>(count_) / static_cast<double>(capacity_);
}

std::vector<Event> RingBuffer::drain(size_t max_count) {
    std::vector<Event> out;
    drain_into(out, max_count);
    return out;
}

size_t RingBuffer::drain_into(std::vector<Event>& out, size_t max_count) {
    size_t n = std::min(max_count, count_);
    out.reserve(out.size() + n);
    for (size_t i = 0; i < n; i++) {
        out.push_back(std::move(buffer_[head_]));
        head_ = next(head_);
        count_--;
        stats_.total_popped++;
    }
    return n;
}

void RingBuffer::set_overflow_callback(std::function<void(const Event&)> cb) {
    overflow_cb_ = std::move(cb);
}

} // namespace pulse