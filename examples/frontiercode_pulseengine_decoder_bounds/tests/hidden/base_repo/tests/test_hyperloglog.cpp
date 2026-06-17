#include "test_framework.hpp"
#include "pulse/aggregator/hyperloglog.hpp"

using namespace pulse;

TEST_CASE(hll_empty) {
    HyperLogLog hll;
    ASSERT_TRUE(hll.empty());
    ASSERT_NEAR(hll.estimate(), 0.0, 1.0);
}

TEST_CASE(hll_single) {
    HyperLogLog hll;
    hll.add("hello");
    ASSERT_FALSE(hll.empty());
    double est = hll.estimate();
    ASSERT_GT(est, 0.0);
    ASSERT_LT(est, 5.0);
}

TEST_CASE(hll_duplicates) {
    HyperLogLog hll;
    for (int i = 0; i < 100; i++) hll.add("same");
    double est = hll.estimate();
    ASSERT_GT(est, 0.0);
    ASSERT_LT(est, 5.0);
}

TEST_CASE(hll_100_unique) {
    HyperLogLog hll;
    for (int i = 0; i < 100; i++) {
        hll.add("item_" + std::to_string(i));
    }
    double est = hll.estimate();
    ASSERT_GT(est, 80.0);
    ASSERT_LT(est, 130.0);
}

TEST_CASE(hll_1000_unique) {
    HyperLogLog hll;
    for (int i = 0; i < 1000; i++) {
        hll.add("user_" + std::to_string(i));
    }
    double est = hll.estimate();
    double error = std::abs(est - 1000.0) / 1000.0;
    ASSERT_LT(error, 0.05);
}

TEST_CASE(hll_10000_unique) {
    HyperLogLog hll(14);
    for (int i = 0; i < 10000; i++) {
        hll.add("key_" + std::to_string(i));
    }
    double est = hll.estimate();
    double error = std::abs(est - 10000.0) / 10000.0;
    ASSERT_LT(error, 0.05);
}

TEST_CASE(hll_merge) {
    HyperLogLog a(12), b(12);
    for (int i = 0; i < 500; i++) a.add("a_" + std::to_string(i));
    for (int i = 0; i < 500; i++) b.add("b_" + std::to_string(i));
    a.merge(b);
    double est = a.estimate();
    ASSERT_GT(est, 800.0);
    ASSERT_LT(est, 1200.0);
}

TEST_CASE(hll_merge_overlapping) {
    HyperLogLog a(12), b(12);
    for (int i = 0; i < 500; i++) a.add("item_" + std::to_string(i));
    for (int i = 250; i < 750; i++) b.add("item_" + std::to_string(i));
    a.merge(b);
    double est = a.estimate();
    ASSERT_GT(est, 600.0);
    ASSERT_LT(est, 900.0);
}

TEST_CASE(hll_reset) {
    HyperLogLog hll;
    hll.add("test");
    hll.reset();
    ASSERT_TRUE(hll.empty());
}

TEST_CASE(hll_precision) {
    HyperLogLog hll(10);
    ASSERT_EQ(hll.precision(), (uint8_t)10);
    ASSERT_EQ(hll.register_count(), (size_t)1024);
}

TEST_CASE(hll_invalid_precision) {
    ASSERT_THROWS(HyperLogLog(3));
    ASSERT_THROWS(HyperLogLog(19));
}

TEST_CASE(hll_merge_different_precision_throws) {
    HyperLogLog a(10), b(12);
    a.add("test");
    b.add("test");
    ASSERT_THROWS(a.merge(b));
}

TEST_CASE(hll_add_hash_direct) {
    HyperLogLog hll;
    hll.add_hash(0xDEADBEEF);
    hll.add_hash(0xCAFEBABE);
    ASSERT_FALSE(hll.empty());
}

RUN_ALL_TESTS()