#include "test_framework.hpp"
#include "pulse/state/lru_cache.hpp"

using namespace pulse;

TEST_CASE(lru_create) {
    LRUCache<std::string, int> cache(10);
    ASSERT_EQ(cache.capacity(), (size_t)10);
    ASSERT_EQ(cache.size(), (size_t)0);
    ASSERT_TRUE(cache.empty());
}

TEST_CASE(lru_put_get) {
    LRUCache<std::string, int> cache(10);
    cache.put("a", 1);
    auto v = cache.get("a");
    ASSERT_TRUE(v.has_value());
    ASSERT_EQ(v->get(), 1);
}

TEST_CASE(lru_get_missing) {
    LRUCache<std::string, int> cache(10);
    auto v = cache.get("missing");
    ASSERT_FALSE(v.has_value());
}

TEST_CASE(lru_peek) {
    LRUCache<std::string, int> cache(10);
    cache.put("a", 42);
    const int* p = cache.peek("a");
    ASSERT_TRUE(p != nullptr);
    ASSERT_EQ(*p, 42);
    ASSERT_TRUE(cache.peek("missing") == nullptr);
}

TEST_CASE(lru_contains) {
    LRUCache<std::string, int> cache(10);
    ASSERT_FALSE(cache.contains("a"));
    cache.put("a", 1);
    ASSERT_TRUE(cache.contains("a"));
}

TEST_CASE(lru_remove) {
    LRUCache<std::string, int> cache(10);
    cache.put("a", 1);
    ASSERT_TRUE(cache.remove("a"));
    ASSERT_FALSE(cache.contains("a"));
    ASSERT_FALSE(cache.remove("a"));
}

TEST_CASE(lru_eviction) {
    LRUCache<std::string, int> cache(3);
    cache.put("a", 1);
    cache.put("b", 2);
    cache.put("c", 3);
    ASSERT_TRUE(cache.full());
    cache.put("d", 4);
    ASSERT_FALSE(cache.contains("a"));
    ASSERT_TRUE(cache.contains("d"));
    ASSERT_EQ(cache.size(), (size_t)3);
}

TEST_CASE(lru_eviction_order) {
    LRUCache<std::string, int> cache(3);
    cache.put("a", 1);
    cache.put("b", 2);
    cache.put("c", 3);
    cache.get("a");  // a is now most recently used
    cache.put("d", 4);  // should evict b (LRU)
    ASSERT_TRUE(cache.contains("a"));
    ASSERT_FALSE(cache.contains("b"));
    ASSERT_TRUE(cache.contains("c"));
    ASSERT_TRUE(cache.contains("d"));
}

TEST_CASE(lru_overwrite) {
    LRUCache<std::string, int> cache(5);
    cache.put("a", 1);
    cache.put("a", 2);
    auto v = cache.get("a");
    ASSERT_EQ(v->get(), 2);
    ASSERT_EQ(cache.size(), (size_t)1);
}

TEST_CASE(lru_clear) {
    LRUCache<std::string, int> cache(10);
    cache.put("a", 1);
    cache.put("b", 2);
    cache.clear();
    ASSERT_TRUE(cache.empty());
    ASSERT_EQ(cache.size(), (size_t)0);
}

TEST_CASE(lru_eviction_callback) {
    LRUCache<std::string, int> cache(2);
    std::string evicted_key;
    int evicted_val = 0;
    cache.set_eviction_callback([&](const std::string& k, const int& v) {
        evicted_key = k;
        evicted_val = v;
    });
    cache.put("a", 10);
    cache.put("b", 20);
    cache.put("c", 30);
    ASSERT_STR_EQ(evicted_key, "a");
    ASSERT_EQ(evicted_val, 10);
}

TEST_CASE(lru_stats) {
    LRUCache<std::string, int> cache(3);
    cache.put("a", 1);
    cache.put("b", 2);
    cache.get("a");
    cache.get("missing");
    cache.put("c", 3);
    cache.put("d", 4);
    auto s = cache.stats();
    ASSERT_EQ(s.total_puts, (uint64_t)4);
    ASSERT_GE(s.hits, (uint64_t)1);
    ASSERT_GE(s.misses, (uint64_t)1);
    ASSERT_GE(s.evictions, (uint64_t)1);
}

TEST_CASE(lru_keys) {
    LRUCache<std::string, int> cache(10);
    cache.put("b", 2);
    cache.put("a", 1);
    auto k = cache.keys();
    ASSERT_EQ(k.size(), (size_t)2);
}

TEST_CASE(lru_many_operations) {
    LRUCache<int, int> cache(100);
    for (int i = 0; i < 1000; i++) {
        cache.put(i, i * 2);
    }
    ASSERT_EQ(cache.size(), (size_t)100);
    for (int i = 900; i < 1000; i++) {
        auto v = cache.get(i);
        ASSERT_TRUE(v.has_value());
        ASSERT_EQ(v->get(), i * 2);
    }
}

TEST_CASE(lru_single_capacity) {
    LRUCache<std::string, int> cache(1);
    cache.put("a", 1);
    ASSERT_TRUE(cache.full());
    cache.put("b", 2);
    ASSERT_FALSE(cache.contains("a"));
    ASSERT_TRUE(cache.contains("b"));
}

RUN_ALL_TESTS()