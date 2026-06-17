#pragma once
#include "pulse/core/types.hpp"
#include <cstdint>

namespace pulse {

/// Circuit breaker pattern implementation.
///
/// State machine:
///   Closed ──(failures >= threshold)──► Open
///   Open   ──(timeout elapsed)────────► HalfOpen
///   HalfOpen ──(success_threshold met)► Closed
///   HalfOpen ──(any failure)──────────► Open
class CircuitBreaker {
public:
    /// Possible states of the circuit breaker.
    enum class State { Closed, Open, HalfOpen };

    /// Construct a circuit breaker.
    /// @param failure_threshold   consecutive failures before tripping open
    /// @param recovery_timeout_ms time in ms to wait in Open before HalfOpen
    /// @param success_threshold   consecutive successes in HalfOpen to close
    CircuitBreaker(uint64_t failure_threshold,
                   uint64_t recovery_timeout_ms,
                   uint64_t success_threshold = 1)
        : failure_threshold_(failure_threshold)
        , recovery_timeout_ms_(recovery_timeout_ms)
        , success_threshold_(success_threshold)
        , state_(State::Closed)
        , failure_count_(0)
        , success_count_(0)
        , trip_count_(0)
        , last_failure_time_(0)
    {}

    /// Check whether a request should be allowed through.
    /// In Closed state, always allows.
    /// In Open state, transitions to HalfOpen after the recovery timeout.
    /// In HalfOpen state, allows (caller must record success/failure).
    bool allow(Timestamp now) {
        switch (state_) {
            case State::Closed:
                return true;

            case State::Open:
                if (now - last_failure_time_ >= recovery_timeout_ms_) {
                    state_ = State::HalfOpen;
                    success_count_ = 0;
                    return true;
                }
                return false;

            case State::HalfOpen:
                return true;
        }
        return false; // unreachable
    }

    /// Record a successful operation.
    /// In HalfOpen, counts toward success_threshold to close the circuit.
    void record_success(Timestamp /*now*/) {
        switch (state_) {
            case State::Closed:
                failure_count_ = 0;
                break;

            case State::HalfOpen:
                ++success_count_;
                if (success_count_ >= success_threshold_) {
                    state_ = State::Closed;
                    failure_count_ = 0;
                    success_count_ = 0;
                }
                break;

            case State::Open:
                // Ignored while open.
                break;
        }
    }

    /// Record a failed operation.
    /// In Closed, increments failure count and may trip to Open.
    /// In HalfOpen, immediately trips back to Open.
    void record_failure(Timestamp now) {
        switch (state_) {
            case State::Closed:
                ++failure_count_;
                if (failure_count_ >= failure_threshold_) {
                    trip_open(now);
                }
                break;

            case State::HalfOpen:
                trip_open(now);
                break;

            case State::Open:
                last_failure_time_ = now;
                break;
        }
    }

    /// Current state.
    State state() const { return state_; }

    /// Number of consecutive failures in the current closed period.
    uint64_t failure_count() const { return failure_count_; }

    /// Number of consecutive successes in the current half-open period.
    uint64_t success_count() const { return success_count_; }

    /// Total number of times the circuit has tripped open.
    uint64_t trip_count() const { return trip_count_; }

    /// Reset to the initial Closed state.
    void reset() {
        state_             = State::Closed;
        failure_count_     = 0;
        success_count_     = 0;
        trip_count_        = 0;
        last_failure_time_ = 0;
    }

private:
    /// Transition to the Open state.
    void trip_open(Timestamp now) {
        state_             = State::Open;
        last_failure_time_ = now;
        success_count_     = 0;
        ++trip_count_;
    }

    uint64_t  failure_threshold_;
    uint64_t  recovery_timeout_ms_;
    uint64_t  success_threshold_;
    State     state_;
    uint64_t  failure_count_;
    uint64_t  success_count_;
    uint64_t  trip_count_;
    Timestamp last_failure_time_;
};

} // namespace pulse
