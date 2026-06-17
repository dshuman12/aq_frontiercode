#include "test_framework.hpp"
#include "pulse/aggregator/histogram.hpp"

using namespace pulse;

// --- 1. Construction ---

TEST_CASE(hist_construction_basic) {
    Histogram h(0.0, 100.0, 10);
    ASSERT_EQ(h.num_buckets(), (size_t)10);
    ASSERT_NEAR(h.min_value(), 0.0, 1e-12);
    ASSERT_NEAR(h.max_value(), 100.0, 1e-12);
    ASSERT_TRUE(h.empty());
    ASSERT_EQ(h.count(), (uint64_t)0);
}

TEST_CASE(hist_construction_throws_zero_buckets) {
    ASSERT_THROWS(Histogram(0.0, 100.0, 0));
}

TEST_CASE(hist_construction_throws_min_gt_max) {
    ASSERT_THROWS(Histogram(100.0, 0.0, 10));
}

// --- 2. Record values ---

TEST_CASE(hist_record_basic) {
    Histogram h(0.0, 100.0, 10);
    h.record(5.0);
    h.record(15.0);
    h.record(95.0);
    ASSERT_EQ(h.count(), (uint64_t)3);
    ASSERT_FALSE(h.empty());
    ASSERT_EQ(h.bucket_count(0), (uint64_t)1);  // 5.0 → bucket 0 [0,10)
    ASSERT_EQ(h.bucket_count(1), (uint64_t)1);  // 15.0 → bucket 1 [10,20)
    ASSERT_EQ(h.bucket_count(9), (uint64_t)1);  // 95.0 → bucket 9 [90,100)
    ASSERT_EQ(h.overflow_count(), (uint64_t)0);
    ASSERT_EQ(h.underflow_count(), (uint64_t)0);
}

TEST_CASE(hist_record_multiple_same_bucket) {
    Histogram h(0.0, 10.0, 5);
    // bucket 0 is [0, 2), width = 2
    h.record(0.0);
    h.record(0.5);
    h.record(1.0);
    h.record(1.999);
    ASSERT_EQ(h.bucket_count(0), (uint64_t)4);
    ASSERT_EQ(h.count(), (uint64_t)4);
}

// --- 3. Bucket boundaries ---

TEST_CASE(hist_bucket_boundaries) {
    Histogram h(0.0, 100.0, 10);
    // Each bucket has width 10
    ASSERT_NEAR(h.bucket_lower(0), 0.0, 1e-12);
    ASSERT_NEAR(h.bucket_upper(0), 10.0, 1e-12);
    ASSERT_NEAR(h.bucket_lower(5), 50.0, 1e-12);
    ASSERT_NEAR(h.bucket_upper(5), 60.0, 1e-12);
    ASSERT_NEAR(h.bucket_lower(9), 90.0, 1e-12);
    ASSERT_NEAR(h.bucket_upper(9), 100.0, 1e-12);
}

TEST_CASE(hist_bucket_out_of_range_throws) {
    Histogram h(0.0, 10.0, 5);
    ASSERT_THROWS(h.bucket_lower(5));
    ASSERT_THROWS(h.bucket_upper(5));
    ASSERT_THROWS(h.bucket_count(5));
}

// --- 4. Overflow/underflow tracking ---

TEST_CASE(hist_overflow_underflow) {
    Histogram h(10.0, 20.0, 5);
    h.record(5.0);    // underflow
    h.record(9.999);  // underflow
    h.record(20.0);   // overflow (>= max)
    h.record(100.0);  // overflow
    h.record(15.0);   // in range
    ASSERT_EQ(h.underflow_count(), (uint64_t)2);
    ASSERT_EQ(h.overflow_count(), (uint64_t)2);
    ASSERT_EQ(h.count(), (uint64_t)5);
}

// --- 5. bucket_for lookup ---

TEST_CASE(hist_bucket_for) {
    Histogram h(0.0, 100.0, 10);
    ASSERT_EQ(h.bucket_for(0.0), (size_t)0);
    ASSERT_EQ(h.bucket_for(9.99), (size_t)0);
    ASSERT_EQ(h.bucket_for(10.0), (size_t)1);
    ASSERT_EQ(h.bucket_for(50.0), (size_t)5);
    // Values below min clamp to bucket 0
    ASSERT_EQ(h.bucket_for(-1.0), (size_t)0);
    // Values at/above max clamp to last bucket
    ASSERT_EQ(h.bucket_for(100.0), (size_t)9);
    ASSERT_EQ(h.bucket_for(999.0), (size_t)9);
}

// --- 6. Value on exact boundary ---

TEST_CASE(hist_value_on_boundary) {
    Histogram h(0.0, 100.0, 10);
    // 10.0 is the boundary between bucket 0 and 1
    h.record(10.0);
    ASSERT_EQ(h.bucket_count(1), (uint64_t)1);  // goes to bucket 1
    ASSERT_EQ(h.bucket_count(0), (uint64_t)0);
    // max_value boundary goes to overflow
    h.record(100.0);
    ASSERT_EQ(h.overflow_count(), (uint64_t)1);
    // min_value boundary goes to bucket 0
    h.record(0.0);
    ASSERT_EQ(h.bucket_count(0), (uint64_t)1);
}

// --- 7. Percentile estimation ---

TEST_CASE(hist_percentile) {
    Histogram h(0.0, 100.0, 100);
    // Fill uniformly: one value per bucket
    for (int i = 0; i < 100; i++) {
        h.record(static_cast<double>(i) + 0.5);
    }
    // Median should be near 50
    double p50 = h.percentile(0.5);
    ASSERT_NEAR(p50, 50.0, 2.0);
    // p90 should be near 90
    double p90 = h.percentile(0.9);
    ASSERT_NEAR(p90, 90.0, 2.0);
    // Boundaries
    double p0 = h.percentile(0.0);
    ASSERT_NEAR(p0, 0.0, 1e-9);
    double p100 = h.percentile(1.0);
    ASSERT_NEAR(p100, 100.0, 1e-9);
}

TEST_CASE(hist_percentile_empty) {
    Histogram h(0.0, 100.0, 10);
    ASSERT_NEAR(h.percentile(0.5), 0.0, 1e-12);
}

// --- 8. Mean calculation ---

TEST_CASE(hist_mean) {
    Histogram h(0.0, 100.0, 10);
    // Record values at midpoints of first and last bucket
    // Bucket 0: [0,10), midpoint = 5.  Bucket 9: [90,100), midpoint = 95.
    h.record(5.0);
    h.record(95.0);
    // Estimated mean from midpoints: (5 + 95) / 2 = 50
    ASSERT_NEAR(h.mean(), 50.0, 1.0);
}

TEST_CASE(hist_mean_with_overflow_underflow) {
    Histogram h(10.0, 20.0, 5);
    h.record(15.0);    // bucket 2, midpoint = 15
    h.record(5.0);     // underflow, estimated at min (10)
    h.record(25.0);    // overflow, estimated at max (20)
    // mean ≈ (15 + 10 + 20) / 3 = 15
    ASSERT_NEAR(h.mean(), 15.0, 1.0);
}

TEST_CASE(hist_mean_empty) {
    Histogram h(0.0, 100.0, 10);
    ASSERT_NEAR(h.mean(), 0.0, 1e-12);
}

// --- 9. Merge two histograms ---

TEST_CASE(hist_merge) {
    Histogram a(0.0, 100.0, 10);
    Histogram b(0.0, 100.0, 10);
    a.record(5.0);
    a.record(15.0);
    b.record(5.0);
    b.record(95.0);
    b.record(200.0);   // overflow in b
    a.merge(b);
    ASSERT_EQ(a.count(), (uint64_t)5);
    ASSERT_EQ(a.bucket_count(0), (uint64_t)2);   // 5.0 from a + 5.0 from b
    ASSERT_EQ(a.bucket_count(1), (uint64_t)1);   // 15.0 from a
    ASSERT_EQ(a.bucket_count(9), (uint64_t)1);   // 95.0 from b
    ASSERT_EQ(a.overflow_count(), (uint64_t)1);
}

TEST_CASE(hist_merge_incompatible_throws) {
    Histogram a(0.0, 100.0, 10);
    Histogram b(0.0, 50.0, 10);
    ASSERT_THROWS(a.merge(b));

    Histogram c(0.0, 100.0, 5);
    ASSERT_THROWS(a.merge(c));
}

// --- 10. Reset ---

TEST_CASE(hist_reset) {
    Histogram h(0.0, 100.0, 10);
    h.record(5.0);
    h.record(50.0);
    h.record(200.0);
    h.record(-1.0);
    h.reset();
    ASSERT_TRUE(h.empty());
    ASSERT_EQ(h.count(), (uint64_t)0);
    ASSERT_EQ(h.overflow_count(), (uint64_t)0);
    ASSERT_EQ(h.underflow_count(), (uint64_t)0);
    for (size_t i = 0; i < h.num_buckets(); i++) {
        ASSERT_EQ(h.bucket_count(i), (uint64_t)0);
    }
    // Configuration preserved
    ASSERT_EQ(h.num_buckets(), (size_t)10);
    ASSERT_NEAR(h.min_value(), 0.0, 1e-12);
    ASSERT_NEAR(h.max_value(), 100.0, 1e-12);
}

// --- 11. Edge case: min == max (degenerate range) ---

TEST_CASE(hist_degenerate_min_eq_max) {
    Histogram h(5.0, 5.0, 3);
    ASSERT_EQ(h.num_buckets(), (size_t)3);
    // Value exactly at the point goes to bucket 0
    h.record(5.0);
    ASSERT_EQ(h.bucket_count(0), (uint64_t)1);
    ASSERT_EQ(h.overflow_count(), (uint64_t)0);
    ASSERT_EQ(h.underflow_count(), (uint64_t)0);
    // Values above go to overflow
    h.record(6.0);
    ASSERT_EQ(h.overflow_count(), (uint64_t)1);
    // Values below go to underflow
    h.record(4.0);
    ASSERT_EQ(h.underflow_count(), (uint64_t)1);
    ASSERT_EQ(h.count(), (uint64_t)3);
}

// --- 12. Edge case: single bucket ---

TEST_CASE(hist_single_bucket) {
    Histogram h(0.0, 100.0, 1);
    ASSERT_EQ(h.num_buckets(), (size_t)1);
    ASSERT_NEAR(h.bucket_lower(0), 0.0, 1e-12);
    ASSERT_NEAR(h.bucket_upper(0), 100.0, 1e-12);
    h.record(0.0);
    h.record(50.0);
    h.record(99.999);
    ASSERT_EQ(h.bucket_count(0), (uint64_t)3);
    // Overflow
    h.record(100.0);
    ASSERT_EQ(h.overflow_count(), (uint64_t)1);
    // bucket_for always returns 0 for in-range and clamped
    ASSERT_EQ(h.bucket_for(50.0), (size_t)0);
    ASSERT_EQ(h.bucket_for(200.0), (size_t)0);
}

// --- 13. Percentile with all values in one bucket ---

TEST_CASE(hist_percentile_single_cluster) {
    Histogram h(0.0, 100.0, 10);
    // All values in bucket 5 [50, 60)
    for (int i = 0; i < 100; i++) {
        h.record(55.0);
    }
    double p50 = h.percentile(0.5);
    // Should be within bucket 5 bounds
    ASSERT_GE(p50, 50.0);
    ASSERT_LE(p50, 60.0);
}

// --- 14. Stress test with many values ---

TEST_CASE(hist_stress_many_values) {
    Histogram h(0.0, 1000.0, 100);
    const int N = 100000;
    for (int i = 0; i < N; i++) {
        double v = static_cast<double>(i % 1000) + 0.5;
        h.record(v);
    }
    ASSERT_EQ(h.count(), (uint64_t)N);
    ASSERT_EQ(h.overflow_count(), (uint64_t)0);
    ASSERT_EQ(h.underflow_count(), (uint64_t)0);
    // Each bucket should have N/100 = 1000 values (uniform mod distribution)
    for (size_t i = 0; i < 100; i++) {
        ASSERT_EQ(h.bucket_count(i), (uint64_t)1000);
    }
    // Mean should be near 500
    ASSERT_NEAR(h.mean(), 500.0, 5.0);
    // Median should be near 500
    ASSERT_NEAR(h.percentile(0.5), 500.0, 10.0);
}

// --- 15. Merge then verify percentile ---

TEST_CASE(hist_merge_then_percentile) {
    Histogram a(0.0, 100.0, 100);
    Histogram b(0.0, 100.0, 100);
    // a gets lower half, b gets upper half
    for (int i = 0; i < 50; i++) {
        a.record(static_cast<double>(i) + 0.5);
    }
    for (int i = 50; i < 100; i++) {
        b.record(static_cast<double>(i) + 0.5);
    }
    a.merge(b);
    ASSERT_EQ(a.count(), (uint64_t)100);
    ASSERT_NEAR(a.percentile(0.5), 50.0, 2.0);
    ASSERT_NEAR(a.percentile(0.25), 25.0, 2.0);
    ASSERT_NEAR(a.percentile(0.75), 75.0, 2.0);
}

// --- 16. Record at exact min and max-epsilon ---

TEST_CASE(hist_exact_min_max_boundary) {
    Histogram h(0.0, 10.0, 10);
    // min goes to bucket 0
    h.record(0.0);
    ASSERT_EQ(h.bucket_count(0), (uint64_t)1);
    // Just under max goes to last bucket
    h.record(9.999);
    ASSERT_EQ(h.bucket_count(9), (uint64_t)1);
    // Exactly max goes to overflow
    h.record(10.0);
    ASSERT_EQ(h.overflow_count(), (uint64_t)1);
    ASSERT_EQ(h.count(), (uint64_t)3);
}

// --- 17. Fractional bucket widths ---

TEST_CASE(hist_fractional_widths) {
    // 3 buckets over [0, 1): each width = 1/3 ≈ 0.3333
    Histogram h(0.0, 1.0, 3);
    h.record(0.0);    // bucket 0
    h.record(0.33);   // bucket 0
    h.record(0.34);   // bucket 1
    h.record(0.67);   // bucket 2
    h.record(0.99);   // bucket 2
    ASSERT_EQ(h.bucket_count(0), (uint64_t)2);
    ASSERT_EQ(h.bucket_count(1), (uint64_t)1);
    ASSERT_EQ(h.bucket_count(2), (uint64_t)2);
}

// --- 18. Negative range ---

TEST_CASE(hist_negative_range) {
    Histogram h(-50.0, 50.0, 10);
    h.record(-50.0);   // bucket 0
    h.record(-25.0);   // bucket 2
    h.record(0.0);     // bucket 5
    h.record(25.0);    // bucket 7
    h.record(49.99);   // bucket 9
    h.record(-100.0);  // underflow
    h.record(50.0);    // overflow
    ASSERT_EQ(h.count(), (uint64_t)7);
    ASSERT_EQ(h.underflow_count(), (uint64_t)1);
    ASSERT_EQ(h.overflow_count(), (uint64_t)1);
    ASSERT_NEAR(h.bucket_lower(0), -50.0, 1e-12);
    ASSERT_NEAR(h.bucket_upper(9), 50.0, 1e-12);
}

RUN_ALL_TESTS()
