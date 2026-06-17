#include "pulse/aggregator/count_min_sketch.hpp"
#include <algorithm>
#include <cmath>
#include <cstring>
#include <limits>

namespace pulse {

CountMinSketch::CountMinSketch(size_t width, size_t depth)
    : width_(width), depth_(depth) {
    if (width_ == 0) {
        throw std::invalid_argument("CountMinSketch width must be > 0");
    }
    if (depth_ == 0) {
        throw std::invalid_argument("CountMinSketch depth must be > 0");
    }

    table_.resize(depth_, std::vector<int64_t>(width_, 0));

    // Generate deterministic seeds for each row using a simple LCG-style
    // derivation so that different rows produce independent hashes.
    seeds_.resize(depth_);
    uint64_t s = 0x9E3779B97F4A7C15ULL; // golden-ratio constant
    for (size_t i = 0; i < depth_; ++i) {
        s ^= (i + 1) * 0x517CC1B727220A95ULL;
        s = (s * 6364136223846793005ULL) + 1442695040888963407ULL;
        seeds_[i] = s;
    }
}

uint64_t CountMinSketch::murmur_hash64(const void* key, size_t len,
                                       uint64_t seed) {
    const uint64_t m = 0xC6A4A7935BD1E995ULL;
    const int r = 47;
    uint64_t h = seed ^ (len * m);

    const uint8_t* data = static_cast<const uint8_t*>(key);
    const uint8_t* end = data + (len / 8) * 8;

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

    h ^= h >> r;
    h *= m;
    h ^= h >> r;
    return h;
}

void CountMinSketch::add(const std::string& key, int64_t count) {
    for (size_t i = 0; i < depth_; ++i) {
        uint64_t h = murmur_hash64(key.data(), key.size(), seeds_[i]);
        size_t col = static_cast<size_t>(h % width_);
        table_[i][col] += count;
    }
    total_count_ += static_cast<uint64_t>(count);
}

int64_t CountMinSketch::estimate(const std::string& key) const {
    int64_t result = std::numeric_limits<int64_t>::max();
    for (size_t i = 0; i < depth_; ++i) {
        uint64_t h = murmur_hash64(key.data(), key.size(), seeds_[i]);
        size_t col = static_cast<size_t>(h % width_);
        result = std::min(result, table_[i][col]);
    }
    return result;
}

void CountMinSketch::merge(const CountMinSketch& other) {
    if (width_ != other.width_ || depth_ != other.depth_) {
        throw std::invalid_argument(
            "Cannot merge CountMinSketches with different dimensions");
    }
    for (size_t i = 0; i < depth_; ++i) {
        for (size_t j = 0; j < width_; ++j) {
            table_[i][j] += other.table_[i][j];
        }
    }
    total_count_ += other.total_count_;
}

void CountMinSketch::reset() {
    for (auto& row : table_) {
        std::fill(row.begin(), row.end(), 0);
    }
    total_count_ = 0;
}

CountMinSketch CountMinSketch::with_error_rate(double epsilon, double delta) {
    if (epsilon <= 0.0 || epsilon >= 1.0) {
        throw std::invalid_argument(
            "CountMinSketch epsilon must be in (0, 1)");
    }
    if (delta <= 0.0 || delta >= 1.0) {
        throw std::invalid_argument(
            "CountMinSketch delta must be in (0, 1)");
    }

    // width  = ceil(e / epsilon)
    // depth  = ceil(ln(1 / delta))
    size_t w = static_cast<size_t>(std::ceil(std::exp(1.0) / epsilon));
    size_t d = static_cast<size_t>(std::ceil(std::log(1.0 / delta)));

    // Ensure at least 1 for both
    if (w == 0) w = 1;
    if (d == 0) d = 1;

    return CountMinSketch(w, d);
}

} // namespace pulse
