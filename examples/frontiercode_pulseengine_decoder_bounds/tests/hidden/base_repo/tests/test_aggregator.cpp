#include "test_framework.hpp"
#include "pulse/aggregator/aggregator.hpp"

using namespace pulse;

TEST_CASE(agg_empty) {
    Aggregator a;
    ASSERT_TRUE(a.empty());
    ASSERT_EQ(a.count(), (uint64_t)0);
    ASSERT_NEAR(a.mean(), 0.0, 1e-9);
}

TEST_CASE(agg_single) {
    Aggregator a;
    a.add(42.0);
    ASSERT_EQ(a.count(), (uint64_t)1);
    ASSERT_NEAR(a.sum(), 42.0, 1e-9);
    ASSERT_NEAR(a.min(), 42.0, 1e-9);
    ASSERT_NEAR(a.max(), 42.0, 1e-9);
    ASSERT_NEAR(a.mean(), 42.0, 1e-9);
}

TEST_CASE(agg_multiple) {
    Aggregator a;
    a.add(10.0);
    a.add(20.0);
    a.add(30.0);
    ASSERT_EQ(a.count(), (uint64_t)3);
    ASSERT_NEAR(a.sum(), 60.0, 1e-9);
    ASSERT_NEAR(a.min(), 10.0, 1e-9);
    ASSERT_NEAR(a.max(), 30.0, 1e-9);
    ASSERT_NEAR(a.mean(), 20.0, 1e-9);
}

TEST_CASE(agg_variance_stddev) {
    Aggregator a;
    a.add(2.0);
    a.add(4.0);
    a.add(4.0);
    a.add(4.0);
    a.add(5.0);
    a.add(5.0);
    a.add(7.0);
    a.add(9.0);
    ASSERT_NEAR(a.variance(), 4.571428, 0.001);
    ASSERT_NEAR(a.stddev(), 2.138, 0.01);
}

TEST_CASE(agg_negative_values) {
    Aggregator a;
    a.add(-5.0);
    a.add(5.0);
    ASSERT_NEAR(a.sum(), 0.0, 1e-9);
    ASSERT_NEAR(a.min(), -5.0, 1e-9);
    ASSERT_NEAR(a.max(), 5.0, 1e-9);
    ASSERT_NEAR(a.mean(), 0.0, 1e-9);
}

TEST_CASE(agg_merge) {
    Aggregator a, b;
    a.add(1.0);
    a.add(2.0);
    b.add(3.0);
    b.add(4.0);
    a.merge(b);
    ASSERT_EQ(a.count(), (uint64_t)4);
    ASSERT_NEAR(a.sum(), 10.0, 1e-9);
    ASSERT_NEAR(a.min(), 1.0, 1e-9);
    ASSERT_NEAR(a.max(), 4.0, 1e-9);
    ASSERT_NEAR(a.mean(), 2.5, 1e-9);
}

TEST_CASE(agg_merge_empty) {
    Aggregator a, b;
    a.add(5.0);
    a.merge(b);
    ASSERT_EQ(a.count(), (uint64_t)1);
    ASSERT_NEAR(a.sum(), 5.0, 1e-9);
}

TEST_CASE(agg_merge_into_empty) {
    Aggregator a, b;
    b.add(5.0);
    a.merge(b);
    ASSERT_EQ(a.count(), (uint64_t)1);
    ASSERT_NEAR(a.sum(), 5.0, 1e-9);
}

TEST_CASE(agg_reset) {
    Aggregator a;
    a.add(1.0);
    a.add(2.0);
    a.reset();
    ASSERT_TRUE(a.empty());
    ASSERT_EQ(a.count(), (uint64_t)0);
    ASSERT_NEAR(a.sum(), 0.0, 1e-9);
}

TEST_CASE(agg_large_dataset) {
    Aggregator a;
    for (int i = 1; i <= 1000; i++) {
        a.add(static_cast<double>(i));
    }
    ASSERT_EQ(a.count(), (uint64_t)1000);
    ASSERT_NEAR(a.sum(), 500500.0, 1e-6);
    ASSERT_NEAR(a.mean(), 500.5, 1e-6);
    ASSERT_NEAR(a.min(), 1.0, 1e-9);
    ASSERT_NEAR(a.max(), 1000.0, 1e-9);
}

TEST_CASE(agg_single_variance) {
    Aggregator a;
    a.add(5.0);
    ASSERT_NEAR(a.variance(), 0.0, 1e-9);
}

RUN_ALL_TESTS()