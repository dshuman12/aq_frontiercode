#include "test_framework.hpp"
#include "pulse/flow/retry_policy.hpp"

using namespace pulse;

TEST_CASE(retry_basic_construction) {
    RetryPolicy p(3, 100, 2.0, 5000);
    ASSERT_EQ(p.max_retries(), (uint32_t)3);
    ASSERT_EQ(p.initial_delay_ms(), (uint64_t)100);
    ASSERT_NEAR(p.multiplier(), 2.0, 0.001);
    ASSERT_EQ(p.max_delay_ms(), (uint64_t)5000);
}

TEST_CASE(retry_default_multiplier_and_cap) {
    RetryPolicy p(5, 200);
    ASSERT_NEAR(p.multiplier(), 2.0, 0.001);
    ASSERT_EQ(p.max_delay_ms(), (uint64_t)60000);
}

TEST_CASE(retry_exponential_backoff) {
    RetryPolicy p(5, 100, 2.0, 100000);
    ASSERT_EQ(p.next_delay(0), (uint64_t)100);   // 100 * 2^0
    ASSERT_EQ(p.next_delay(1), (uint64_t)200);   // 100 * 2^1
    ASSERT_EQ(p.next_delay(2), (uint64_t)400);   // 100 * 2^2
    ASSERT_EQ(p.next_delay(3), (uint64_t)800);   // 100 * 2^3
    ASSERT_EQ(p.next_delay(4), (uint64_t)1600);  // 100 * 2^4
}

TEST_CASE(retry_delay_capped_at_max) {
    RetryPolicy p(10, 1000, 2.0, 5000);
    // 1000 * 2^3 = 8000, but capped at 5000
    ASSERT_EQ(p.next_delay(3), (uint64_t)5000);
    // higher attempts should also be capped
    ASSERT_EQ(p.next_delay(10), (uint64_t)5000);
}

TEST_CASE(retry_should_retry_within_budget) {
    RetryPolicy p(3, 100);
    ASSERT_TRUE(p.should_retry(0));
    ASSERT_TRUE(p.should_retry(1));
    ASSERT_TRUE(p.should_retry(2));
    ASSERT_FALSE(p.should_retry(3));
    ASSERT_FALSE(p.should_retry(4));
}

TEST_CASE(retry_should_retry_zero_retries) {
    RetryPolicy p(0, 100);
    ASSERT_FALSE(p.should_retry(0));
}

TEST_CASE(retry_factory_none) {
    auto p = RetryPolicy::none();
    ASSERT_EQ(p.max_retries(), (uint32_t)0);
    ASSERT_EQ(p.initial_delay_ms(), (uint64_t)0);
    ASSERT_FALSE(p.should_retry(0));
}

TEST_CASE(retry_factory_fixed) {
    auto p = RetryPolicy::fixed(4, 500);
    ASSERT_EQ(p.max_retries(), (uint32_t)4);
    ASSERT_EQ(p.initial_delay_ms(), (uint64_t)500);
    ASSERT_NEAR(p.multiplier(), 1.0, 0.001);
    // Fixed delay: every attempt should return the same
    ASSERT_EQ(p.next_delay(0), (uint64_t)500);
    ASSERT_EQ(p.next_delay(1), (uint64_t)500);
    ASSERT_EQ(p.next_delay(3), (uint64_t)500);
}

TEST_CASE(retry_factory_exponential) {
    auto p = RetryPolicy::exponential(3, 250);
    ASSERT_EQ(p.max_retries(), (uint32_t)3);
    ASSERT_EQ(p.initial_delay_ms(), (uint64_t)250);
    ASSERT_NEAR(p.multiplier(), 2.0, 0.001);
    ASSERT_EQ(p.next_delay(0), (uint64_t)250);
    ASSERT_EQ(p.next_delay(1), (uint64_t)500);
    ASSERT_EQ(p.next_delay(2), (uint64_t)1000);
}

TEST_CASE(retry_non_integer_multiplier) {
    RetryPolicy p(5, 100, 1.5, 100000);
    ASSERT_EQ(p.next_delay(0), (uint64_t)100);  // 100 * 1.5^0
    ASSERT_EQ(p.next_delay(1), (uint64_t)150);  // 100 * 1.5^1
    ASSERT_EQ(p.next_delay(2), (uint64_t)225);  // 100 * 1.5^2
}

TEST_CASE(retry_attempt_zero_delay) {
    RetryPolicy p(5, 0, 2.0, 1000);
    ASSERT_EQ(p.next_delay(0), (uint64_t)0);
    ASSERT_EQ(p.next_delay(5), (uint64_t)0);
}

TEST_CASE(retry_large_attempt_still_capped) {
    RetryPolicy p(100, 1, 2.0, 10000);
    // 2^50 would overflow, but capped at 10000
    ASSERT_LE(p.next_delay(50), (uint64_t)10000);
}

RUN_ALL_TESTS()
