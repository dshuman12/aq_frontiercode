#include "test_framework.hpp"
#include "pulse/aggregator/count_min_sketch.hpp"

using namespace pulse;

// --- Construction ---

TEST_CASE(cms_construction_basic) {
    CountMinSketch cms(100, 5);
    ASSERT_EQ(cms.width(), (size_t)100);
    ASSERT_EQ(cms.depth(), (size_t)5);
    ASSERT_TRUE(cms.empty());
    ASSERT_EQ(cms.total_count(), (uint64_t)0);
}

TEST_CASE(cms_construction_invalid_width) {
    ASSERT_THROWS(CountMinSketch(0, 5));
}

TEST_CASE(cms_construction_invalid_depth) {
    ASSERT_THROWS(CountMinSketch(100, 0));
}

// --- Basic add / estimate ---

TEST_CASE(cms_add_single) {
    CountMinSketch cms(256, 4);
    cms.add("hello");
    ASSERT_FALSE(cms.empty());
    ASSERT_EQ(cms.total_count(), (uint64_t)1);
    int64_t est = cms.estimate("hello");
    ASSERT_GE(est, (int64_t)1);
}

TEST_CASE(cms_add_with_count) {
    CountMinSketch cms(256, 4);
    cms.add("hello", 10);
    ASSERT_EQ(cms.total_count(), (uint64_t)10);
    int64_t est = cms.estimate("hello");
    ASSERT_GE(est, (int64_t)10);
}

// --- Multiple adds to same key ---

TEST_CASE(cms_multiple_adds_same_key) {
    CountMinSketch cms(1024, 5);
    for (int i = 0; i < 50; ++i) {
        cms.add("repeated");
    }
    int64_t est = cms.estimate("repeated");
    ASSERT_GE(est, (int64_t)50);
    ASSERT_EQ(cms.total_count(), (uint64_t)50);
}

// --- Different keys get independent counts ---

TEST_CASE(cms_independent_keys) {
    CountMinSketch cms(2048, 6);
    cms.add("alpha", 100);
    cms.add("beta", 200);
    cms.add("gamma", 300);

    int64_t ea = cms.estimate("alpha");
    int64_t eb = cms.estimate("beta");
    int64_t eg = cms.estimate("gamma");

    // Never underestimates
    ASSERT_GE(ea, (int64_t)100);
    ASSERT_GE(eb, (int64_t)200);
    ASSERT_GE(eg, (int64_t)300);

    ASSERT_EQ(cms.total_count(), (uint64_t)600);
}

// --- Estimate never underestimates (positive stream) ---

TEST_CASE(cms_never_underestimates) {
    CountMinSketch cms(512, 5);
    // Insert known counts for several keys
    cms.add("x", 42);
    cms.add("y", 17);
    cms.add("z", 99);

    ASSERT_GE(cms.estimate("x"), (int64_t)42);
    ASSERT_GE(cms.estimate("y"), (int64_t)17);
    ASSERT_GE(cms.estimate("z"), (int64_t)99);
}

// --- Unseen key returns zero (on a wide-enough sketch) ---

TEST_CASE(cms_unseen_key) {
    CountMinSketch cms(4096, 8);
    // With 4096 width and 8 depth, an unseen key should very likely be 0
    int64_t est = cms.estimate("never_inserted");
    ASSERT_EQ(est, (int64_t)0);
}

// --- Merge two sketches ---

TEST_CASE(cms_merge) {
    CountMinSketch a(512, 5);
    CountMinSketch b(512, 5);

    a.add("key1", 30);
    b.add("key1", 20);
    b.add("key2", 50);

    a.merge(b);

    // After merge: key1 count should be >= 30 + 20 = 50
    ASSERT_GE(a.estimate("key1"), (int64_t)50);
    // key2 count should be >= 50
    ASSERT_GE(a.estimate("key2"), (int64_t)50);
    // Total should be 30 + 20 + 50 = 100
    ASSERT_EQ(a.total_count(), (uint64_t)100);
}

TEST_CASE(cms_merge_dimension_mismatch) {
    CountMinSketch a(100, 5);
    CountMinSketch b(200, 5);
    ASSERT_THROWS(a.merge(b));

    CountMinSketch c(100, 3);
    ASSERT_THROWS(a.merge(c));
}

// --- Reset ---

TEST_CASE(cms_reset) {
    CountMinSketch cms(256, 4);
    cms.add("foo", 100);
    cms.add("bar", 200);

    ASSERT_FALSE(cms.empty());
    ASSERT_EQ(cms.total_count(), (uint64_t)300);

    cms.reset();

    ASSERT_TRUE(cms.empty());
    ASSERT_EQ(cms.total_count(), (uint64_t)0);
    ASSERT_EQ(cms.estimate("foo"), (int64_t)0);
    ASSERT_EQ(cms.estimate("bar"), (int64_t)0);
}

// --- Total count tracking ---

TEST_CASE(cms_total_count_tracking) {
    CountMinSketch cms(256, 4);
    cms.add("a", 5);
    cms.add("b", 10);
    cms.add("a", 3);
    ASSERT_EQ(cms.total_count(), (uint64_t)18);
}

// --- Factory method with_error_rate ---

TEST_CASE(cms_with_error_rate) {
    // epsilon=0.01, delta=0.01
    // expected width = ceil(e / 0.01) = ceil(271.83) = 272
    // expected depth = ceil(ln(100))  = ceil(4.605)  = 5
    CountMinSketch cms = CountMinSketch::with_error_rate(0.01, 0.01);
    ASSERT_EQ(cms.width(), (size_t)272);
    ASSERT_EQ(cms.depth(), (size_t)5);
    ASSERT_TRUE(cms.empty());
}

TEST_CASE(cms_with_error_rate_invalid) {
    ASSERT_THROWS(CountMinSketch::with_error_rate(0.0, 0.5));
    ASSERT_THROWS(CountMinSketch::with_error_rate(1.0, 0.5));
    ASSERT_THROWS(CountMinSketch::with_error_rate(0.5, 0.0));
    ASSERT_THROWS(CountMinSketch::with_error_rate(0.5, 1.0));
    ASSERT_THROWS(CountMinSketch::with_error_rate(-0.1, 0.5));
    ASSERT_THROWS(CountMinSketch::with_error_rate(0.5, -0.1));
}

// --- Edge cases ---

TEST_CASE(cms_empty_key) {
    CountMinSketch cms(256, 4);
    cms.add("", 5);
    int64_t est = cms.estimate("");
    ASSERT_GE(est, (int64_t)5);
    ASSERT_EQ(cms.total_count(), (uint64_t)5);
}

TEST_CASE(cms_negative_count) {
    CountMinSketch cms(256, 4);
    cms.add("item", 10);
    cms.add("item", -3);
    int64_t est = cms.estimate("item");
    // After adding 10 then -3, the net count should be 7
    // Estimate should be >= 7 (since each bucket had 10, then -3 → 7)
    ASSERT_EQ(est, (int64_t)7);
}

// --- Stress test with many keys ---

TEST_CASE(cms_stress_many_keys) {
    // Use a reasonably large sketch
    CountMinSketch cms(2048, 7);
    const int num_keys = 1000;

    for (int i = 0; i < num_keys; ++i) {
        std::string key = "stress_key_" + std::to_string(i);
        cms.add(key, i + 1);
    }

    ASSERT_EQ(cms.total_count(), (uint64_t)(num_keys * (num_keys + 1) / 2));

    // Verify no underestimates for all keys
    int overestimate_count = 0;
    for (int i = 0; i < num_keys; ++i) {
        std::string key = "stress_key_" + std::to_string(i);
        int64_t expected = static_cast<int64_t>(i + 1);
        int64_t est = cms.estimate(key);
        ASSERT_GE(est, expected);
        if (est > expected) {
            overestimate_count++;
        }
    }

    // With 2048 width and 7 depth, most estimates should be exact.
    // Allow up to 10% overestimates for 1000 keys.
    ASSERT_LT(overestimate_count, 100);
}

// --- Small sketch overestimates but never underestimates ---

TEST_CASE(cms_small_sketch_overestimate_property) {
    // Intentionally tiny sketch to force collisions
    CountMinSketch cms(8, 2);

    cms.add("a", 100);
    cms.add("b", 200);
    cms.add("c", 300);
    cms.add("d", 400);

    // No underestimates allowed, even with collisions
    ASSERT_GE(cms.estimate("a"), (int64_t)100);
    ASSERT_GE(cms.estimate("b"), (int64_t)200);
    ASSERT_GE(cms.estimate("c"), (int64_t)300);
    ASSERT_GE(cms.estimate("d"), (int64_t)400);
}

RUN_ALL_TESTS()
