#include "pulse/codec/encoder.hpp"
#include <cstring>

namespace pulse {

Encoder::Encoder() {
    buffer_.reserve(256);
}

void Encoder::encode_varint(uint64_t value) {
    while (value >= 0x80) {
        buffer_.push_back(static_cast<uint8_t>(value | 0x80));
        value >>= 7;
    }
    buffer_.push_back(static_cast<uint8_t>(value));
}

void Encoder::encode_zigzag(int64_t value) {
    uint64_t encoded = static_cast<uint64_t>((value << 1) ^ (value >> 63));
    encode_varint(encoded);
}

void Encoder::encode_double(double value) {
    uint64_t bits;
    std::memcpy(&bits, &value, sizeof(bits));
    for (int i = 0; i < 8; i++) {
        buffer_.push_back(static_cast<uint8_t>(bits & 0xFF));
        bits >>= 8;
    }
}

void Encoder::encode_string(const std::string& value) {
    encode_varint(value.size());
    buffer_.insert(buffer_.end(), value.begin(), value.end());
}

void Encoder::encode_bytes(const std::vector<uint8_t>& value) {
    encode_varint(value.size());
    buffer_.insert(buffer_.end(), value.begin(), value.end());
}

void Encoder::encode_bool(bool value) {
    buffer_.push_back(value ? 1 : 0);
}

void Encoder::encode_uint8(uint8_t value) {
    buffer_.push_back(value);
}

void Encoder::encode_uint32(uint32_t value) {
    buffer_.push_back(static_cast<uint8_t>(value & 0xFF));
    buffer_.push_back(static_cast<uint8_t>((value >> 8) & 0xFF));
    buffer_.push_back(static_cast<uint8_t>((value >> 16) & 0xFF));
    buffer_.push_back(static_cast<uint8_t>((value >> 24) & 0xFF));
}

void Encoder::encode_field_value(const FieldValue& value) {
    uint8_t type_tag = static_cast<uint8_t>(value.index());
    encode_uint8(type_tag);

    switch (type_tag) {
        case 0: encode_zigzag(std::get<int64_t>(value)); break;
        case 1: encode_double(std::get<double>(value)); break;
        case 2: encode_string(std::get<std::string>(value)); break;
        case 3: encode_bool(std::get<bool>(value)); break;
        case 4: encode_bytes(std::get<std::vector<uint8_t>>(value)); break;
    }
}

void Encoder::encode_event(const Event& event) {
    // Header: magic bytes
    encode_uint8(0xBE);
    encode_uint8(0xAE);

    // Event type
    encode_string(event.event_type());

    // Timestamp
    encode_varint(event.timestamp());

    // Field count
    encode_varint(event.field_count());

    // Fields
    for (const auto& kv : event.fields()) {
        encode_string(kv.first);
        encode_field_value(kv.second);
    }
}

std::vector<uint8_t> Encoder::take() {
    return std::move(buffer_);
}

} // namespace pulse