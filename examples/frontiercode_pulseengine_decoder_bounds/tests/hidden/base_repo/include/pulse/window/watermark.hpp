#pragma once
#include "pulse/core/types.hpp"
#include <cstdint>
#include <algorithm>

namespace pulse {

/// WatermarkTracker tracks event-time watermarks for out-of-order handling.
///
/// The watermark represents the point in event-time up to which the system
/// believes all events have arrived. Events arriving with timestamps below
/// the watermark are considered "late."
///
/// Formula:  watermark = max_observed - max_out_of_order_ms
///
/// With max_out_of_order_ms = 0, any event with a timestamp strictly below
/// the maximum observed timestamp is immediately considered late.
/// With a positive tolerance, events arriving within that window of the
/// maximum are still accepted as on-time.
class WatermarkTracker {
public:
    /// Construct a watermark tracker.
    /// @param max_out_of_order_ms Maximum allowed out-of-orderness in milliseconds.
    ///        A value of 0 means no tolerance for late events.
    explicit WatermarkTracker(uint64_t max_out_of_order_ms = 0)
        : max_out_of_order_ms_(max_out_of_order_ms)
        , max_observed_(0)
        , late_count_(0)
        , total_observed_(0)
    {
    }

    /// Observe an event timestamp, updating the watermark.
    /// If the event timestamp falls below the current watermark after
    /// updating the maximum, the late counter is incremented.
    void observe(Timestamp event_time) {
        total_observed_++;

        // Update the maximum observed timestamp
        if (event_time > max_observed_) {
            max_observed_ = event_time;
        }

        // Check if this event is late relative to the (now updated) watermark
        if (is_late(event_time)) {
            late_count_++;
        }
    }

    /// Current watermark = max_observed - max_out_of_order_ms.
    /// Returns 0 if max_observed <= max_out_of_order_ms (underflow protection).
    Timestamp watermark() const {
        if (max_observed_ <= max_out_of_order_ms_) {
            return 0;
        }
        return max_observed_ - max_out_of_order_ms_;
    }

    /// The maximum event timestamp observed so far.
    Timestamp max_observed() const {
        return max_observed_;
    }

    /// Returns true if event_time falls strictly below the current watermark.
    /// Always returns false if no events have been observed yet.
    bool is_late(Timestamp event_time) const {
        if (total_observed_ == 0) {
            return false;
        }
        return event_time < watermark();
    }

    /// Number of events that were observed as late.
    uint64_t late_count() const {
        return late_count_;
    }

    /// Total number of events observed (both on-time and late).
    uint64_t total_observed() const {
        return total_observed_;
    }

    /// Reset all tracking state to initial values.
    void reset() {
        max_observed_ = 0;
        late_count_ = 0;
        total_observed_ = 0;
    }

private:
    uint64_t max_out_of_order_ms_;
    Timestamp max_observed_;
    uint64_t late_count_;
    uint64_t total_observed_;
};

} // namespace pulse
