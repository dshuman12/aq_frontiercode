#include "test_framework.hpp"
#include "pulse/state/map_state.hpp"

using namespace pulse;

TEST_CASE(mapstate_empty) {
    MapState<std::string, int> ms;
    ASSERT_TRUE(ms.empty());
    ASSERT_EQ(ms.size(), (size_t)0);
}

TEST_CASE(mapstate_put_get) {
    MapState<std::string, int> ms;
    ms.put("a", 42);
    auto v = ms.get("a");
    ASSERT_TRUE(v.has_value());
    ASSERT_EQ(*v, 42);
}

TEST_CASE(mapstate_get_missing) {
    MapState<std::string, int> ms;
    auto v = ms.get("nope");
    ASSERT_FALSE(v.has_value());
}

TEST_CASE(mapstate_contains) {
    MapState<std::string, int> ms;
    ASSERT_FALSE(ms.contains("x"));
    ms.put("x", 1);
    ASSERT_TRUE(ms.contains("x"));
}

TEST_CASE(mapstate_remove) {
    MapState<std::string, int> ms;
    ms.put("k", 10);
    ASSERT_TRUE(ms.remove("k"));
    ASSERT_FALSE(ms.contains("k"));
    ASSERT_FALSE(ms.remove("k"));
}

TEST_CASE(mapstate_clear) {
    MapState<std::string, int> ms;
    ms.put("a", 1);
    ms.put("b", 2);
    ms.put("c", 3);
    ms.clear();
    ASSERT_TRUE(ms.empty());
    ASSERT_EQ(ms.size(), (size_t)0);
}

TEST_CASE(mapstate_overwrite) {
    MapState<std::string, int> ms;
    ms.put("k", 1);
    ms.put("k", 99);
    ASSERT_EQ(*ms.get("k"), 99);
    ASSERT_EQ(ms.size(), (size_t)1);
}

TEST_CASE(mapstate_keys) {
    MapState<std::string, int> ms;
    ms.put("x", 1);
    ms.put("y", 2);
    ms.put("z", 3);
    auto k = ms.keys();
    ASSERT_EQ(k.size(), (size_t)3);
}

TEST_CASE(mapstate_for_each) {
    MapState<std::string, int> ms;
    ms.put("a", 10);
    ms.put("b", 20);
    ms.put("c", 30);
    int sum = 0;
    ms.for_each([&](const std::string&, const int& v) { sum += v; });
    ASSERT_EQ(sum, 60);
}

TEST_CASE(mapstate_get_or_default) {
    MapState<std::string, int> ms;
    ms.put("present", 7);
    ASSERT_EQ(ms.get_or_default("present", -1), 7);
    ASSERT_EQ(ms.get_or_default("absent", -1), -1);
}

TEST_CASE(mapstate_get_or_create) {
    MapState<std::string, int> ms;
    int& ref = ms.get_or_create("new_key", []() { return 123; });
    ASSERT_EQ(ref, 123);
    ASSERT_TRUE(ms.contains("new_key"));
    // Second call returns existing value, factory not invoked
    int& ref2 = ms.get_or_create("new_key", []() { return 999; });
    ASSERT_EQ(ref2, 123);
}

TEST_CASE(mapstate_update) {
    MapState<std::string, int> ms;
    ms.put("counter", 5);
    ms.update("counter", [](const int& v) { return v * 3; });
    ASSERT_EQ(*ms.get("counter"), 15);
}

TEST_CASE(mapstate_update_missing_throws) {
    MapState<std::string, int> ms;
    ASSERT_THROWS(ms.update("nope", [](const int& v) { return v; }));
}

TEST_CASE(mapstate_int_keys) {
    MapState<int, std::string> ms;
    ms.put(1, "one");
    ms.put(2, "two");
    ASSERT_EQ(ms.size(), (size_t)2);
    ASSERT_TRUE(ms.get(1).has_value());
    ASSERT_STR_EQ(*ms.get(1), "one");
}

RUN_ALL_TESTS()
