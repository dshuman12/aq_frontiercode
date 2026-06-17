#pragma once
#include "pulse/core/event.hpp"
#include <vector>
#include <cstdint>
#include <string>

namespace pulse {

class Decoder {
public:
    Decoder(const uint8_t* data, size_t size);
    Decoder(const std::vector<uint8_t>& data);

    Result<Event> decode_event();
    Result<uint64_t> decode_varint();
    Result<int64_t> decode_zigzag();
    Result<double> decode_double();
    Result<std::string> decode_string();
    Result<std::vector<uint8_t>> decode_bytes();
    Result<bool> decode_bool();
    Result<FieldValue> decode_field_value();
    Result<uint8_t> decode_uint8();
    Result<uint32_t> decode_uint32();

    size_t position() const { return pos_; }
    size_t remaining() const { return size_ - pos_; }
    bool at_end() const { return pos_ >= size_; }

private:
    const uint8_t* data_;
    size_t size_;
    size_t pos_ = 0;
};

} // namespace pulse