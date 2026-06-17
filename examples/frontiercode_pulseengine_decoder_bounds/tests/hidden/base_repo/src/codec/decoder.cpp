#include "pulse/codec/decoder.hpp"
#include <cstring>

namespace pulse {

Decoder::Decoder(const uint8_t* data, size_t size)
    : data_(data), size_(size) {}

Decoder::Decoder(const std::vector<uint8_t>& data)
    : data_(data.data()), size_(data.size()) {}

Result<uint8_t> Decoder::decode_uint8() {
    if (pos_ >= size_) {
        return Result<uint8_t>::err(ErrorCode::DecodingError, "Unexpected end of data");
    }
    return Result<uint8_t>::ok(data_[pos_++]);
}

Result<uint32_t> Decoder::decode_uint32() {
    if (pos_ + 4 > size_) {
        return Result<uint32_t>::err(ErrorCode::DecodingError, "Unexpected end of data");
    }
    uint32_t v = static_cast<uint32_t>(data_[pos_])
               | (static_cast<uint32_t>(data_[pos_+1]) << 8)
               | (static_cast<uint32_t>(data_[pos_+2]) << 16)
               | (static_cast<uint32_t>(data_[pos_+3]) << 24);
    pos_ += 4;
    return Result<uint32_t>::ok(v);
}

Result<uint64_t> Decoder::decode_varint() {
    uint64_t result = 0;
    int shift = 0;
    while (pos_ < size_) {
        uint8_t byte = data_[pos_++];
        result |= static_cast<uint64_t>(byte & 0x7F) << shift;
        if ((byte & 0x80) == 0) {
            return Result<uint64_t>::ok(result);
        }
        shift += 7;
        if (shift >= 64) {
            return Result<uint64_t>::err(ErrorCode::DecodingError, "Varint too long");
        }
    }
    return Result<uint64_t>::err(ErrorCode::DecodingError, "Truncated varint");
}

Result<int64_t> Decoder::decode_zigzag() {
    auto r = decode_varint();
    if (r.is_err()) return Result<int64_t>::err(r.error_code(), r.error_msg());
    uint64_t v = r.value();
    int64_t decoded = static_cast<int64_t>((v >> 1) ^ -(v & 1));
    return Result<int64_t>::ok(decoded);
}

Result<double> Decoder::decode_double() {
    if (pos_ + 8 > size_) {
        return Result<double>::err(ErrorCode::DecodingError, "Unexpected end of data");
    }
    uint64_t bits = 0;
    for (int i = 0; i < 8; i++) {
        bits |= static_cast<uint64_t>(data_[pos_++]) << (i * 8);
    }
    double result;
    std::memcpy(&result, &bits, sizeof(result));
    return Result<double>::ok(result);
}

Result<std::string> Decoder::decode_string() {
    auto len_r = decode_varint();
    if (len_r.is_err()) return Result<std::string>::err(len_r.error_code(), len_r.error_msg());
    size_t len = static_cast<size_t>(len_r.value());
    if (pos_ + len > size_) {
        return Result<std::string>::err(ErrorCode::DecodingError, "String truncated");
    }
    std::string s(reinterpret_cast<const char*>(data_ + pos_), len);
    pos_ += len;
    return Result<std::string>::ok(std::move(s));
}

Result<std::vector<uint8_t>> Decoder::decode_bytes() {
    auto len_r = decode_varint();
    if (len_r.is_err()) {
        return Result<std::vector<uint8_t>>::err(len_r.error_code(), len_r.error_msg());
    }
    size_t len = static_cast<size_t>(len_r.value());
    if (pos_ + len > size_) {
        return Result<std::vector<uint8_t>>::err(ErrorCode::DecodingError, "Bytes truncated");
    }
    std::vector<uint8_t> v(data_ + pos_, data_ + pos_ + len);
    pos_ += len;
    return Result<std::vector<uint8_t>>::ok(std::move(v));
}

Result<bool> Decoder::decode_bool() {
    if (pos_ >= size_) {
        return Result<bool>::err(ErrorCode::DecodingError, "Unexpected end of data");
    }
    return Result<bool>::ok(data_[pos_++] != 0);
}

Result<FieldValue> Decoder::decode_field_value() {
    auto type_r = decode_uint8();
    if (type_r.is_err()) return Result<FieldValue>::err(type_r.error_code(), type_r.error_msg());

    switch (type_r.value()) {
        case 0: {
            auto v = decode_zigzag();
            if (v.is_err()) return Result<FieldValue>::err(v.error_code(), v.error_msg());
            return Result<FieldValue>::ok(FieldValue(v.value()));
        }
        case 1: {
            auto v = decode_double();
            if (v.is_err()) return Result<FieldValue>::err(v.error_code(), v.error_msg());
            return Result<FieldValue>::ok(FieldValue(v.value()));
        }
        case 2: {
            auto v = decode_string();
            if (v.is_err()) return Result<FieldValue>::err(v.error_code(), v.error_msg());
            return Result<FieldValue>::ok(FieldValue(v.value()));
        }
        case 3: {
            auto v = decode_bool();
            if (v.is_err()) return Result<FieldValue>::err(v.error_code(), v.error_msg());
            return Result<FieldValue>::ok(FieldValue(v.value()));
        }
        case 4: {
            auto v = decode_bytes();
            if (v.is_err()) return Result<FieldValue>::err(v.error_code(), v.error_msg());
            return Result<FieldValue>::ok(FieldValue(v.value()));
        }
        default:
            return Result<FieldValue>::err(ErrorCode::DecodingError,
                "Unknown field type tag: " + std::to_string(type_r.value()));
    }
}

Result<Event> Decoder::decode_event() {
    // Magic bytes
    auto m1 = decode_uint8();
    if (m1.is_err()) return Result<Event>::err(m1.error_code(), m1.error_msg());
    auto m2 = decode_uint8();
    if (m2.is_err()) return Result<Event>::err(m2.error_code(), m2.error_msg());
    if (m1.value() != 0xBE || m2.value() != 0xAE) {
        return Result<Event>::err(ErrorCode::DecodingError, "Invalid magic bytes");
    }

    // Event type
    auto type_r = decode_string();
    if (type_r.is_err()) return Result<Event>::err(type_r.error_code(), type_r.error_msg());

    // Timestamp
    auto ts_r = decode_varint();
    if (ts_r.is_err()) return Result<Event>::err(ts_r.error_code(), ts_r.error_msg());

    Event event(type_r.value(), static_cast<Timestamp>(ts_r.value()));

    // Field count
    auto fc_r = decode_varint();
    if (fc_r.is_err()) return Result<Event>::err(fc_r.error_code(), fc_r.error_msg());
    size_t field_count = static_cast<size_t>(fc_r.value());

    for (size_t i = 0; i < field_count; i++) {
        auto key_r = decode_string();
        if (key_r.is_err()) return Result<Event>::err(key_r.error_code(), key_r.error_msg());
        auto val_r = decode_field_value();
        if (val_r.is_err()) return Result<Event>::err(val_r.error_code(), val_r.error_msg());
        event.set_field(key_r.value(), val_r.value());
    }

    return Result<Event>::ok(std::move(event));
}

} // namespace pulse