#pragma once
#include <cstdint>
#include <cmath>
#include <algorithm>

namespace pulse {

/// Retry policy with exponential backoff for flow operations.
class RetryPolicy {
public:
    /// Construct a retry policy.
    /// @param max_retries  Maximum number of retry attempts.
    /// @param initial_delay_ms  Delay in ms before the first retry.
    /// @param multiplier  Backoff multiplier applied per attempt.
    /// @param max_delay_ms  Upper cap on delay in ms.
    RetryPolicy(uint32_t max_retries,
                uint64_t initial_delay_ms,
                double multiplier = 2.0,
                uint64_t max_delay_ms = 60000)
        : max_retries_(max_retries)
        , initial_delay_ms_(initial_delay_ms)
        , multiplier_(multiplier)
        , max_delay_ms_(max_delay_ms) {}

    /// Calculate the delay for the given attempt number (0-based).
    /// Formula: initial_delay_ms * multiplier^attempt, capped at max_delay_ms.
    uint64_t next_delay(uint32_t attempt) const {
        double raw = static_cast<double>(initial_delay_ms_) *
                     std::pow(multiplier_, static_cast<double>(attempt));
        uint64_t delay = static_cast<uint64_t>(raw);
        return std::min(delay, max_delay_ms_);
    }

    /// Returns true if the attempt number is within the retry budget.
    bool should_retry(uint32_t attempt) const {
        return attempt < max_retries_;
    }

    /// Maximum number of retries allowed.
    uint32_t max_retries() const { return max_retries_; }

    /// Initial delay in milliseconds before the first retry.
    uint64_t initial_delay_ms() const { return initial_delay_ms_; }

    /// Backoff multiplier applied between consecutive attempts.
    double multiplier() const { return multiplier_; }

    /// Maximum delay cap in milliseconds.
    uint64_t max_delay_ms() const { return max_delay_ms_; }

    // ── Static factory methods ──────────────────────────────────────────

    /// No retries at all.
    static RetryPolicy none() {
        return RetryPolicy(0, 0, 1.0, 0);
    }

    /// Fixed delay between retries (no exponential backoff).
    /// multiplier = 1.0 so every retry waits the same amount.
    static RetryPolicy fixed(uint32_t retries, uint64_t delay_ms) {
        return RetryPolicy(retries, delay_ms, 1.0, delay_ms);
    }

    /// Exponential backoff with default multiplier (2.0).
    static RetryPolicy exponential(uint32_t retries, uint64_t initial_ms) {
        return RetryPolicy(retries, initial_ms, 2.0, 60000);
    }

private:
    uint32_t max_retries_;
    uint64_t initial_delay_ms_;
    double   multiplier_;
    uint64_t max_delay_ms_;
};

} // namespace pulse
