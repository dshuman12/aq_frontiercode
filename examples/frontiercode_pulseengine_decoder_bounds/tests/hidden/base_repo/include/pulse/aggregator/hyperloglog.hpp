#pragma once
#include <vector>
#include <string>
#include <cstdint>
#include <cmath>

namespace pulse {

class HyperLogLog {
public:
    explicit HyperLogLog(uint8_t precision = 14);

    void add(const std::string& value);
    void add_hash(uint64_t hash);
    double estimate() const;
    void merge(const HyperLogLog& other);
    void reset();

    uint8_t precision() const { return p_; }
    size_t register_count() const { return m_; }
    bool empty() const;

private:
    static uint64_t murmur_hash64(const void* key, size_t len, uint64_t seed);
    static uint8_t leading_zeros_after(uint64_t hash, uint8_t prefix_bits);
    double alpha() const;

    uint8_t p_;
    size_t m_;
    std::vector<uint8_t> registers_;
    bool has_data_ = false;
};

} // namespace pulse