#include "test_framework.hpp"
#include "pulse/core/schema.hpp"
#include "pulse/core/event.hpp"

using namespace pulse;

TEST_CASE(schema_empty) {
    Schema s("empty");
    ASSERT_EQ(s.field_count(), (size_t)0);
    ASSERT_STR_EQ(s.event_type(), "empty");
}

TEST_CASE(schema_add_fields) {
    Schema s("ev");
    s.add_field("count", FieldType::Int64);
    s.add_field("rate", FieldType::Double);
    s.add_field("name", FieldType::String, false);
    ASSERT_EQ(s.field_count(), (size_t)3);
    ASSERT_TRUE(s.has_field("count"));
    ASSERT_TRUE(s.has_field("rate"));
    ASSERT_TRUE(s.has_field("name"));
    ASSERT_FALSE(s.has_field("missing"));
}

TEST_CASE(schema_duplicate_field_throws) {
    Schema s("ev");
    s.add_field("x", FieldType::Int64);
    ASSERT_THROWS(s.add_field("x", FieldType::Double));
}

TEST_CASE(schema_get_field) {
    Schema s("ev");
    s.add_field("val", FieldType::Double, false);
    auto& fd = s.get_field("val");
    ASSERT_STR_EQ(fd.name, "val");
    ASSERT_EQ(static_cast<int>(fd.type), static_cast<int>(FieldType::Double));
    ASSERT_FALSE(fd.required);
}

TEST_CASE(schema_get_field_not_found_throws) {
    Schema s("ev");
    ASSERT_THROWS(s.get_field("nope"));
}

TEST_CASE(schema_field_index) {
    Schema s("ev");
    s.add_field("a", FieldType::Int64);
    s.add_field("b", FieldType::String);
    ASSERT_EQ(s.field_index("a"), 0);
    ASSERT_EQ(s.field_index("b"), 1);
    ASSERT_EQ(s.field_index("c"), -1);
}

TEST_CASE(schema_validate_valid) {
    Schema s("click");
    s.add_field("x", FieldType::Int64);
    s.add_field("y", FieldType::Int64);
    std::unordered_map<std::string, FieldValue> data;
    data["x"] = int64_t(10);
    data["y"] = int64_t(20);
    auto r = s.validate(data);
    ASSERT_TRUE(r.is_ok());
}

TEST_CASE(schema_validate_missing_required) {
    Schema s("click");
    s.add_field("x", FieldType::Int64, true);
    std::unordered_map<std::string, FieldValue> data;
    auto r = s.validate(data);
    ASSERT_TRUE(r.is_err());
    ASSERT_EQ(static_cast<int>(r.error_code()),
              static_cast<int>(ErrorCode::InvalidSchema));
}

TEST_CASE(schema_validate_missing_optional_ok) {
    Schema s("click");
    s.add_field("x", FieldType::Int64, false);
    std::unordered_map<std::string, FieldValue> data;
    auto r = s.validate(data);
    ASSERT_TRUE(r.is_ok());
}

TEST_CASE(schema_validate_type_mismatch) {
    Schema s("click");
    s.add_field("x", FieldType::Int64);
    std::unordered_map<std::string, FieldValue> data;
    data["x"] = std::string("not_a_number");
    auto r = s.validate(data);
    ASSERT_TRUE(r.is_err());
    ASSERT_EQ(static_cast<int>(r.error_code()),
              static_cast<int>(ErrorCode::TypeMismatch));
}

TEST_CASE(schema_validate_with_event) {
    Schema s("order");
    s.add_field("amount", FieldType::Double);
    s.add_field("item", FieldType::String);
    Event e("order", 100);
    e.set_double("amount", 19.99);
    e.set_string("item", "widget");
    auto r = e.validate(s);
    ASSERT_TRUE(r.is_ok());
}

TEST_CASE(schema_fingerprint_stable) {
    Schema s("ev");
    s.add_field("a", FieldType::Int64);
    s.add_field("b", FieldType::String);
    uint32_t f1 = s.fingerprint();
    uint32_t f2 = s.fingerprint();
    ASSERT_EQ(f1, f2);
}

TEST_CASE(schema_fingerprint_differs) {
    Schema s1("ev");
    s1.add_field("a", FieldType::Int64);
    Schema s2("ev");
    s2.add_field("a", FieldType::Double);
    ASSERT_NE(s1.fingerprint(), s2.fingerprint());
}

TEST_CASE(schema_fingerprint_differs_by_name) {
    Schema s1("ev1");
    s1.add_field("a", FieldType::Int64);
    Schema s2("ev2");
    s2.add_field("a", FieldType::Int64);
    ASSERT_NE(s1.fingerprint(), s2.fingerprint());
}

TEST_CASE(schema_chained_add) {
    Schema s("ev");
    s.add_field("a", FieldType::Int64)
     .add_field("b", FieldType::Double)
     .add_field("c", FieldType::String);
    ASSERT_EQ(s.field_count(), (size_t)3);
}

TEST_CASE(registry_register_and_get) {
    SchemaRegistry reg;
    Schema s("click");
    s.add_field("x", FieldType::Int64);
    reg.register_schema("click", s);
    ASSERT_TRUE(reg.has_schema("click"));
    ASSERT_EQ(reg.size(), (size_t)1);
    auto& got = reg.get_schema("click");
    ASSERT_EQ(got.field_count(), (size_t)1);
}

TEST_CASE(registry_not_found_throws) {
    SchemaRegistry reg;
    ASSERT_THROWS(reg.get_schema("nope"));
}

TEST_CASE(registry_registered_types) {
    SchemaRegistry reg;
    reg.register_schema("b", Schema("b"));
    reg.register_schema("a", Schema("a"));
    auto types = reg.registered_types();
    ASSERT_EQ(types.size(), (size_t)2);
    ASSERT_STR_EQ(types[0], "a");
    ASSERT_STR_EQ(types[1], "b");
}

TEST_CASE(registry_clear) {
    SchemaRegistry reg;
    reg.register_schema("x", Schema("x"));
    ASSERT_EQ(reg.size(), (size_t)1);
    reg.clear();
    ASSERT_EQ(reg.size(), (size_t)0);
}

TEST_CASE(registry_overwrite) {
    SchemaRegistry reg;
    Schema s1("ev");
    s1.add_field("a", FieldType::Int64);
    reg.register_schema("ev", s1);
    Schema s2("ev");
    s2.add_field("b", FieldType::Double);
    s2.add_field("c", FieldType::String);
    reg.register_schema("ev", s2);
    ASSERT_EQ(reg.get_schema("ev").field_count(), (size_t)2);
}

TEST_CASE(event_builder_basic) {
    auto e = EventBuilder("purchase", 500)
        .with_int("amount", 100)
        .with_string("item", "book")
        .build();
    ASSERT_STR_EQ(e.event_type(), "purchase");
    ASSERT_EQ(e.get_int("amount"), (int64_t)100);
    ASSERT_STR_EQ(e.get_string("item"), "book");
}

TEST_CASE(event_builder_validated_ok) {
    Schema s("order");
    s.add_field("qty", FieldType::Int64);
    auto r = EventBuilder("order", 100)
        .with_int("qty", 5)
        .build_validated(s);
    ASSERT_TRUE(r.is_ok());
    ASSERT_EQ(r.value().get_int("qty"), (int64_t)5);
}

TEST_CASE(event_builder_validated_fail) {
    Schema s("order");
    s.add_field("qty", FieldType::Int64);
    auto r = EventBuilder("order", 100)
        .with_string("qty", "five")
        .build_validated(s);
    ASSERT_TRUE(r.is_err());
}

TEST_CASE(schema_validate_extra_fields_ok) {
    Schema s("ev");
    s.add_field("a", FieldType::Int64);
    std::unordered_map<std::string, FieldValue> data;
    data["a"] = int64_t(1);
    data["extra"] = std::string("ignored");
    auto r = s.validate(data);
    ASSERT_TRUE(r.is_ok());
}

TEST_CASE(schema_many_fields) {
    Schema s("big");
    for (int i = 0; i < 50; i++) {
        s.add_field("f" + std::to_string(i), FieldType::Int64);
    }
    ASSERT_EQ(s.field_count(), (size_t)50);
    ASSERT_EQ(s.field_index("f49"), 49);
}

RUN_ALL_TESTS()