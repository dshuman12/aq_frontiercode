#pragma once
#include <vector>
#include <cstdint>
#include <cstddef>
#include <cmath>
#include <stdexcept>
#include <algorithm>
#include <numeric>

namespace pulse {

/// Fixed-bucket histogram for tracking the distribution of values
/// within a specified range [min_value, max_value).
///
/// The range is divided into equal-width buckets. Values falling
/// outside the range are tracked separately as underflow (below min)
/// or overflow (at or above max). Percentile estimation and mean
/// computation use linear interpolation within bucket boundaries.
///
/// Example usage:
///   Histogram h(0.0, 100.0, 10);   // 10 buckets, each width 10
///   h.record(5.5);                   // goes to bucket 0
///   h.record(99.9);                  // goes to bucket 9
///   h.record(100.0);                 // overflow
///   h.record(-1.0);                  // underflow
///   double p50 = h.percentile(0.5);  // estimated median
///
class Histogram {
public:
    /// Construct a fixed-bucket histogram.
    ///
    /// @param min_value  Lower bound of the histogram range (inclusive).
    /// @param max_value  Upper bound of the histogram range (exclusive for record).
    /// @param bucket_count  Number of equal-width buckets to divide the range into.
    ///
    /// @throws std::invalid_argument if bucket_count is 0 or min_value > max_value.
    Histogram(double min_value, double max_value, size_t bucket_count);

    /// Record a single observed value into the histogram.
    ///
    /// Values in [min_value, max_value) are placed into the appropriate bucket.
    /// Values below min_value increment the underflow counter.
    /// Values at or above max_value increment the overflow counter.
    /// When min_value == max_value (degenerate range), values exactly equal
    /// to that point are placed in bucket 0; all others go to under/overflow.
    void record(double value);

    /// Return the total number of values recorded, including overflow and underflow.
    uint64_t count() const;

    /// Return the count of values in the bucket at the given index.
    ///
    /// @param idx  Zero-based bucket index, must be in [0, num_buckets()).
    /// @throws std::out_of_range if idx >= num_buckets().
    uint64_t bucket_count(size_t idx) const;

    /// Determine which bucket index a value would fall into.
    ///
    /// For values below min, returns 0.
    /// For values at or above max, returns num_buckets() - 1.
    /// Does not modify the histogram.
    size_t bucket_for(double value) const;

    /// Return the lower bound (inclusive) of the bucket at the given index.
    ///
    /// @param idx  Zero-based bucket index, must be in [0, num_buckets()).
    /// @throws std::out_of_range if idx >= num_buckets().
    double bucket_lower(size_t idx) const;

    /// Return the upper bound of the bucket at the given index.
    ///
    /// For the last bucket, this equals max_value().
    /// For other buckets, upper = lower + bucket_width.
    ///
    /// @param idx  Zero-based bucket index, must be in [0, num_buckets()).
    /// @throws std::out_of_range if idx >= num_buckets().
    double bucket_upper(size_t idx) const;

    /// Return the number of buckets (not counting overflow/underflow).
    size_t num_buckets() const;

    /// Return the configured lower bound of the histogram range.
    double min_value() const;

    /// Return the configured upper bound of the histogram range.
    double max_value() const;

    /// Return the number of values recorded that were >= max_value.
    uint64_t overflow_count() const;

    /// Return the number of values recorded that were < min_value.
    uint64_t underflow_count() const;

    /// Estimate the p-th percentile from the histogram distribution.
    ///
    /// Uses linear interpolation within bucket boundaries. The percentile
    /// value p must be in [0.0, 1.0]. At p=0.0 returns min_value, at p=1.0
    /// returns max_value. Underflow and overflow counts are included in the
    /// cumulative distribution.
    ///
    /// @param p  Percentile as a fraction in [0.0, 1.0].
    /// @return   Estimated value at the given percentile.
    double percentile(double p) const;

    /// Merge another histogram into this one.
    ///
    /// The other histogram must have identical configuration (same min, max,
    /// and bucket count). Bucket counts, overflow, underflow, and total count
    /// are summed element-wise.
    ///
    /// @param other  The histogram to merge from.
    /// @throws std::invalid_argument if configurations do not match.
    void merge(const Histogram& other);

    /// Reset all counters to zero. Configuration is preserved.
    void reset();

    /// Return true if no values have been recorded (count() == 0).
    bool empty() const;

    /// Estimate the arithmetic mean from bucket midpoints.
    ///
    /// Each bucket's contribution is its midpoint times its count.
    /// Underflow values are estimated at min_value, overflow at max_value.
    /// Returns 0.0 if the histogram is empty.
    double mean() const;

private:
    double min_;                       ///< Lower bound of histogram range
    double max_;                       ///< Upper bound of histogram range
    size_t num_buckets_;               ///< Number of buckets
    double bucket_width_;              ///< Width of each bucket
    std::vector<uint64_t> buckets_;    ///< Per-bucket value counts
    uint64_t overflow_;                ///< Count of values >= max
    uint64_t underflow_;               ///< Count of values < min
    uint64_t total_count_;             ///< Total recorded values
};

} // namespace pulse
