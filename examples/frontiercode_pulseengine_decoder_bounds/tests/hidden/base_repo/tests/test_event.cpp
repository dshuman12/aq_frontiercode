#include "test_framework.hpp"
#include "pulse/core/event.hpp"
#include "pulse/core/event_pool.hpp"
#include <algorithm>

using namespace pulse;

TEST_CASE(event_default_constructor) {
    Event e;
    ASSERT_GT(e.id(), (EventId)0);
    ASSERT_EQ(e.timestamp(), (Timestamp)0);
    ASSERT_EQ(e.field_count(), (size_t)0);
}

TEST_CASE(event_typed_constructor) {
    Event e("click", 1000);
    ASSERT_STR_EQ(e.event_type(), "click");
    ASSERT_EQ(e.timestamp(), (Timestamp)1000);
}

TEST_CASE(event_unique_ids) {
    Event a, b, c;
    ASSERT_NE(a.id(), b.id());
    ASSERT_NE(b.id(), c.id());
}

TEST_CASE(event_set_get_int) {
    Event e("t", 0);
    e.set_int("count", 42);
    ASSERT_EQ(e.get_int("count"), (int64_t)42);
}

TEST_CASE(event_set_get_double) {
    Event e("t", 0);
    e.set_double("rate", 3.14);
    ASSERT_NEAR(e.get_double("rate"), 3.14, 1e-9);
}

TEST_CASE(event_set_get_string) {
    Event e("t", 0);
    e.set_string("name", "hello");
    ASSERT_STR_EQ(e.get_string("name"), "hello");
}

TEST_CASE(event_set_get_bool) {
    Event e("t", 0);
    e.set_bool("active", true);
    ASSERT_TRUE(e.get_bool("active"));
    e.set_bool("active", false);
    ASSERT_FALSE(e.get_bool("active"));
}

TEST_CASE(event_set_get_bytes) {
    Event e("t", 0);
    std::vector<uint8_t> data = {0xDE, 0xAD, 0xBE, 0xEF};
    e.set_bytes("payload", data);
    auto& got = e.get_bytes("payload");
    ASSERT_EQ(got.size(), (size_t)4);
    ASSERT_EQ(got[0], (uint8_t)0xDE);
    ASSERT_EQ(got[3], (uint8_t)0xEF);
}

TEST_CASE(event_has_field) {
    Event e("t", 0);
    ASSERT_FALSE(e.has_field("x"));
    e.set_int("x", 1);
    ASSERT_TRUE(e.has_field("x"));
}

TEST_CASE(event_field_not_found_throws) {
    Event e("t", 0);
    ASSERT_THROWS(e.get_field("missing"));
}

TEST_CASE(event_type_mismatch_throws) {
    Event e("t", 0);
    e.set_int("x", 1);
    ASSERT_THROWS(e.get_string("x"));
    ASSERT_THROWS(e.get_double("x"));
    ASSERT_THROWS(e.get_bool("x"));
}

TEST_CASE(event_overwrite_field) {
    Event e("t", 0);
    e.set_int("x", 1);
    ASSERT_EQ(e.get_int("x"), (int64_t)1);
    e.set_int("x", 99);
    ASSERT_EQ(e.get_int("x"), (int64_t)99);
}

TEST_CASE(event_field_names_contains_all) {
    Event e("t", 0);
    e.set_int("z", 1);
    e.set_int("a", 2);
    e.set_int("m", 3);
    auto names = e.field_names();
    ASSERT_EQ(names.size(), (size_t)3);
    std::sort(names.begin(), names.end());
    ASSERT_STR_EQ(names[0], "a");
    ASSERT_STR_EQ(names[1], "m");
    ASSERT_STR_EQ(names[2], "z");
}

TEST_CASE(event_clone) {
    Event orig("click", 500);
    orig.set_int("x", 10);
    orig.set_string("label", "ok");
    Event copy = orig.clone();
    ASSERT_NE(copy.id(), orig.id());
    ASSERT_STR_EQ(copy.event_type(), "click");
    ASSERT_EQ(copy.timestamp(), (Timestamp)500);
    ASSERT_EQ(copy.get_int("x"), (int64_t)10);
    ASSERT_STR_EQ(copy.get_string("label"), "ok");
}

TEST_CASE(event_estimated_size) {
    Event e("t", 0);
    e.set_string("data", std::string(1000, 'x'));
    ASSERT_GT(e.estimated_size(), (size_t)1000);
}

TEST_CASE(event_set_field_variant) {
    Event e("t", 0);
    e.set_field("val", FieldValue(int64_t(77)));
    ASSERT_EQ(e.get_int("val"), (int64_t)77);
}

TEST_CASE(event_set_timestamp) {
    Event e("t", 0);
    e.set_timestamp(999);
    ASSERT_EQ(e.timestamp(), (Timestamp)999);
}

TEST_CASE(event_many_fields) {
    Event e("big", 0);
    for (int i = 0; i < 100; i++) {
        e.set_int("field_" + std::to_string(i), i);
    }
    ASSERT_EQ(e.field_count(), (size_t)100);
    ASSERT_EQ(e.get_int("field_50"), (int64_t)50);
    ASSERT_EQ(e.get_int("field_99"), (int64_t)99);
}

TEST_CASE(event_empty_string_field) {
    Event e("t", 0);
    e.set_string("s", "");
    ASSERT_STR_EQ(e.get_string("s"), "");
}

TEST_CASE(event_empty_bytes_field) {
    Event e("t", 0);
    e.set_bytes("b", {});
    ASSERT_EQ(e.get_bytes("b").size(), (size_t)0);
}

TEST_CASE(event_negative_int) {
    Event e("t", 0);
    e.set_int("neg", -42);
    ASSERT_EQ(e.get_int("neg"), (int64_t)-42);
}

TEST_CASE(event_large_timestamp) {
    Event e("t", UINT64_MAX);
    ASSERT_EQ(e.timestamp(), UINT64_MAX);
}

TEST_CASE(event_clear_fields) {
    Event e("t", 100);
    e.set_int("a", 1);
    e.set_string("b", "hello");
    e.set_double("c", 3.14);
    ASSERT_EQ(e.field_count(), (size_t)3);
    e.clear_fields();
    ASSERT_EQ(e.field_count(), (size_t)0);
    ASSERT_FALSE(e.has_field("a"));
    ASSERT_FALSE(e.has_field("b"));
    ASSERT_FALSE(e.has_field("c"));
}

TEST_CASE(event_estimated_size_cached) {
    Event e("t", 0);
    e.set_string("data", std::string(1000, 'x'));
    size_t s1 = e.estimated_size();
    size_t s2 = e.estimated_size();
    ASSERT_EQ(s1, s2);
    ASSERT_GT(s1, (size_t)1000);
    e.set_string("more", "y");
    size_t s3 = e.estimated_size();
    ASSERT_GT(s3, s1);
}

TEST_CASE(event_pool_clears_stale_fields) {
    pulse::EventPool pool(4);
    {
        Event e = pool.acquire("first", 100);
        e.set_int("old_field", 42);
        e.set_string("stale", "data");
        pool.release(std::move(e));
    }
    Event reused = pool.acquire("second", 200);
    ASSERT_EQ(reused.field_count(), (size_t)0);
    ASSERT_FALSE(reused.has_field("old_field"));
    ASSERT_FALSE(reused.has_field("stale"));
    ASSERT_STR_EQ(reused.event_type(), "second");
    ASSERT_EQ(reused.timestamp(), (Timestamp)200);
}

RUN_ALL_TESTS()