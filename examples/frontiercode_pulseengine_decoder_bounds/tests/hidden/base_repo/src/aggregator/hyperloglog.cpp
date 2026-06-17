#include "pulse/aggregator/hyperloglog.hpp"
#include <algorithm>
#include <cstring>
#include <stdexcept>

namespace pulse {

HyperLogLog::HyperLogLog(uint8_t precision) : p_(precision) {
    if (p_ < 4 || p_ > 18) {
        throw std::invalid_argument("HyperLogLog precision must be in [4, 18]");
    }
    m_ = 1u << p_;
    registers_.resize(m_, 0);
}

uint64_t HyperLogLog::murmur_hash64(const void* key, size_t len, uint64_t seed) {
    const uint64_t m = 0xc6a4a7935bd1e995ULL;
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
        case 7: h ^= uint64_t(data[6]) << 48; [[fallthrough]];
        case 6: h ^= uint64_t(data[5]) << 40; [[fallthrough]];
        case 5: h ^= uint64_t(data[4]) << 32; [[fallthrough]];
        case 4: h ^= uint64_t(data[3]) << 24; [[fallthrough]];
        case 3: h ^= uint64_t(data[2]) << 16; [[fallthrough]];
        case 2: h ^= uint64_t(data[1]) << 8;  [[fallthrough]];
        case 1: h ^= uint64_t(data[0]);
                h *= m;
    }

    h ^= h >> r;
    h *= m;
    h ^= h >> r;
    return h;
}

uint8_t HyperLogLog::leading_zeros_after(uint64_t hash, uint8_t prefix_bits) {
    uint64_t remaining = hash << prefix_bits;
    if (remaining == 0) return 64 - prefix_bits;
    uint8_t count = 0;
    while ((remaining & (1ULL << 63)) == 0) {
        count++;
        remaining <<= 1;
    }
    return count;
}

double HyperLogLog::alpha() const {
    switch (m_) {
        case 16:  return 0.673;
        case 32:  return 0.697;
        case 64:  return 0.709;
        default:  return 0.7213 / (1.0 + 1.079 / m_);
    }
}

void HyperLogLog::add(const std::string& value) {
    uint64_t h = murmur_hash64(value.data(), value.size(), 0x5A17);
    add_hash(h);
}

void HyperLogLog::add_hash(uint64_t hash) {
    uint64_t idx = hash >> (64 - p_);
    uint8_t rank = leading_zeros_after(hash, p_) + 1;
    if (rank > registers_[idx]) {
        registers_[idx] = rank;
    }
    has_data_ = true;
}

double HyperLogLog::estimate() const {
    double sum = 0.0;
    size_t zeros = 0;
    for (size_t i = 0; i < m_; i++) {
        sum += 1.0 / (1ULL << registers_[i]);
        if (registers_[i] == 0) zeros++;
    }

    double raw = alpha() * m_ * m_ / sum;

    if (raw <= 2.5 * m_ && zeros > 0) {
        raw = m_ * std::log(static_cast<double>(m_) / zeros);
    }

    return raw;
}

void HyperLogLog::merge(const HyperLogLog& other) {
    if (p_ != other.p_) {
        throw std::invalid_argument("Cannot merge HyperLogLogs with different precision");
    }
    for (size_t i = 0; i < m_; i++) {
        registers_[i] = std::max(registers_[i], other.registers_[i]);
    }
}

void HyperLogLog::reset() {
    std::fill(registers_.begin(), registers_.end(), 0);
    has_data_ = false;
}

bool HyperLogLog::empty() const {
    return !has_data_;
}

} // namespace pulse