#include "test_framework.hpp"
#include "pulse/aggregator/percentile.hpp"

using namespace pulse;

TEST_CASE(td_empty) {
    TDigest td;
    ASSERT_TRUE(td.empty());
    ASSERT_EQ(td.total_weight(), (uint64_t)0);
}

TEST_CASE(td_single_value) {
    TDigest td;
    td.add(42.0);
    ASSERT_NEAR(td.median(), 42.0, 1e-9);
    ASSERT_NEAR(td.p50(), 42.0, 1e-9);
}

TEST_CASE(td_uniform_distribution) {
    TDigest td;
    for (int i = 1; i <= 100; i++) {
        td.add(static_cast<double>(i));
    }
    ASSERT_NEAR(td.median(), 50.0, 5.0);
    ASSERT_NEAR(td.p90(), 90.0, 5.0);
    ASSERT_NEAR(td.p99(), 99.0, 3.0);
}

TEST_CASE(td_quantile_boundaries) {
    TDigest td;
    for (int i = 0; i < 1000; i++) {
        td.add(static_cast<double>(i));
    }
    ASSERT_NEAR(td.quantile(0.0), 0.0, 2.0);
    ASSERT_NEAR(td.quantile(1.0), 999.0, 2.0);
}

TEST_CASE(td_weighted_add) {
    TDigest td;
    td.add(10.0, 100);
    td.add(20.0, 1);
    ASSERT_NEAR(td.median(), 10.0, 1.0);
}

TEST_CASE(td_merge) {
    TDigest a, b;
    for (int i = 0; i < 500; i++) a.add(static_cast<double>(i));
    for (int i = 500; i < 1000; i++) b.add(static_cast<double>(i));
    a.merge(b);
    ASSERT_NEAR(a.median(), 500.0, 20.0);
    ASSERT_EQ(a.total_weight(), (uint64_t)1000);
}

TEST_CASE(td_reset) {
    TDigest td;
    td.add(1.0);
    td.add(2.0);
    td.reset();
    ASSERT_TRUE(td.empty());
    ASSERT_EQ(td.total_weight(), (uint64_t)0);
}

TEST_CASE(td_p95_accuracy) {
    TDigest td;
    for (int i = 0; i < 10000; i++) {
        td.add(static_cast<double>(i));
    }
    double p95 = td.p95();
    ASSERT_GT(p95, 9000.0);
    ASSERT_LT(p95, 9800.0);
}

TEST_CASE(td_identical_values) {
    TDigest td;
    for (int i = 0; i < 100; i++) td.add(5.0);
    ASSERT_NEAR(td.median(), 5.0, 1e-9);
    ASSERT_NEAR(td.p99(), 5.0, 1e-9);
}

TEST_CASE(td_two_values) {
    TDigest td;
    td.add(0.0);
    td.add(100.0);
    double med = td.median();
    ASSERT_GT(med, -10.0);
    ASSERT_LT(med, 110.0);
}

TEST_CASE(td_centroid_count_bounded) {
    TDigest td(50.0);
    for (int i = 0; i < 10000; i++) {
        td.add(static_cast<double>(i));
    }
    td.p50(); // force compress
    ASSERT_LT(td.centroid_count(), (size_t)1000);
}

RUN_ALL_TESTS()