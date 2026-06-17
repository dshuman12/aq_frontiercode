#include "test_framework.hpp"
#include "pulse/aggregator/top_k.hpp"

using namespace pulse;

// 1. Basic construction
TEST_CASE(topk_construction) {
    TopK tk(5);
    ASSERT_EQ(tk.k(), (size_t)5);
    ASSERT_EQ(tk.size(), (size_t)0);
    ASSERT_TRUE(tk.empty());
    ASSERT_FALSE(tk.full());
}

// 2. k=0 throws
TEST_CASE(topk_zero_k_throws) {
    ASSERT_THROWS(TopK(0));
}

// 3. Add a single item
TEST_CASE(topk_add_single) {
    TopK tk(3);
    tk.add("alpha", 10);
    ASSERT_EQ(tk.size(), (size_t)1);
    ASSERT_TRUE(tk.contains("alpha"));
    ASSERT_EQ(tk.score_of("alpha"), (int64_t)10);
    ASSERT_FALSE(tk.full());
}

// 4. Add multiple items and verify top() ordering
TEST_CASE(topk_add_check_top_order) {
    TopK tk(3);
    tk.add("a", 30);
    tk.add("b", 10);
    tk.add("c", 20);

    auto result = tk.top();
    ASSERT_EQ(result.size(), (size_t)3);
    ASSERT_STR_EQ(result[0].key, "a");
    ASSERT_STR_EQ(result[1].key, "c");
    ASSERT_STR_EQ(result[2].key, "b");
    ASSERT_EQ(result[0].score, (int64_t)30);
    ASSERT_EQ(result[1].score, (int64_t)20);
    ASSERT_EQ(result[2].score, (int64_t)10);
}

// 5. Eviction of lowest when full
TEST_CASE(topk_eviction) {
    TopK tk(3);
    tk.add("a", 10);
    tk.add("b", 20);
    tk.add("c", 30);
    ASSERT_TRUE(tk.full());

    // Insert something higher than min — lowest should be evicted
    tk.add("d", 25);
    ASSERT_EQ(tk.size(), (size_t)3);
    ASSERT_FALSE(tk.contains("a"));
    ASSERT_TRUE(tk.contains("d"));
    ASSERT_TRUE(tk.contains("b"));
    ASSERT_TRUE(tk.contains("c"));
}

// 6. Low-score item ignored when full
TEST_CASE(topk_low_score_ignored_when_full) {
    TopK tk(2);
    tk.add("a", 10);
    tk.add("b", 20);
    ASSERT_TRUE(tk.full());

    // Score below min — ignored
    tk.add("c", 5);
    ASSERT_EQ(tk.size(), (size_t)2);
    ASSERT_FALSE(tk.contains("c"));

    // Score equal to min — also ignored
    tk.add("d", 10);
    ASSERT_EQ(tk.size(), (size_t)2);
    ASSERT_FALSE(tk.contains("d"));
}

// 7. Increment existing items
TEST_CASE(topk_increment_existing) {
    TopK tk(5);
    tk.add("x", 10);
    tk.increment("x", 5);
    ASSERT_EQ(tk.score_of("x"), (int64_t)15);

    tk.increment("x"); // default delta=1
    ASSERT_EQ(tk.score_of("x"), (int64_t)16);
}

// 8. Increment inserts new key
TEST_CASE(topk_increment_new_key) {
    TopK tk(3);
    tk.increment("fresh", 42);
    ASSERT_TRUE(tk.contains("fresh"));
    ASSERT_EQ(tk.score_of("fresh"), (int64_t)42);
    ASSERT_EQ(tk.size(), (size_t)1);
}

// 9. Contains and score_of queries
TEST_CASE(topk_contains_and_score_of) {
    TopK tk(5);
    tk.add("present", 100);

    ASSERT_TRUE(tk.contains("present"));
    ASSERT_FALSE(tk.contains("absent"));
    ASSERT_EQ(tk.score_of("present"), (int64_t)100);
    ASSERT_THROWS(tk.score_of("absent"));
}

// 10. Min score tracking
TEST_CASE(topk_min_score_tracking) {
    TopK tk(3);
    ASSERT_EQ(tk.min_score(), (int64_t)0); // empty

    tk.add("a", 50);
    ASSERT_EQ(tk.min_score(), (int64_t)50);

    tk.add("b", 30);
    ASSERT_EQ(tk.min_score(), (int64_t)30);

    tk.add("c", 70);
    ASSERT_EQ(tk.min_score(), (int64_t)30);

    // Evict min (b=30) by adding d=40
    tk.add("d", 40);
    ASSERT_EQ(tk.min_score(), (int64_t)40);
}

// 11. Reset clears everything
TEST_CASE(topk_reset) {
    TopK tk(5);
    tk.add("a", 1);
    tk.add("b", 2);
    tk.add("c", 3);
    ASSERT_EQ(tk.size(), (size_t)3);

    tk.reset();
    ASSERT_TRUE(tk.empty());
    ASSERT_EQ(tk.size(), (size_t)0);
    ASSERT_EQ(tk.min_score(), (int64_t)0);
    ASSERT_FALSE(tk.contains("a"));

    auto result = tk.top();
    ASSERT_EQ(result.size(), (size_t)0);
}

// 12. Edge case: k=1 single slot
TEST_CASE(topk_k1_single_slot) {
    TopK tk(1);
    tk.add("first", 10);
    ASSERT_TRUE(tk.full());
    ASSERT_EQ(tk.size(), (size_t)1);

    // Higher score evicts "first"
    tk.add("second", 20);
    ASSERT_EQ(tk.size(), (size_t)1);
    ASSERT_TRUE(tk.contains("second"));
    ASSERT_FALSE(tk.contains("first"));

    // Lower score ignored
    tk.add("third", 5);
    ASSERT_EQ(tk.size(), (size_t)1);
    ASSERT_TRUE(tk.contains("second"));
    ASSERT_FALSE(tk.contains("third"));
}

// 13. Many items — verify only top K remain
TEST_CASE(topk_many_items_only_k_remain) {
    TopK tk(5);
    for (int i = 1; i <= 100; i++) {
        tk.add("item_" + std::to_string(i), static_cast<int64_t>(i));
    }

    ASSERT_EQ(tk.size(), (size_t)5);

    auto result = tk.top();
    ASSERT_EQ(result.size(), (size_t)5);
    ASSERT_EQ(result[0].score, (int64_t)100);
    ASSERT_EQ(result[4].score, (int64_t)96);

    ASSERT_TRUE(tk.contains("item_100"));
    ASSERT_TRUE(tk.contains("item_96"));
    ASSERT_FALSE(tk.contains("item_95"));
}

// 14. Score replacement — add same key with higher score
TEST_CASE(topk_score_replacement) {
    TopK tk(3);
    tk.add("a", 10);
    ASSERT_EQ(tk.score_of("a"), (int64_t)10);

    // Higher score replaces
    tk.add("a", 50);
    ASSERT_EQ(tk.score_of("a"), (int64_t)50);
    ASSERT_EQ(tk.size(), (size_t)1);

    // Lower score does NOT replace
    tk.add("a", 20);
    ASSERT_EQ(tk.score_of("a"), (int64_t)50);
}

// 15. Empty state queries
TEST_CASE(topk_empty_state) {
    TopK tk(10);
    ASSERT_TRUE(tk.empty());
    ASSERT_FALSE(tk.full());
    ASSERT_EQ(tk.size(), (size_t)0);
    ASSERT_EQ(tk.k(), (size_t)10);
    ASSERT_EQ(tk.min_score(), (int64_t)0);

    auto result = tk.top();
    ASSERT_EQ(result.size(), (size_t)0);
    ASSERT_FALSE(tk.contains("anything"));
}

// 16. Increment of new key causes eviction
TEST_CASE(topk_increment_eviction) {
    TopK tk(2);
    tk.add("a", 10);
    tk.add("b", 20);
    ASSERT_TRUE(tk.full());

    // Increment new key with score high enough to enter
    tk.increment("c", 15);
    ASSERT_EQ(tk.size(), (size_t)2);
    ASSERT_FALSE(tk.contains("a")); // evicted (was min=10)
    ASSERT_TRUE(tk.contains("c"));
    ASSERT_TRUE(tk.contains("b"));
}

// 17. Default score values
TEST_CASE(topk_default_score_values) {
    TopK tk(5);
    tk.add("key1"); // default score = 1
    ASSERT_EQ(tk.score_of("key1"), (int64_t)1);

    tk.increment("key2"); // default delta = 1
    ASSERT_EQ(tk.score_of("key2"), (int64_t)1);
}

// 18. Repeated increments accumulate
TEST_CASE(topk_repeated_increments) {
    TopK tk(3);
    for (int i = 0; i < 100; i++) {
        tk.increment("counter", 1);
    }
    ASSERT_EQ(tk.score_of("counter"), (int64_t)100);
    ASSERT_EQ(tk.size(), (size_t)1);
}

// 19. Reuse after reset
TEST_CASE(topk_reuse_after_reset) {
    TopK tk(2);
    tk.add("old1", 100);
    tk.add("old2", 200);
    tk.reset();

    tk.add("new1", 5);
    tk.add("new2", 15);
    ASSERT_EQ(tk.size(), (size_t)2);
    ASSERT_TRUE(tk.contains("new1"));
    ASSERT_TRUE(tk.contains("new2"));
    ASSERT_FALSE(tk.contains("old1"));
    ASSERT_EQ(tk.min_score(), (int64_t)5);
}

// 20. Increment promotes existing item above eviction threshold
TEST_CASE(topk_increment_promotes_existing) {
    TopK tk(3);
    tk.add("a", 10);
    tk.add("b", 20);
    tk.add("c", 30);

    // Promote 'a' so it is no longer the minimum
    tk.increment("a", 25); // a = 35, b = 20, c = 30
    ASSERT_EQ(tk.score_of("a"), (int64_t)35);
    ASSERT_EQ(tk.min_score(), (int64_t)20);

    // Now b is min — adding d=25 should evict b
    tk.add("d", 25);
    ASSERT_EQ(tk.size(), (size_t)3);
    ASSERT_FALSE(tk.contains("b"));
    ASSERT_TRUE(tk.contains("a"));
    ASSERT_TRUE(tk.contains("c"));
    ASSERT_TRUE(tk.contains("d"));
}

RUN_ALL_TESTS()
