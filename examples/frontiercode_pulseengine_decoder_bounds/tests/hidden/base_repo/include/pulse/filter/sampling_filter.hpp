#pragma once
#include <string>
#include <cstdint>
#include <cstddef>
#include <functional>
#include <stdexcept>

namespace pulse {

// ---------------------------------------------------------------------------
// SamplingFilter — deterministic sampling filter (header-only).
//
// Supports two modes:
//   1. Counter-based:  should_sample() uses an internal counter and modulo
//      arithmetic to deterministically select events at the configured rate.
//   2. Key-based:      should_sample(key) uses a hash of the key to decide,
//      providing consistent sampling (same key always sampled or not).
// ---------------------------------------------------------------------------
class SamplingFilter {
public:
    /// Construct a SamplingFilter.
    /// @param sample_rate  Fraction of events to sample, in (0.0, 1.0].
    explicit SamplingFilter(double sample_rate)
        : sample_rate_(sample_rate) {
        if (sample_rate_ <= 0.0 || sample_rate_ > 1.0) {
            throw std::invalid_argument(
                "SamplingFilter: sample_rate must be in (0.0, 1.0]");
        }
        // Pre-compute the modulo denominator from the rate.
        // E.g. rate 0.25 → period 4 → sample every 4th event.
        // rate 1.0 → period 1 → sample everything.
        period_ = static_cast<uint64_t>(1.0 / sample_rate_);
        if (period_ == 0) period_ = 1;
    }

    /// Counter-based deterministic sampling.
    /// Returns true for roughly sample_rate fraction of calls.
    bool should_sample() {
        total_count_++;
        // Sample when counter aligns with period boundary.
        // Using (counter - 1) so the very first event is always sampled.
        if ((total_count_ - 1) % period_ == 0) {
            sampled_count_++;
            return true;
        }
        return false;
    }

    /// Key-based consistent sampling using a hash function.
    /// The same key will always produce the same result for a given rate.
    bool should_sample(const std::string& key) {
        total_count_++;
        uint64_t h = hash_key(key);
        // Map hash into [0, period_) and sample if it falls in the first slot.
        if ((h % period_) == 0) {
            sampled_count_++;
            return true;
        }
        return false;
    }

    // --- Accessors ---
    double sample_rate() const { return sample_rate_; }
    uint64_t period() const { return period_; }

    // --- Stats ---
    uint64_t sampled_count() const { return sampled_count_; }
    uint64_t total_count() const { return total_count_; }

    /// Actual observed sampling ratio.
    double actual_rate() const {
        if (total_count_ == 0) return 0.0;
        return static_cast<double>(sampled_count_)
             / static_cast<double>(total_count_);
    }

    /// Reset all counters.
    void reset() {
        total_count_ = 0;
        sampled_count_ = 0;
    }

private:
    /// FNV-1a hash for strings — fast, well-distributed, deterministic.
    static uint64_t hash_key(const std::string& key) {
        uint64_t hash = 14695981039346656037ULL;  // FNV offset basis
        for (unsigned char c : key) {
            hash ^= static_cast<uint64_t>(c);
            hash *= 1099511628211ULL;              // FNV prime
        }
        return hash;
    }

    double   sample_rate_;
    uint64_t period_;
    uint64_t sampled_count_ = 0;
    uint64_t total_count_   = 0;
};

} // namespace pulse
