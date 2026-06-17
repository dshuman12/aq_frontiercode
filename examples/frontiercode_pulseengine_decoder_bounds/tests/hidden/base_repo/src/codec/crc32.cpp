#include "pulse/codec/crc32.hpp"
#include <array>

namespace pulse {

// ==================================================================
//  Lookup-table generation (thread-safe, computed once)
// ==================================================================

const uint32_t* CRC32::table() {
    // C++11 guarantees thread-safe initialisation of function-local statics.
    static const auto tbl = [] {
        std::array<uint32_t, 256> t{};
        for (uint32_t i = 0; i < 256; ++i) {
            uint32_t crc = i;
            for (int bit = 0; bit < 8; ++bit) {
                crc = (crc & 1u) ? ((crc >> 1) ^ 0xEDB88320u) : (crc >> 1);
            }
            t[i] = crc;
        }
        return t;
    }();
    return tbl.data();
}

// ==================================================================
//  Constructor / reset
// ==================================================================

CRC32::CRC32() : crc_(0xFFFFFFFFu) {}

void CRC32::reset() {
    crc_ = 0xFFFFFFFFu;
}

// ==================================================================
//  Incremental update
// ==================================================================

void CRC32::update(const uint8_t* data, size_t length) {
    const uint32_t* tbl = table();
    for (size_t i = 0; i < length; ++i) {
        crc_ = (crc_ >> 8) ^ tbl[(crc_ ^ data[i]) & 0xFFu];
    }
}

void CRC32::update(uint8_t byte) {
    const uint32_t* tbl = table();
    crc_ = (crc_ >> 8) ^ tbl[(crc_ ^ byte) & 0xFFu];
}

// ==================================================================
//  Finalize (apply final XOR)
// ==================================================================

uint32_t CRC32::finalize() const {
    return crc_ ^ 0xFFFFFFFFu;
}

// ==================================================================
//  One-shot static helpers
// ==================================================================

uint32_t CRC32::compute(const uint8_t* data, size_t length) {
    const uint32_t* tbl = table();
    uint32_t crc = 0xFFFFFFFFu;
    for (size_t i = 0; i < length; ++i) {
        crc = (crc >> 8) ^ tbl[(crc ^ data[i]) & 0xFFu];
    }
    return crc ^ 0xFFFFFFFFu;
}

uint32_t CRC32::compute(const std::vector<uint8_t>& data) {
    return compute(data.data(), data.size());
}

uint32_t CRC32::compute(const std::string& str) {
    return compute(reinterpret_cast<const uint8_t*>(str.data()), str.size());
}

} // namespace pulse
