#pragma once
#include <vector>
#include <string>
#include <cstdint>
#include <cstddef>
#include <stdexcept>

namespace pulse {

/// CountMinSketch — a probabilistic data structure for frequency estimation.
///
/// Provides approximate counts for items in a stream. Estimates are always
/// greater than or equal to the true count (i.e. never underestimates).
///
/// The accuracy depends on two parameters:
///   - width  (columns): more columns → lower error per estimate
///   - depth  (rows):    more rows    → lower probability of large error
///
/// Error guarantees (with appropriate width/depth):
///   - estimate(key) <= true_count(key) + epsilon * total_count
///     with probability >= 1 - delta
///
/// Use the static factory `with_error_rate(epsilon, delta)` to construct
/// a sketch sized for desired error bounds automatically.
class CountMinSketch {
public:
    /// Construct a sketch with the given number of columns and hash rows.
    /// @param width  Number of columns (buckets per hash function). Must be > 0.
    /// @param depth  Number of rows (independent hash functions). Must be > 0.
    /// @throws std::invalid_argument if width or depth is 0.
    CountMinSketch(size_t width, size_t depth);

    /// Add `count` occurrences of `key` to the sketch.
    /// @param key   The item to record.
    /// @param count Number of occurrences to add (may be negative for deletion).
    void add(const std::string& key, int64_t count = 1);

    /// Return the estimated frequency of `key`.
    /// The estimate is the minimum value across all rows for that key,
    /// which guarantees it never underestimates the true count (for
    /// non-negative streams).
    /// @param key The item to query.
    /// @return Estimated count (minimum across all hash rows).
    int64_t estimate(const std::string& key) const;

    /// Merge another sketch into this one (element-wise addition).
    /// Both sketches must have identical width and depth.
    /// @param other The sketch to merge from.
    /// @throws std::invalid_argument if dimensions do not match.
    void merge(const CountMinSketch& other);

    /// Reset all counters to zero.
    void reset();

    /// @return The number of columns (buckets per row).
    size_t width() const { return width_; }

    /// @return The number of rows (hash functions).
    size_t depth() const { return depth_; }

    /// @return The sum of all counts added so far.
    uint64_t total_count() const { return total_count_; }

    /// @return True if no items have been added since construction or reset.
    bool empty() const { return total_count_ == 0; }

    /// Static factory: construct a sketch sized for the desired error bounds.
    ///
    /// @param epsilon  Desired relative error: estimate <= true + epsilon * N.
    ///                 Must be in (0, 1).
    /// @param delta    Failure probability: P(error > epsilon * N) <= delta.
    ///                 Must be in (0, 1).
    /// @return A CountMinSketch with width = ceil(e / epsilon),
    ///         depth = ceil(ln(1 / delta)).
    /// @throws std::invalid_argument if epsilon or delta is out of range.
    static CountMinSketch with_error_rate(double epsilon, double delta);

private:
    /// MurmurHash64A-style hash with a per-row seed.
    /// @param key  Data to hash.
    /// @param len  Length of data in bytes.
    /// @param seed Per-row seed value.
    /// @return 64-bit hash.
    static uint64_t murmur_hash64(const void* key, size_t len, uint64_t seed);

    size_t width_;                              ///< columns
    size_t depth_;                              ///< rows (hash functions)
    std::vector<std::vector<int64_t>> table_;   ///< depth_ x width_ counters
    std::vector<uint64_t> seeds_;               ///< one seed per row
    uint64_t total_count_ = 0;                  ///< running total of counts
};

} // namespace pulse
