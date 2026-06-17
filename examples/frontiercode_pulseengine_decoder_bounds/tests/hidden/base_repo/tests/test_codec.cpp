#include "test_framework.hpp"
#include "pulse/codec/encoder.hpp"
#include "pulse/codec/decoder.hpp"

using namespace pulse;

TEST_CASE(codec_varint_small) {
    Encoder enc;
    enc.encode_varint(42);
    Decoder dec(enc.data());
    auto r = dec.decode_varint();
    ASSERT_TRUE(r.is_ok());
    ASSERT_EQ(r.value(), (uint64_t)42);
}

TEST_CASE(codec_varint_zero) {
    Encoder enc;
    enc.encode_varint(0);
    Decoder dec(enc.data());
    auto r = dec.decode_varint();
    ASSERT_TRUE(r.is_ok());
    ASSERT_EQ(r.value(), (uint64_t)0);
}

TEST_CASE(codec_varint_large) {
    Encoder enc;
    uint64_t big = 0xFFFFFFFF;
    enc.encode_varint(big);
    Decoder dec(enc.data());
    auto r = dec.decode_varint();
    ASSERT_TRUE(r.is_ok());
    ASSERT_EQ(r.value(), big);
}

TEST_CASE(codec_varint_max) {
    Encoder enc;
    enc.encode_varint(UINT64_MAX);
    Decoder dec(enc.data());
    auto r = dec.decode_varint();
    ASSERT_TRUE(r.is_ok());
    ASSERT_EQ(r.value(), UINT64_MAX);
}

TEST_CASE(codec_zigzag_positive) {
    Encoder enc;
    enc.encode_zigzag(42);
    Decoder dec(enc.data());
    auto r = dec.decode_zigzag();
    ASSERT_TRUE(r.is_ok());
    ASSERT_EQ(r.value(), (int64_t)42);
}

TEST_CASE(codec_zigzag_negative) {
    Encoder enc;
    enc.encode_zigzag(-42);
    Decoder dec(enc.data());
    auto r = dec.decode_zigzag();
    ASSERT_TRUE(r.is_ok());
    ASSERT_EQ(r.value(), (int64_t)-42);
}

TEST_CASE(codec_zigzag_zero) {
    Encoder enc;
    enc.encode_zigzag(0);
    Decoder dec(enc.data());
    auto r = dec.decode_zigzag();
    ASSERT_TRUE(r.is_ok());
    ASSERT_EQ(r.value(), (int64_t)0);
}

TEST_CASE(codec_double) {
    Encoder enc;
    enc.encode_double(3.14159);
    Decoder dec(enc.data());
    auto r = dec.decode_double();
    ASSERT_TRUE(r.is_ok());
    ASSERT_NEAR(r.value(), 3.14159, 1e-9);
}

TEST_CASE(codec_double_negative) {
    Encoder enc;
    enc.encode_double(-0.001);
    Decoder dec(enc.data());
    auto r = dec.decode_double();
    ASSERT_TRUE(r.is_ok());
    ASSERT_NEAR(r.value(), -0.001, 1e-9);
}

TEST_CASE(codec_string) {
    Encoder enc;
    enc.encode_string("hello world");
    Decoder dec(enc.data());
    auto r = dec.decode_string();
    ASSERT_TRUE(r.is_ok());
    ASSERT_STR_EQ(r.value(), "hello world");
}

TEST_CASE(codec_empty_string) {
    Encoder enc;
    enc.encode_string("");
    Decoder dec(enc.data());
    auto r = dec.decode_string();
    ASSERT_TRUE(r.is_ok());
    ASSERT_STR_EQ(r.value(), "");
}

TEST_CASE(codec_bytes) {
    Encoder enc;
    std::vector<uint8_t> data = {0xDE, 0xAD, 0xBE, 0xEF};
    enc.encode_bytes(data);
    Decoder dec(enc.data());
    auto r = dec.decode_bytes();
    ASSERT_TRUE(r.is_ok());
    ASSERT_EQ(r.value().size(), (size_t)4);
    ASSERT_EQ(r.value()[0], (uint8_t)0xDE);
    ASSERT_EQ(r.value()[3], (uint8_t)0xEF);
}

TEST_CASE(codec_empty_bytes) {
    Encoder enc;
    enc.encode_bytes({});
    Decoder dec(enc.data());
    auto r = dec.decode_bytes();
    ASSERT_TRUE(r.is_ok());
    ASSERT_EQ(r.value().size(), (size_t)0);
}

TEST_CASE(codec_bool_true) {
    Encoder enc;
    enc.encode_bool(true);
    Decoder dec(enc.data());
    auto r = dec.decode_bool();
    ASSERT_TRUE(r.is_ok());
    ASSERT_TRUE(r.value());
}

TEST_CASE(codec_bool_false) {
    Encoder enc;
    enc.encode_bool(false);
    Decoder dec(enc.data());
    auto r = dec.decode_bool();
    ASSERT_TRUE(r.is_ok());
    ASSERT_FALSE(r.value());
}

TEST_CASE(codec_event_roundtrip) {
    Event orig("click", 1000);
    orig.set_int("x", 100);
    orig.set_double("y", 3.14);
    orig.set_string("label", "ok");
    orig.set_bool("active", true);
    orig.set_bytes("data", {1, 2, 3});

    Encoder enc;
    enc.encode_event(orig);

    Decoder dec(enc.data());
    auto r = dec.decode_event();
    ASSERT_TRUE(r.is_ok());
    auto& decoded = r.value();

    ASSERT_STR_EQ(decoded.event_type(), "click");
    ASSERT_EQ(decoded.timestamp(), (Timestamp)1000);
    ASSERT_EQ(decoded.get_int("x"), (int64_t)100);
    ASSERT_NEAR(decoded.get_double("y"), 3.14, 1e-9);
    ASSERT_STR_EQ(decoded.get_string("label"), "ok");
    ASSERT_TRUE(decoded.get_bool("active"));
    ASSERT_EQ(decoded.get_bytes("data").size(), (size_t)3);
}

TEST_CASE(codec_event_empty_fields) {
    Event orig("empty", 0);
    Encoder enc;
    enc.encode_event(orig);
    Decoder dec(enc.data());
    auto r = dec.decode_event();
    ASSERT_TRUE(r.is_ok());
    ASSERT_STR_EQ(r.value().event_type(), "empty");
    ASSERT_EQ(r.value().field_count(), (size_t)0);
}

TEST_CASE(codec_invalid_magic) {
    std::vector<uint8_t> data = {0x00, 0x00};
    Decoder dec(data);
    auto r = dec.decode_event();
    ASSERT_TRUE(r.is_err());
}

TEST_CASE(codec_truncated_data) {
    Decoder dec(std::vector<uint8_t>{0xBE});
    auto r = dec.decode_event();
    ASSERT_TRUE(r.is_err());
}

TEST_CASE(codec_encoder_clear) {
    Encoder enc;
    enc.encode_varint(42);
    ASSERT_GT(enc.size(), (size_t)0);
    enc.clear();
    ASSERT_EQ(enc.size(), (size_t)0);
}

TEST_CASE(codec_encoder_take) {
    Encoder enc;
    enc.encode_string("test");
    auto data = enc.take();
    ASSERT_GT(data.size(), (size_t)0);
    ASSERT_EQ(enc.size(), (size_t)0);
}

TEST_CASE(codec_multiple_events) {
    Encoder enc;
    for (int i = 0; i < 5; i++) {
        Event e("ev", i * 100);
        e.set_int("idx", i);
        enc.encode_event(e);
    }

    Decoder dec(enc.data());
    for (int i = 0; i < 5; i++) {
        auto r = dec.decode_event();
        ASSERT_TRUE(r.is_ok());
        ASSERT_EQ(r.value().get_int("idx"), (int64_t)i);
    }
    ASSERT_TRUE(dec.at_end());
}

TEST_CASE(codec_decoder_position) {
    Encoder enc;
    enc.encode_varint(100);
    enc.encode_varint(200);
    Decoder dec(enc.data());
    ASSERT_EQ(dec.position(), (size_t)0);
    dec.decode_varint();
    ASSERT_GT(dec.position(), (size_t)0);
    ASSERT_FALSE(dec.at_end());
    dec.decode_varint();
    ASSERT_TRUE(dec.at_end());
}

TEST_CASE(codec_field_value_int) {
    Encoder enc;
    enc.encode_field_value(FieldValue(int64_t(-999)));
    Decoder dec(enc.data());
    auto r = dec.decode_field_value();
    ASSERT_TRUE(r.is_ok());
    ASSERT_EQ(std::get<int64_t>(r.value()), (int64_t)-999);
}

TEST_CASE(codec_uint32) {
    Encoder enc;
    enc.encode_uint32(0xDEADBEEF);
    Decoder dec(enc.data());
    auto r = dec.decode_uint32();
    ASSERT_TRUE(r.is_ok());
    ASSERT_EQ(r.value(), (uint32_t)0xDEADBEEF);
}

RUN_ALL_TESTS()