#include "test_framework.hpp"
#include "pulse/codec/json.hpp"

using namespace pulse;

// ------------------------------------------------------------------
//  Serialization tests
// ------------------------------------------------------------------

TEST_CASE(json_serialize_empty_event) {
    Event e("empty", 0);
    std::string json = JsonSerializer::serialize(e);
    ASSERT_STR_EQ(json, "{\"type\":\"empty\",\"timestamp\":0,\"fields\":{}}");
}

TEST_CASE(json_serialize_int_field) {
    Event e("ev", 100);
    e.set_int("x", 42);
    std::string json = JsonSerializer::serialize(e);
    // Single field -> deterministic order
    ASSERT_STR_EQ(json, "{\"type\":\"ev\",\"timestamp\":100,\"fields\":{\"x\":42}}");
}

TEST_CASE(json_serialize_double_field) {
    Event e("ev", 0);
    e.set_double("rate", 3.14);
    std::string json = JsonSerializer::serialize(e);
    ASSERT_TRUE(json.find("\"rate\":3.14") != std::string::npos);
}

TEST_CASE(json_serialize_string_field) {
    Event e("ev", 0);
    e.set_string("name", "hello");
    std::string json = JsonSerializer::serialize(e);
    ASSERT_TRUE(json.find("\"name\":\"hello\"") != std::string::npos);
}

TEST_CASE(json_serialize_bool_field) {
    Event e("ev", 0);
    e.set_bool("active", true);
    std::string json = JsonSerializer::serialize(e);
    ASSERT_TRUE(json.find("\"active\":true") != std::string::npos);
}

TEST_CASE(json_serialize_bool_false) {
    Event e("ev", 0);
    e.set_bool("done", false);
    std::string json = JsonSerializer::serialize(e);
    ASSERT_TRUE(json.find("\"done\":false") != std::string::npos);
}

TEST_CASE(json_serialize_bytes_field) {
    Event e("ev", 0);
    e.set_bytes("data", {0xDE, 0xAD, 0xBE, 0xEF});
    std::string json = JsonSerializer::serialize(e);
    ASSERT_TRUE(json.find("\"data\":\"0xdeadbeef\"") != std::string::npos);
}

// ------------------------------------------------------------------
//  Deserialization tests
// ------------------------------------------------------------------

TEST_CASE(json_deserialize_basic) {
    std::string json = "{\"type\":\"click\",\"timestamp\":500,\"fields\":{\"x\":42}}";
    Event e = JsonSerializer::deserialize(json);
    ASSERT_STR_EQ(e.event_type(), "click");
    ASSERT_EQ(e.timestamp(), (uint64_t)500);
    ASSERT_EQ(e.get_int("x"), (int64_t)42);
}

TEST_CASE(json_deserialize_with_whitespace) {
    std::string json = "{ \"type\" : \"click\" , \"timestamp\" : 500 , \"fields\" : { \"x\" : 42 } }";
    Event e = JsonSerializer::deserialize(json);
    ASSERT_STR_EQ(e.event_type(), "click");
    ASSERT_EQ(e.timestamp(), (uint64_t)500);
    ASSERT_EQ(e.get_int("x"), (int64_t)42);
}

// ------------------------------------------------------------------
//  Roundtrip tests
// ------------------------------------------------------------------

TEST_CASE(json_roundtrip_all_types) {
    Event orig("click", 1000);
    orig.set_int("x", 100);
    orig.set_double("rate", 3.14);
    orig.set_string("label", "ok");
    orig.set_bool("active", true);
    orig.set_bytes("payload", {0xCA, 0xFE});

    std::string json = JsonSerializer::serialize(orig);
    Event restored = JsonSerializer::deserialize(json);

    ASSERT_STR_EQ(restored.event_type(), "click");
    ASSERT_EQ(restored.timestamp(), (uint64_t)1000);
    ASSERT_EQ(restored.get_int("x"), (int64_t)100);
    ASSERT_NEAR(restored.get_double("rate"), 3.14, 1e-9);
    ASSERT_STR_EQ(restored.get_string("label"), "ok");
    ASSERT_TRUE(restored.get_bool("active"));
    auto bytes = restored.get_bytes("payload");
    ASSERT_EQ(bytes.size(), (size_t)2);
    ASSERT_EQ((int)bytes[0], 0xCA);
    ASSERT_EQ((int)bytes[1], 0xFE);
}

TEST_CASE(json_roundtrip_empty_event) {
    Event orig("noop", 0);
    std::string json = JsonSerializer::serialize(orig);
    Event restored = JsonSerializer::deserialize(json);
    ASSERT_STR_EQ(restored.event_type(), "noop");
    ASSERT_EQ(restored.timestamp(), (uint64_t)0);
    ASSERT_EQ(restored.field_count(), (size_t)0);
}

TEST_CASE(json_roundtrip_negative_int) {
    Event orig("ev", 0);
    orig.set_int("neg", -12345);
    std::string json = JsonSerializer::serialize(orig);
    Event restored = JsonSerializer::deserialize(json);
    ASSERT_EQ(restored.get_int("neg"), (int64_t)-12345);
}

TEST_CASE(json_roundtrip_large_timestamp) {
    Event orig("ev", 1717777777777ULL);
    std::string json = JsonSerializer::serialize(orig);
    Event restored = JsonSerializer::deserialize(json);
    ASSERT_EQ(restored.timestamp(), (uint64_t)1717777777777ULL);
}

// ------------------------------------------------------------------
//  String-escaping roundtrips
// ------------------------------------------------------------------

TEST_CASE(json_escape_quotes) {
    Event orig("ev", 0);
    orig.set_string("msg", "say \"hello\"");
    std::string json = JsonSerializer::serialize(orig);
    ASSERT_TRUE(json.find("\\\"hello\\\"") != std::string::npos);
    Event restored = JsonSerializer::deserialize(json);
    ASSERT_STR_EQ(restored.get_string("msg"), "say \"hello\"");
}

TEST_CASE(json_escape_newlines) {
    Event orig("ev", 0);
    orig.set_string("msg", "line1\nline2");
    std::string json = JsonSerializer::serialize(orig);
    ASSERT_TRUE(json.find("\\n") != std::string::npos);
    Event restored = JsonSerializer::deserialize(json);
    ASSERT_STR_EQ(restored.get_string("msg"), "line1\nline2");
}

TEST_CASE(json_escape_backslash) {
    Event orig("ev", 0);
    orig.set_string("path", "C:\\Users\\test");
    std::string json = JsonSerializer::serialize(orig);
    ASSERT_TRUE(json.find("\\\\") != std::string::npos);
    Event restored = JsonSerializer::deserialize(json);
    ASSERT_STR_EQ(restored.get_string("path"), "C:\\Users\\test");
}

TEST_CASE(json_escape_tab) {
    Event orig("ev", 0);
    orig.set_string("msg", "col1\tcol2");
    std::string json = JsonSerializer::serialize(orig);
    ASSERT_TRUE(json.find("\\t") != std::string::npos);
    Event restored = JsonSerializer::deserialize(json);
    ASSERT_STR_EQ(restored.get_string("msg"), "col1\tcol2");
}

// ------------------------------------------------------------------
//  Bytes hex encoding
// ------------------------------------------------------------------

TEST_CASE(json_bytes_empty) {
    Event orig("ev", 0);
    orig.set_bytes("empty", {});
    std::string json = JsonSerializer::serialize(orig);
    ASSERT_TRUE(json.find("\"0x\"") != std::string::npos);
    Event restored = JsonSerializer::deserialize(json);
    ASSERT_EQ(restored.get_bytes("empty").size(), (size_t)0);
}

RUN_ALL_TESTS()
