#pragma once
#include "pulse/core/event.hpp"
#include <vector>
#include <algorithm>
#include <functional>
#include <stdexcept>
#include <cstddef>

namespace pulse {

/// A movable container that groups multiple Events for batch processing.
///
/// Supports iteration, sorting, filtering, slicing, and bulk take
/// operations.  All accessors perform bounds-checking and throw
/// std::out_of_range on invalid indices.
class EventBatch {
public:
    using iterator       = std::vector<Event>::iterator;
    using const_iterator = std::vector<Event>::const_iterator;

    /// Construct an empty batch.
    EventBatch() = default;

    /// Construct an empty batch with reserved capacity.
    explicit EventBatch(size_t reserve_count) {
        events_.reserve(reserve_count);
    }

    // ── element access ──────────────────────────────────────────────

    /// Append a single event.
    void add(Event event) {
        events_.push_back(std::move(event));
    }

    /// Append a vector of events (moved in).
    void add_all(std::vector<Event> events) {
        events_.reserve(events_.size() + events.size());
        for (auto& e : events) {
            events_.push_back(std::move(e));
        }
    }

    /// Number of events currently held.
    size_t size() const { return events_.size(); }

    /// True when the batch contains no events.
    bool empty() const { return events_.empty(); }

    /// Const reference by index (bounds-checked).
    const Event& at(size_t idx) const {
        if (idx >= events_.size()) {
            throw std::out_of_range(
                "EventBatch::at — index " + std::to_string(idx)
                + " out of range (size " + std::to_string(events_.size()) + ")");
        }
        return events_[idx];
    }

    /// Const reference by index (bounds-checked, same as at).
    const Event& operator[](size_t idx) const {
        return at(idx);
    }

    // ── destructive access ──────────────────────────────────────────

    /// Move the event at `idx` out of the batch and erase that slot.
    /// @throws std::out_of_range if idx >= size().
    Event take(size_t idx) {
        if (idx >= events_.size()) {
            throw std::out_of_range(
                "EventBatch::take — index " + std::to_string(idx)
                + " out of range (size " + std::to_string(events_.size()) + ")");
        }
        Event taken = std::move(events_[idx]);
        events_.erase(events_.begin() + static_cast<std::ptrdiff_t>(idx));
        return taken;
    }

    /// Move all events out and leave the batch empty.
    std::vector<Event> take_all() {
        std::vector<Event> out;
        out.swap(events_);
        return out;
    }

    /// Remove all events.
    void clear() {
        events_.clear();
    }

    // ── ordering / filtering ────────────────────────────────────────

    /// Sort events by ascending timestamp.
    void sort_by_timestamp() {
        std::sort(events_.begin(), events_.end(),
                  [](const Event& a, const Event& b) {
                      return a.timestamp() < b.timestamp();
                  });
    }

    /// Keep only the events for which `pred` returns true.
    void filter(std::function<bool(const Event&)> pred) {
        auto it = std::remove_if(events_.begin(), events_.end(),
                                 [&pred](const Event& e) { return !pred(e); });
        events_.erase(it, events_.end());
    }

    /// Return a new batch that is a copy of `count` events starting at
    /// `start`.  If start + count exceeds size(), the slice is shorter.
    EventBatch slice(size_t start, size_t count) const {
        EventBatch result;
        if (start >= events_.size()) {
            return result;
        }
        size_t end = start + count;
        if (end > events_.size()) {
            end = events_.size();
        }
        result.events_.reserve(end - start);
        for (size_t i = start; i < end; ++i) {
            result.events_.push_back(events_[i].clone());
        }
        return result;
    }

    // ── size estimation ─────────────────────────────────────────────

    /// Sum of estimated_size() for every event in the batch.
    size_t estimated_bytes() const {
        size_t total = 0;
        for (const auto& e : events_) {
            total += e.estimated_size();
        }
        return total;
    }

    // ── iteration ───────────────────────────────────────────────────

    iterator       begin()       { return events_.begin(); }
    iterator       end()         { return events_.end();   }
    const_iterator begin() const { return events_.begin(); }
    const_iterator end()   const { return events_.end();   }

private:
    std::vector<Event> events_;
};

} // namespace pulse