#pragma once
#include <cstddef>
#include <cstdint>

namespace pulse {

/// Strategy applied when backpressure is active.
enum class BackpressureStrategy {
    Drop,    ///< Reject incoming items immediately.
    Block,   ///< Signal the caller to block (reject at controller level).
    Sample   ///< Accept every Nth item while pressured.
};

/// Backpressure controller with hysteresis.
///
/// Monitors a queue size against high/low watermarks.  Once the queue exceeds
/// the high watermark the controller enters a "pressured" state and begins
/// applying the configured strategy.  It remains pressured until the queue
/// drops below the low watermark (hysteresis prevents oscillation).
class BackpressureController {
public:
    /// Construct a backpressure controller.
    /// @param high_watermark  queue size at which pressure activates
    /// @param low_watermark   queue size at which pressure deactivates
    /// @param strategy        how to handle items while pressured
    BackpressureController(size_t high_watermark,
                           size_t low_watermark,
                           BackpressureStrategy strategy = BackpressureStrategy::Drop)
        : high_watermark_(high_watermark)
        , low_watermark_(low_watermark)
        , strategy_(strategy)
        , pressured_(false)
        , accepted_(0)
        , rejected_(0)
        , sample_counter_(0)
        , sample_interval_(4)
    {}

    /// Decide whether the current item should be accepted.
    /// Must be called after update() with the current queue size.
    bool should_accept(size_t current_queue_size) const {
        if (!pressured_ && current_queue_size <= high_watermark_) {
            return true; // not pressured, accept
        }
        if (!pressured_) {
            // Above high watermark but not yet flagged (const view)
            return false;
        }
        // Currently pressured — apply strategy
        switch (strategy_) {
            case BackpressureStrategy::Drop:
                return false;
            case BackpressureStrategy::Block:
                return false;
            case BackpressureStrategy::Sample:
                return (sample_counter_ % sample_interval_) == 0;
        }
        return false; // unreachable
    }

    /// Returns true when the controller is in pressured state.
    bool is_pressured() const { return pressured_; }

    /// Update internal state with the current queue size.
    /// Transitions into/out of pressured state based on watermarks.
    /// Also counts accepted/rejected decisions.
    void update(size_t current_queue_size) {
        // Hysteresis logic
        if (!pressured_ && current_queue_size > high_watermark_) {
            pressured_ = true;
            sample_counter_ = 0;
        } else if (pressured_ && current_queue_size < low_watermark_) {
            pressured_ = false;
        }

        // Count decision
        if (!pressured_) {
            ++accepted_;
        } else {
            switch (strategy_) {
                case BackpressureStrategy::Drop:
                case BackpressureStrategy::Block:
                    ++rejected_;
                    break;
                case BackpressureStrategy::Sample:
                    if ((sample_counter_ % sample_interval_) == 0) {
                        ++accepted_;
                    } else {
                        ++rejected_;
                    }
                    ++sample_counter_;
                    break;
            }
        }
    }

    /// Total number of accepted items.
    uint64_t accepted() const { return accepted_; }

    /// Total number of rejected items.
    uint64_t rejected() const { return rejected_; }

    /// Acceptance rate as a ratio in [0, 1].
    /// Returns 1.0 when no decisions have been made.
    double acceptance_rate() const {
        uint64_t total = accepted_ + rejected_;
        if (total == 0) return 1.0;
        return static_cast<double>(accepted_) / static_cast<double>(total);
    }

    /// High watermark threshold.
    size_t high_watermark() const { return high_watermark_; }

    /// Low watermark threshold.
    size_t low_watermark() const { return low_watermark_; }

    /// Current strategy.
    BackpressureStrategy strategy() const { return strategy_; }

    /// Reset all state and counters.
    void reset() {
        pressured_      = false;
        accepted_       = 0;
        rejected_       = 0;
        sample_counter_ = 0;
    }

private:
    size_t               high_watermark_;
    size_t               low_watermark_;
    BackpressureStrategy strategy_;
    bool                 pressured_;
    uint64_t             accepted_;
    uint64_t             rejected_;
    uint64_t             sample_counter_;
    uint64_t             sample_interval_;
};

} // namespace pulse
