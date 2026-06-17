#pragma once
#include "pulse/core/event.hpp"
#include <vector>
#include <cstdint>
#include <string>

namespace pulse {

class Encoder {
public:
    Encoder();

    void encode_event(const Event& event);
    void encode_varint(uint64_t value);
    void encode_zigzag(int64_t value);
    void encode_double(double value);
    void encode_string(const std::string& value);
    void encode_bytes(const std::vector<uint8_t>& value);
    void encode_bool(bool value);
    void encode_field_value(const FieldValue& value);
    void encode_uint8(uint8_t value);
    void encode_uint32(uint32_t value);

    const std::vector<uint8_t>& data() const { return buffer_; }
    size_t size() const { return buffer_.size(); }
    void clear() { buffer_.clear(); }
    std::vector<uint8_t> take();

private:
    std::vector<uint8_t> buffer_;
};

} // namespace pulse