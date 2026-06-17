#pragma once
#include "pulse/core/types.hpp"
#include <algorithm>
#include <cstdint>

namespace pulse {

/// Token-bucket rate limiter.
///
/// Tokens are refilled at a fixed rate (tokens_per_ms) up to a maximum burst
/// capacity.  Each call to try_acquire() consumes the requested number of
/// tokens if available, otherwise the request is rejected.
class RateLimiter {
public:
    /// Construct a rate limiter.
    /// @param tokens_per_ms  refill rate (tokens added per millisecond)
    /// @param max_burst      maximum tokens the bucket can hold
    RateLimiter(double tokens_per_ms, double max_burst)
        : rate_(tokens_per_ms)
        , max_burst_(max_burst)
        , tokens_(max_burst)
        , last_refill_(0)
        , total_acquired_(0)
        , total_rejected_(0)
    {}

    /// Try to consume @p tokens from the bucket.
    /// Refills the bucket based on time elapsed since the last refill,
    /// then attempts to consume the requested amount.
    /// @return true if the tokens were consumed, false if rejected.
    bool try_acquire(Timestamp now, double tokens = 1.0) {
        refill(now);
        if (tokens_ >= tokens) {
            tokens_ -= tokens;
            ++total_acquired_;
            return true;
        }
        ++total_rejected_;
        return false;
    }

    /// Current number of available tokens.
    double available_tokens() const { return tokens_; }

    /// Maximum burst capacity.
    double max_burst() const { return max_burst_; }

    /// Refill rate (tokens per millisecond).
    double rate() const { return rate_; }

    /// Total number of successfully acquired requests.
    uint64_t total_acquired() const { return total_acquired_; }

    /// Total number of rejected requests.
    uint64_t total_rejected() const { return total_rejected_; }

    /// Reset the limiter to its initial state (full bucket).
    void reset() {
        tokens_         = max_burst_;
        last_refill_    = 0;
        total_acquired_ = 0;
        total_rejected_ = 0;
    }

private:
    /// Refill tokens based on elapsed time since last refill.
    void refill(Timestamp now) {
        if (now > last_refill_) {
            double elapsed = static_cast<double>(now - last_refill_);
            tokens_ = std::min(max_burst_, tokens_ + elapsed * rate_);
        }
        last_refill_ = now;
    }

    double   rate_;
    double   max_burst_;
    double   tokens_;
    Timestamp last_refill_;
    uint64_t total_acquired_;
    uint64_t total_rejected_;
};

} // namespace pulse
