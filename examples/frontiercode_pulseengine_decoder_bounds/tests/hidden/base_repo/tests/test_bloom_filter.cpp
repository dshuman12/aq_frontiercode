#include "test_framework.hpp"
#include "pulse/filter/bloom_filter.hpp"
#include <string>
#include <vector>
#include <cmath>

using namespace pulse;

// ---------------------------------------------------------------------------
// 1. Construction – default template parameter
// ---------------------------------------------------------------------------
TEST_CASE(bloom_construction_default) {
    BloomFilter<> bf(1000);
    ASSERT_EQ(bf.size(), static_cast<size_t>(0));
    ASSERT_EQ(bf.capacity(), static_cast<size_t>(1000));
    ASSERT_NEAR(bf.false_positive_rate(), 0.01, 0.001);
    ASSERT_GT(bf.bit_count(), static_cast<size_t>(0));
    ASSERT_EQ(bf.bits_set(), static_cast<size_t>(0));
    ASSERT_EQ(bf.hash_count(), static_cast<size_t>(5));
}

// ---------------------------------------------------------------------------
// 2. Construction – custom hash count and FPR
// ---------------------------------------------------------------------------
TEST_CASE(bloom_construction_custom) {
    BloomFilter<3> bf(500, 0.05);
    ASSERT_EQ(bf.capacity(), static_cast<size_t>(500));
    ASSERT_NEAR(bf.false_positive_rate(), 0.05, 0.001);
    ASSERT_EQ(bf.hash_count(), static_cast<size_t>(3));
}

// ---------------------------------------------------------------------------
// 3. Invalid construction parameters
// ---------------------------------------------------------------------------
TEST_CASE(bloom_invalid_construction) {
    ASSERT_THROWS(BloomFilter<>(0, 0.01));     // zero capacity
    ASSERT_THROWS(BloomFilter<>(100, 0.0));    // FPR = 0
    ASSERT_THROWS(BloomFilter<>(100, 1.0));    // FPR = 1
    ASSERT_THROWS(BloomFilter<>(100, -0.5));   // negative FPR
    ASSERT_THROWS(BloomFilter<>(100, 1.5));    // FPR > 1
}

// ---------------------------------------------------------------------------
// 4. Basic add and might_contain
// ---------------------------------------------------------------------------
TEST_CASE(bloom_add_and_might_contain) {
    BloomFilter<5> bf(100);
    ASSERT_FALSE(bf.might_contain("hello"));
    bf.add("hello");
    ASSERT_TRUE(bf.might_contain("hello"));
    ASSERT_EQ(bf.size(), static_cast<size_t>(1));
}

// ---------------------------------------------------------------------------
// 5. No false negatives – small set
// ---------------------------------------------------------------------------
TEST_CASE(bloom_no_false_negatives) {
    BloomFilter<5> bf(200);
    std::vector<std::string> items;
    for (int i = 0; i < 100; ++i) {
        items.push_back("item_" + std::to_string(i));
        bf.add(items.back());
    }
    // Every inserted item MUST be found.
    for (const auto& item : items) {
        ASSERT_TRUE(bf.might_contain(item));
    }
}

// ---------------------------------------------------------------------------
// 6. No false negatives – large set
// ---------------------------------------------------------------------------
TEST_CASE(bloom_no_false_negatives_large) {
    BloomFilter<7> bf(5000);
    std::vector<std::string> items;
    for (int i = 0; i < 2000; ++i) {
        items.push_back("element_" + std::to_string(i));
        bf.add(items.back());
    }
    for (const auto& item : items) {
        ASSERT_TRUE(bf.might_contain(item));
    }
}

// ---------------------------------------------------------------------------
// 7. Observed false-positive rate stays within a generous bound
// ---------------------------------------------------------------------------
TEST_CASE(bloom_false_positive_rate_bound) {
    const double target_fpr = 0.02;
    BloomFilter<5> bf(1000, target_fpr);

    // Fill to capacity.
    for (int i = 0; i < 1000; ++i) {
        bf.add("inserted_" + std::to_string(i));
    }

    // Probe 10 000 items that were never inserted.
    int false_positives = 0;
    for (int i = 0; i < 10000; ++i) {
        if (bf.might_contain("not_inserted_" + std::to_string(i))) {
            ++false_positives;
        }
    }
    double observed = static_cast<double>(false_positives) / 10000.0;
    // Generous ceiling – 10× target – accounts for non-optimal k choice.
    ASSERT_LT(observed, 0.20);
}

// ---------------------------------------------------------------------------
// 8. clear() resets everything
// ---------------------------------------------------------------------------
TEST_CASE(bloom_clear_resets) {
    BloomFilter<5> bf(100);
    bf.add("one");
    bf.add("two");
    bf.add("three");
    ASSERT_EQ(bf.size(), static_cast<size_t>(3));
    ASSERT_GT(bf.bits_set(), static_cast<size_t>(0));

    bf.clear();

    ASSERT_EQ(bf.size(), static_cast<size_t>(0));
    ASSERT_EQ(bf.bits_set(), static_cast<size_t>(0));
    ASSERT_FALSE(bf.might_contain("one"));
    ASSERT_FALSE(bf.might_contain("two"));
    ASSERT_FALSE(bf.might_contain("three"));
}

// ---------------------------------------------------------------------------
// 9. size() tracks every add() call (including duplicates)
// ---------------------------------------------------------------------------
TEST_CASE(bloom_size_tracks_additions) {
    BloomFilter<5> bf(100);
    ASSERT_EQ(bf.size(), static_cast<size_t>(0));
    bf.add("a");
    ASSERT_EQ(bf.size(), static_cast<size_t>(1));
    bf.add("b");
    ASSERT_EQ(bf.size(), static_cast<size_t>(2));
    bf.add("a");  // duplicate
    ASSERT_EQ(bf.size(), static_cast<size_t>(3));
}

// ---------------------------------------------------------------------------
// 10. capacity() returns the value given at construction
// ---------------------------------------------------------------------------
TEST_CASE(bloom_capacity_returns_expected) {
    BloomFilter<5> bf1(100);
    ASSERT_EQ(bf1.capacity(), static_cast<size_t>(100));
    BloomFilter<5> bf2(50000, 0.001);
    ASSERT_EQ(bf2.capacity(), static_cast<size_t>(50000));
}

// ---------------------------------------------------------------------------
// 11. merge() produces the union of two filters
// ---------------------------------------------------------------------------
TEST_CASE(bloom_merge_two_filters) {
    BloomFilter<5> a(200);
    BloomFilter<5> b(200);

    for (int i = 0; i < 50; ++i) a.add("set_a_" + std::to_string(i));
    for (int i = 0; i < 50; ++i) b.add("set_b_" + std::to_string(i));

    a.merge(b);

    for (int i = 0; i < 50; ++i) {
        ASSERT_TRUE(a.might_contain("set_a_" + std::to_string(i)));
        ASSERT_TRUE(a.might_contain("set_b_" + std::to_string(i)));
    }
    ASSERT_EQ(a.size(), static_cast<size_t>(100));
}

// ---------------------------------------------------------------------------
// 12. merge() – no false negatives in merged result
// ---------------------------------------------------------------------------
TEST_CASE(bloom_merge_no_false_negatives) {
    BloomFilter<5> a(500);
    BloomFilter<5> b(500);

    std::vector<std::string> all;
    for (int i = 0; i < 100; ++i) {
        std::string sa = "alpha_" + std::to_string(i);
        std::string sb = "beta_"  + std::to_string(i);
        a.add(sa);
        b.add(sb);
        all.push_back(sa);
        all.push_back(sb);
    }

    a.merge(b);

    for (const auto& item : all) {
        ASSERT_TRUE(a.might_contain(item));
    }
}

// ---------------------------------------------------------------------------
// 13. merge() throws on mismatched filters
// ---------------------------------------------------------------------------
TEST_CASE(bloom_merge_different_size_throws) {
    BloomFilter<5> a(100, 0.01);
    BloomFilter<5> b(200, 0.01);  // different capacity → different bit count
    a.add("x");
    b.add("y");
    ASSERT_THROWS(a.merge(b));
}

// ---------------------------------------------------------------------------
// 14. bits_set() grows monotonically with inserts
// ---------------------------------------------------------------------------
TEST_CASE(bloom_bits_set_increases) {
    BloomFilter<5> bf(1000);
    size_t prev = 0;
    for (int i = 0; i < 20; ++i) {
        bf.add("unique_key_" + std::to_string(i));
        size_t current = bf.bits_set();
        ASSERT_GE(current, prev);
        prev = current;
    }
    ASSERT_GT(bf.bits_set(), static_cast<size_t>(0));
}

// ---------------------------------------------------------------------------
// 15. estimated_count() is reasonably accurate below capacity
// ---------------------------------------------------------------------------
TEST_CASE(bloom_estimated_count_accuracy) {
    BloomFilter<5> bf(10000, 0.01);
    for (int i = 0; i < 500; ++i) {
        bf.add("estimate_item_" + std::to_string(i));
    }
    double est   = bf.estimated_count();
    double error = std::abs(est - 500.0) / 500.0;
    ASSERT_LT(error, 0.30);
}

// ---------------------------------------------------------------------------
// 16. estimated_count() on empty filter is zero
// ---------------------------------------------------------------------------
TEST_CASE(bloom_estimated_count_empty) {
    BloomFilter<5> bf(100);
    ASSERT_NEAR(bf.estimated_count(), 0.0, 0.001);
}

// ---------------------------------------------------------------------------
// 17. Empty string as a valid item
// ---------------------------------------------------------------------------
TEST_CASE(bloom_empty_string) {
    BloomFilter<5> bf(100);
    bf.add("");
    ASSERT_TRUE(bf.might_contain(""));
    ASSERT_EQ(bf.size(), static_cast<size_t>(1));
}

// ---------------------------------------------------------------------------
// 18. Very long string (10 000 chars)
// ---------------------------------------------------------------------------
TEST_CASE(bloom_very_long_string) {
    BloomFilter<5> bf(100);
    std::string long_str(10000, 'z');
    bf.add(long_str);
    ASSERT_TRUE(bf.might_contain(long_str));
    ASSERT_EQ(bf.size(), static_cast<size_t>(1));
}

// ---------------------------------------------------------------------------
// 19. Duplicate additions don't change bits but do increment size()
// ---------------------------------------------------------------------------
TEST_CASE(bloom_duplicate_addition) {
    BloomFilter<5> bf(100);
    bf.add("duplicate");
    size_t bits_first = bf.bits_set();
    bf.add("duplicate");
    size_t bits_second = bf.bits_set();
    ASSERT_EQ(bits_first, bits_second);
    ASSERT_EQ(bf.size(), static_cast<size_t>(2));
}

RUN_ALL_TESTS()
