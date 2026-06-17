#pragma once
#include <cstdint>
#include <cstddef>
#include <string>
#include <vector>

namespace pulse {

/// CRC-32 checksum using the standard IEEE 802.3 polynomial.
///
/// Polynomial: 0xEDB88320 (bit-reflected form of 0x04C11DB7).
/// Initial value: 0xFFFFFFFF.  Final XOR: 0xFFFFFFFF.
///
/// Provides both one-shot static helpers and an incremental
/// (streaming) interface for large or chunked data.
class CRC32 {
public:
    /// Construct with initial CRC state.
    CRC32();

    // ---- one-shot helpers ----

    /// CRC32 over a raw byte buffer.
    static uint32_t compute(const uint8_t* data, size_t length);

    /// CRC32 over a byte vector.
    static uint32_t compute(const std::vector<uint8_t>& data);

    /// CRC32 over a string (each char treated as a byte).
    static uint32_t compute(const std::string& str);

    // ---- incremental interface ----

    /// Feed a block of bytes into the running checksum.
    void update(const uint8_t* data, size_t length);

    /// Feed a single byte.
    void update(uint8_t byte);

    /// Return the current CRC32 value (after final XOR).
    uint32_t finalize() const;

    /// Reset back to the initial state so the object can be reused.
    void reset();

private:
    /// Return a pointer to the 256-entry lookup table
    /// (generated once on first call, thread-safe).
    static const uint32_t* table();

    uint32_t crc_;
};

} // namespace pulse
