#include "test_framework.hpp"
#include "pulse/state/state_store.hpp"

using namespace pulse;

TEST_CASE(ss_create) {
    StateStore store;
    ASSERT_TRUE(store.empty());
    ASSERT_EQ(store.size(), (size_t)0);
}

TEST_CASE(ss_put_get) {
    StateStore store;
    store.put("counter", FieldValue(int64_t(42)));
    auto v = store.get("counter");
    ASSERT_TRUE(v.has_value());
    ASSERT_EQ(std::get<int64_t>(*v), (int64_t)42);
}

TEST_CASE(ss_get_missing) {
    StateStore store;
    auto v = store.get("nope");
    ASSERT_FALSE(v.has_value());
}

TEST_CASE(ss_contains) {
    StateStore store;
    ASSERT_FALSE(store.contains("x"));
    store.put("x", FieldValue(int64_t(1)));
    ASSERT_TRUE(store.contains("x"));
}

TEST_CASE(ss_remove) {
    StateStore store;
    store.put("x", FieldValue(int64_t(1)));
    ASSERT_TRUE(store.remove("x"));
    ASSERT_FALSE(store.contains("x"));
    ASSERT_FALSE(store.remove("x"));
}

TEST_CASE(ss_clear) {
    StateStore store;
    store.put("a", FieldValue(int64_t(1)));
    store.put("b", FieldValue(int64_t(2)));
    store.clear();
    ASSERT_TRUE(store.empty());
}

TEST_CASE(ss_ttl_expiration) {
    StateStore store(10000, 0);
    store.put("temp", FieldValue(std::string("data")), 1000);
    ASSERT_TRUE(store.contains("temp"));
    store.expire(500);
    ASSERT_TRUE(store.contains("temp"));
    store.expire(1500);
    ASSERT_FALSE(store.contains("temp"));
}

TEST_CASE(ss_default_ttl) {
    StateStore store(10000, 5000);
    store.put("auto_expire", FieldValue(int64_t(1)));
    store.expire(3000);
    auto v = store.get("auto_expire");
    ASSERT_TRUE(v.has_value());
    store.expire(6000);
    auto v2 = store.get("auto_expire");
    ASSERT_FALSE(v2.has_value());
}

TEST_CASE(ss_no_ttl_never_expires) {
    StateStore store;
    store.put("forever", FieldValue(int64_t(1)));
    store.expire(999999999);
    ASSERT_TRUE(store.contains("forever"));
}

TEST_CASE(ss_peek) {
    StateStore store;
    store.put("x", FieldValue(double(3.14)));
    auto* v = store.peek("x");
    ASSERT_TRUE(v != nullptr);
    ASSERT_NEAR(std::get<double>(*v), 3.14, 1e-9);
    ASSERT_TRUE(store.peek("missing") == nullptr);
}

TEST_CASE(ss_overwrite) {
    StateStore store;
    store.put("x", FieldValue(int64_t(1)));
    store.put("x", FieldValue(int64_t(2)));
    auto v = store.get("x");
    ASSERT_EQ(std::get<int64_t>(*v), (int64_t)2);
}

TEST_CASE(ss_lru_eviction) {
    StateStore store(3);
    store.put("a", FieldValue(int64_t(1)));
    store.put("b", FieldValue(int64_t(2)));
    store.put("c", FieldValue(int64_t(3)));
    store.put("d", FieldValue(int64_t(4)));
    ASSERT_FALSE(store.contains("a"));
    ASSERT_TRUE(store.contains("d"));
    ASSERT_EQ(store.size(), (size_t)3);
}

TEST_CASE(ss_stats) {
    StateStore store;
    store.put("a", FieldValue(int64_t(1)));
    store.get("a");
    store.get("missing");
    auto s = store.stats();
    ASSERT_EQ(s.total_puts, (uint64_t)1);
    ASSERT_EQ(s.total_gets, (uint64_t)2);
    ASSERT_EQ(s.hits, (uint64_t)1);
    ASSERT_EQ(s.misses, (uint64_t)1);
}

TEST_CASE(ss_expiry_callback) {
    StateStore store(10000, 0);
    std::string expired_key;
    store.set_expiry_callback([&](const std::string& k, const FieldValue&) {
        expired_key = k;
    });
    store.put("temp", FieldValue(int64_t(1)), 100);
    store.expire(200);
    ASSERT_STR_EQ(expired_key, "temp");
}

TEST_CASE(ss_different_value_types) {
    StateStore store;
    store.put("int", FieldValue(int64_t(42)));
    store.put("dbl", FieldValue(double(3.14)));
    store.put("str", FieldValue(std::string("hello")));
    store.put("boo", FieldValue(true));
    ASSERT_EQ(store.size(), (size_t)4);
    ASSERT_EQ(std::get<int64_t>(*store.get("int")), (int64_t)42);
    ASSERT_NEAR(std::get<double>(*store.get("dbl")), 3.14, 1e-9);
    ASSERT_STR_EQ(std::get<std::string>(*store.get("str")), "hello");
    ASSERT_TRUE(std::get<bool>(*store.get("boo")));
}

TEST_CASE(ss_expire_only_expired_keys) {
    StateStore store(10000, 0);
    store.put("short", FieldValue(int64_t(1)), 100);
    store.put("long", FieldValue(int64_t(2)), 5000);
    store.put("forever", FieldValue(int64_t(3)));
    store.expire(200);
    ASSERT_FALSE(store.contains("short"));
    ASSERT_TRUE(store.contains("long"));
    ASSERT_TRUE(store.contains("forever"));
    auto s = store.stats();
    ASSERT_EQ(s.expirations, (uint64_t)1);
}

TEST_CASE(ss_many_entries) {
    StateStore store(1000);
    for (int i = 0; i < 500; i++) {
        store.put("key_" + std::to_string(i), FieldValue(int64_t(i)));
    }
    ASSERT_EQ(store.size(), (size_t)500);
    auto v = store.get("key_250");
    ASSERT_TRUE(v.has_value());
    ASSERT_EQ(std::get<int64_t>(*v), (int64_t)250);
}

RUN_ALL_TESTS()