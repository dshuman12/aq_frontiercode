#include "test_framework.hpp"
#include "pulse/filter/sampling_filter.hpp"

using namespace pulse;

TEST_CASE(sf_create) {
    SamplingFilter sf(0.5);
    ASSERT_NEAR(sf.sample_rate(), 0.5, 0.001);
    ASSERT_EQ(sf.sampled_count(), (uint64_t)0);
    ASSERT_EQ(sf.total_count(), (uint64_t)0);
}

TEST_CASE(sf_rate_one_samples_all) {
    SamplingFilter sf(1.0);
    int sampled = 0;
    for (int i = 0; i < 100; i++) {
        if (sf.should_sample()) sampled++;
    }
    ASSERT_EQ(sampled, 100);
    ASSERT_EQ(sf.sampled_count(), (uint64_t)100);
    ASSERT_EQ(sf.total_count(), (uint64_t)100);
}

TEST_CASE(sf_rate_zero_throws) {
    ASSERT_THROWS(SamplingFilter(0.0));
}

TEST_CASE(sf_rate_negative_throws) {
    ASSERT_THROWS(SamplingFilter(-0.5));
}

TEST_CASE(sf_rate_above_one_throws) {
    ASSERT_THROWS(SamplingFilter(1.5));
}

TEST_CASE(sf_half_rate_deterministic) {
    SamplingFilter sf(0.5);
    // Period = 2 → should sample every other event.
    ASSERT_TRUE(sf.should_sample());   // 1st → sampled
    ASSERT_FALSE(sf.should_sample());  // 2nd → skipped
    ASSERT_TRUE(sf.should_sample());   // 3rd → sampled
    ASSERT_FALSE(sf.should_sample());  // 4th → skipped
    ASSERT_EQ(sf.sampled_count(), (uint64_t)2);
    ASSERT_EQ(sf.total_count(), (uint64_t)4);
}

TEST_CASE(sf_quarter_rate) {
    SamplingFilter sf(0.25);
    // Period = 4 → sample every 4th event (1st, 5th, 9th, ...).
    int sampled = 0;
    for (int i = 0; i < 20; i++) {
        if (sf.should_sample()) sampled++;
    }
    ASSERT_EQ(sampled, 5);
}

TEST_CASE(sf_key_based_consistent) {
    SamplingFilter sf(0.5);
    // Same key should always produce the same result.
    bool first = sf.should_sample("user_123");
    // Reset and try again — the hash is deterministic so the result
    // for "user_123" should be the same each call.
    SamplingFilter sf2(0.5);
    bool second = sf2.should_sample("user_123");
    ASSERT_EQ(first, second);
}

TEST_CASE(sf_key_different_keys_vary) {
    SamplingFilter sf(0.5);
    // With many distinct keys, roughly half should be sampled.
    int sampled = 0;
    for (int i = 0; i < 1000; i++) {
        if (sf.should_sample("key_" + std::to_string(i))) sampled++;
    }
    // With rate=0.5 and period=2, about 50% of hashes should hit.
    // Allow generous tolerance for hash distribution.
    ASSERT_GT(sampled, 300);
    ASSERT_LT(sampled, 700);
}

TEST_CASE(sf_actual_rate) {
    SamplingFilter sf(0.25);
    for (int i = 0; i < 100; i++) {
        sf.should_sample();
    }
    ASSERT_NEAR(sf.actual_rate(), 0.25, 0.01);
}

TEST_CASE(sf_actual_rate_empty) {
    SamplingFilter sf(0.5);
    ASSERT_NEAR(sf.actual_rate(), 0.0, 0.001);
}

TEST_CASE(sf_reset) {
    SamplingFilter sf(0.5);
    for (int i = 0; i < 10; i++) sf.should_sample();
    ASSERT_GT(sf.total_count(), (uint64_t)0);
    ASSERT_GT(sf.sampled_count(), (uint64_t)0);

    sf.reset();
    ASSERT_EQ(sf.total_count(), (uint64_t)0);
    ASSERT_EQ(sf.sampled_count(), (uint64_t)0);
}

TEST_CASE(sf_period_calculation) {
    SamplingFilter sf1(1.0);
    ASSERT_EQ(sf1.period(), (uint64_t)1);

    SamplingFilter sf2(0.5);
    ASSERT_EQ(sf2.period(), (uint64_t)2);

    SamplingFilter sf3(0.1);
    ASSERT_EQ(sf3.period(), (uint64_t)10);
}

RUN_ALL_TESTS()
