#pragma once
#include "pulse/core/types.hpp"
#include <cstdint>
#include <stdexcept>

namespace pulse {

/// Streaming Exponential Moving Average calculator.
///
/// EMA is computed as:
///   first sample  → EMA = value
///   subsequent    → EMA = alpha * value + (1 - alpha) * prev_EMA
///
/// The smoothing factor `alpha` must be in (0, 1].
/// A higher alpha gives more weight to recent observations.
class ExponentialMovingAverage {
public:
    /// Construct with an explicit smoothing factor.
    /// @throws PulseError if alpha is not in (0, 1].
    explicit ExponentialMovingAverage(double alpha)
        : alpha_(alpha)
    {
        if (alpha_ <= 0.0 || alpha_ > 1.0) {
            throw PulseError(
                ErrorCode::InvalidArgument,
                "ExponentialMovingAverage: alpha must be in (0, 1], got "
                    + std::to_string(alpha_));
        }
    }

    /// Factory: create an EMA whose alpha equals 2 / (span + 1).
    /// This matches the pandas / financial convention for span-based EMA.
    /// @throws PulseError if span == 0 (would produce alpha > 1).
    static ExponentialMovingAverage with_span(uint64_t span) {
        if (span == 0) {
            throw PulseError(
                ErrorCode::InvalidArgument,
                "ExponentialMovingAverage::with_span: span must be >= 1");
        }
        double a = 2.0 / (static_cast<double>(span) + 1.0);
        return ExponentialMovingAverage(a);
    }

    /// Feed a new observation into the EMA.
    void add(double value) {
        if (count_ == 0) {
            ema_ = value;
        } else {
            ema_ = alpha_ * value + (1.0 - alpha_) * ema_;
        }
        ++count_;
    }

    /// Current EMA value.
    /// Returns 0.0 when no observations have been added.
    double value() const {
        if (count_ == 0) {
            return 0.0;
        }
        return ema_;
    }

    /// Number of observations fed so far.
    uint64_t count() const { return count_; }

    /// True when no observations have been added.
    bool empty() const { return count_ == 0; }

    /// Smoothing factor.
    double alpha() const { return alpha_; }

    /// Reset to initial (empty) state, keeping the same alpha.
    void reset() {
        ema_   = 0.0;
        count_ = 0;
    }

private:
    double   alpha_;
    double   ema_   = 0.0;
    uint64_t count_ = 0;
};

} // namespace pulse