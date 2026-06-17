#pragma once
#include <vector>
#include <string>
#include <cstdint>
#include <cmath>
#include <algorithm>
#include <array>
#include <stdexcept>

namespace pulse {

// ---------------------------------------------------------------------------
// Non-template helpers – implemented in bloom_filter.cpp so the template
// instantiations in user TUs can link against them.
// ---------------------------------------------------------------------------
namespace detail {

uint64_t bloom_murmur_hash64(const void* key, size_t len, uint64_t seed);
size_t   bloom_optimal_bit_count(size_t capacity, double fpr);
size_t   bloom_count_set_bits(const uint8_t* data, size_t byte_count);
double   bloom_estimate_item_count(size_t bits_set, size_t total_bits,
                                   size_t hash_count);

} // namespace detail

// ---------------------------------------------------------------------------
// BloomFilter – probabilistic set-membership data structure.
//
// Template parameter HashCount controls the number of independent hash
// functions (each using MurmurHash64 with a distinct seed).
// ---------------------------------------------------------------------------
template <size_t HashCount = 5>
class BloomFilter {
    static_assert(HashCount > 0,
                  "BloomFilter requires at least one hash function");

public:
    // -----------------------------------------------------------------------
    // Construction
    // -----------------------------------------------------------------------
    explicit BloomFilter(size_t expected_capacity, double target_fpr = 0.01)
        : num_bits_(0)
        , item_count_(0)
        , expected_capacity_(expected_capacity)
        , target_fpr_(target_fpr)
    {
        if (expected_capacity == 0) {
            throw std::invalid_argument(
                "BloomFilter: expected capacity must be greater than zero");
        }
        if (target_fpr <= 0.0 || target_fpr >= 1.0) {
            throw std::invalid_argument(
                "BloomFilter: false positive rate must be in range (0, 1)");
        }
        num_bits_ = detail::bloom_optimal_bit_count(expected_capacity,
                                                    target_fpr);
        // Align to whole bytes.
        size_t byte_count = (num_bits_ + 7) / 8;
        num_bits_ = byte_count * 8;
        bits_.resize(byte_count, 0);
    }

    // -----------------------------------------------------------------------
    // Core API
    // -----------------------------------------------------------------------
    void add(const std::string& item) {
        auto positions = compute_positions(item);
        for (size_t i = 0; i < HashCount; ++i) {
            set_bit(positions[i]);
        }
        ++item_count_;
    }

    bool might_contain(const std::string& item) const {
        auto positions = compute_positions(item);
        for (size_t i = 0; i < HashCount; ++i) {
            if (!get_bit(positions[i])) {
                return false;
            }
        }
        return true;
    }

    void clear() {
        std::fill(bits_.begin(), bits_.end(), static_cast<uint8_t>(0));
        item_count_ = 0;
    }

    // -----------------------------------------------------------------------
    // Accessors
    // -----------------------------------------------------------------------
    size_t size()     const { return item_count_; }
    size_t capacity() const { return expected_capacity_; }
    size_t bit_count() const { return num_bits_; }

    double false_positive_rate() const { return target_fpr_; }

    static constexpr size_t hash_count() { return HashCount; }

    // -----------------------------------------------------------------------
    // Statistics
    // -----------------------------------------------------------------------
    size_t bits_set() const {
        return detail::bloom_count_set_bits(bits_.data(), bits_.size());
    }

    double estimated_count() const {
        size_t set = bits_set();
        if (set == 0) {
            return 0.0;
        }
        return detail::bloom_estimate_item_count(set, num_bits_, HashCount);
    }

    // -----------------------------------------------------------------------
    // Merge (set union)
    // -----------------------------------------------------------------------
    void merge(const BloomFilter& other) {
        if (num_bits_ != other.num_bits_) {
            throw std::invalid_argument(
                "BloomFilter::merge: filters must have identical bit counts");
        }
        for (size_t i = 0; i < bits_.size(); ++i) {
            bits_[i] |= other.bits_[i];
        }
        item_count_ += other.item_count_;
    }

    // Raw access (e.g. for serialisation).
    const std::vector<uint8_t>& raw_bits() const { return bits_; }

private:
    // -----------------------------------------------------------------------
    // Bit manipulation
    // -----------------------------------------------------------------------
    void set_bit(size_t position) {
        size_t byte_idx = position / 8;
        uint8_t mask    = static_cast<uint8_t>(1u << (position % 8));
        bits_[byte_idx] |= mask;
    }

    bool get_bit(size_t position) const {
        size_t byte_idx = position / 8;
        uint8_t mask    = static_cast<uint8_t>(1u << (position % 8));
        return (bits_[byte_idx] & mask) != 0;
    }

    // -----------------------------------------------------------------------
    // Hash position computation – MurmurHash64 with a unique seed per slot,
    // derived from the golden-ratio constant for good dispersion.
    // -----------------------------------------------------------------------
    std::array<size_t, HashCount>
    compute_positions(const std::string& item) const {
        std::array<size_t, HashCount> positions;
        for (size_t i = 0; i < HashCount; ++i) {
            // Each hash function uses a distinct seed.
            uint64_t seed = 0x5A17ULL + i * 0x9E3779B97F4A7C15ULL;
            uint64_t hash = detail::bloom_murmur_hash64(
                item.data(), item.size(), seed);
            positions[i] = static_cast<size_t>(hash % num_bits_);
        }
        return positions;
    }

    // -----------------------------------------------------------------------
    // Data members
    // -----------------------------------------------------------------------
    std::vector<uint8_t> bits_;
    size_t num_bits_;
    size_t item_count_;
    size_t expected_capacity_;
    double target_fpr_;
};

} // namespace pulse
