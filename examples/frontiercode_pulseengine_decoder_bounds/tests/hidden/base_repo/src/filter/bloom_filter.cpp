#include "pulse/filter/bloom_filter.hpp"
#include <cstring>
#include <cmath>
#include <algorithm>

namespace pulse {
namespace detail {

// ---------------------------------------------------------------------------
// MurmurHash2 64-bit — seeded variant.
//
// Each BloomFilter hash function calls this with a different seed so that
// the k hash positions are independent.
// ---------------------------------------------------------------------------
uint64_t bloom_murmur_hash64(const void* key, size_t len, uint64_t seed) {
    const uint64_t m = 0xc6a4a7935bd1e995ULL;
    const int      r = 47;

    uint64_t h = seed ^ (len * m);

    const uint8_t* data = static_cast<const uint8_t*>(key);
    const uint8_t* end  = data + (len / 8) * 8;

    // Process 8-byte chunks.
    while (data != end) {
        uint64_t k;
        std::memcpy(&k, data, sizeof(k));

        k *= m;
        k ^= k >> r;
        k *= m;

        h ^= k;
        h *= m;

        data += 8;
    }

    // Handle the remaining 0–7 bytes.
    switch (len & 7) {
        case 7: h ^= static_cast<uint64_t>(data[6]) << 48; [[fallthrough]];
        case 6: h ^= static_cast<uint64_t>(data[5]) << 40; [[fallthrough]];
        case 5: h ^= static_cast<uint64_t>(data[4]) << 32; [[fallthrough]];
        case 4: h ^= static_cast<uint64_t>(data[3]) << 24; [[fallthrough]];
        case 3: h ^= static_cast<uint64_t>(data[2]) << 16; [[fallthrough]];
        case 2: h ^= static_cast<uint64_t>(data[1]) << 8;  [[fallthrough]];
        case 1: h ^= static_cast<uint64_t>(data[0]);
                h *= m;
    }

    // Final avalanche mixing.
    h ^= h >> r;
    h *= m;
    h ^= h >> r;

    return h;
}

// ---------------------------------------------------------------------------
// Optimal bit-array size for given capacity and target false-positive rate.
//
//     m = -(n · ln p) / (ln 2)²
//
// A floor of 64 bits is enforced so the filter is never degenerate.
// ---------------------------------------------------------------------------
size_t bloom_optimal_bit_count(size_t capacity, double fpr) {
    const double ln2    = std::log(2.0);
    const double ln2_sq = ln2 * ln2;
    const double n      = static_cast<double>(capacity);
    const double m      = -(n * std::log(fpr)) / ln2_sq;

    size_t bits = static_cast<size_t>(std::ceil(m));
    return std::max(bits, static_cast<size_t>(64));
}

// ---------------------------------------------------------------------------
// Population count over a raw byte array (Brian Kernighan's algorithm).
// ---------------------------------------------------------------------------
size_t bloom_count_set_bits(const uint8_t* data, size_t byte_count) {
    size_t total = 0;

    for (size_t i = 0; i < byte_count; ++i) {
        uint8_t byte = data[i];
        while (byte != 0) {
            byte &= static_cast<uint8_t>(byte - 1);   // clear lowest set bit
            ++total;
        }
    }

    return total;
}

// ---------------------------------------------------------------------------
// Estimate the number of distinct items inserted into the filter from its
// current fill ratio.
//
//     n̂ = -(m / k) · ln(1 − X / m)
//
// where  m = total bits,  k = hash count,  X = bits currently set.
// Returns 0 when the filter is empty.  Clamps when the filter is saturated
// (all bits set) to avoid log(0).
// ---------------------------------------------------------------------------
double bloom_estimate_item_count(size_t bits_set, size_t total_bits,
                                 size_t hash_count) {
    if (bits_set == 0) {
        return 0.0;
    }

    const double m = static_cast<double>(total_bits);
    const double k = static_cast<double>(hash_count);
    const double x = static_cast<double>(bits_set);

    // Guard against log(0) when the filter is completely full.
    if (x >= m) {
        return m;
    }

    const double fill   = x / m;
    const double estimate = -(m / k) * std::log(1.0 - fill);

    return std::max(estimate, 0.0);
}

} // namespace detail
} // namespace pulse
