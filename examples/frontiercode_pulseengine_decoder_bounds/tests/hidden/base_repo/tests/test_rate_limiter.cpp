#include "test_framework.hpp"
#include "pulse/flow/rate_limiter.hpp"

using namespace pulse;

// --- 1. Construction & initial state ---
TEST_CASE(rl_initial_state) {
    RateLimiter rl(1.0, 10.0);
    ASSERT_NEAR(rl.available_tokens(), 10.0, 0.001);
    ASSERT_NEAR(rl.max_burst(), 10.0, 0.001);
    ASSERT_NEAR(rl.rate(), 1.0, 0.001);
    ASSERT_EQ(rl.total_acquired(), (uint64_t)0);
    ASSERT_EQ(rl.total_rejected(), (uint64_t)0);
}

// --- 2. Single acquire succeeds ---
TEST_CASE(rl_single_acquire) {
    RateLimiter rl(1.0, 10.0);
    ASSERT_TRUE(rl.try_acquire(0));
    ASSERT_NEAR(rl.available_tokens(), 9.0, 0.001);
    ASSERT_EQ(rl.total_acquired(), (uint64_t)1);
}

// --- 3. Drain entire bucket ---
TEST_CASE(rl_drain_bucket) {
    RateLimiter rl(1.0, 5.0);
    for (int i = 0; i < 5; ++i) {
        ASSERT_TRUE(rl.try_acquire(0));
    }
    ASSERT_NEAR(rl.available_tokens(), 0.0, 0.001);
    ASSERT_EQ(rl.total_acquired(), (uint64_t)5);
}

// --- 4. Rejection when empty ---
TEST_CASE(rl_rejection_when_empty) {
    RateLimiter rl(1.0, 2.0);
    ASSERT_TRUE(rl.try_acquire(0));
    ASSERT_TRUE(rl.try_acquire(0));
    ASSERT_FALSE(rl.try_acquire(0));
    ASSERT_EQ(rl.total_rejected(), (uint64_t)1);
}

// --- 5. Token refill over time ---
TEST_CASE(rl_refill) {
    RateLimiter rl(1.0, 10.0); // 1 token per ms
    // drain all
    for (int i = 0; i < 10; ++i) rl.try_acquire(0);
    ASSERT_NEAR(rl.available_tokens(), 0.0, 0.001);
    // wait 5ms worth
    ASSERT_TRUE(rl.try_acquire(5, 1.0));
    // 5 tokens refilled, 1 consumed → 4 left
    ASSERT_NEAR(rl.available_tokens(), 4.0, 0.001);
}

// --- 6. Refill capped at max_burst ---
TEST_CASE(rl_refill_capped) {
    RateLimiter rl(1.0, 5.0);
    rl.try_acquire(0, 3.0); // 2 left
    // wait very long — should cap at max_burst
    rl.try_acquire(1000, 0.0); // consume 0, just refill
    ASSERT_NEAR(rl.available_tokens(), 5.0, 0.001);
}

// --- 7. Acquire multiple tokens at once ---
TEST_CASE(rl_multi_token_acquire) {
    RateLimiter rl(1.0, 10.0);
    ASSERT_TRUE(rl.try_acquire(0, 7.0));
    ASSERT_NEAR(rl.available_tokens(), 3.0, 0.001);
    ASSERT_FALSE(rl.try_acquire(0, 5.0));
    ASSERT_EQ(rl.total_rejected(), (uint64_t)1);
}

// --- 8. Burst capacity respected ---
TEST_CASE(rl_burst_capacity) {
    RateLimiter rl(0.5, 3.0);
    ASSERT_TRUE(rl.try_acquire(0, 3.0));
    ASSERT_FALSE(rl.try_acquire(0, 1.0));
    // Wait 2 ms → refill 1 token
    ASSERT_TRUE(rl.try_acquire(2, 1.0));
}

// --- 9. Reset restores full bucket ---
TEST_CASE(rl_reset) {
    RateLimiter rl(1.0, 10.0);
    rl.try_acquire(0, 8.0);
    rl.try_acquire(0, 5.0); // rejected
    ASSERT_EQ(rl.total_acquired(), (uint64_t)1);
    ASSERT_EQ(rl.total_rejected(), (uint64_t)1);
    rl.reset();
    ASSERT_NEAR(rl.available_tokens(), 10.0, 0.001);
    ASSERT_EQ(rl.total_acquired(), (uint64_t)0);
    ASSERT_EQ(rl.total_rejected(), (uint64_t)0);
}

// --- 10. Fractional rate ---
TEST_CASE(rl_fractional_rate) {
    RateLimiter rl(0.1, 5.0); // 0.1 token per ms
    rl.try_acquire(0, 5.0); // drain
    // After 10 ms → 1 token
    ASSERT_TRUE(rl.try_acquire(10, 1.0));
    ASSERT_FALSE(rl.try_acquire(10, 1.0)); // no more time elapsed
}

// --- 11. Zero tokens acquire succeeds ---
TEST_CASE(rl_zero_token_acquire) {
    RateLimiter rl(1.0, 10.0);
    ASSERT_TRUE(rl.try_acquire(0, 0.0));
    ASSERT_NEAR(rl.available_tokens(), 10.0, 0.001);
    ASSERT_EQ(rl.total_acquired(), (uint64_t)1);
}

// --- 12. Steady-state throughput ---
TEST_CASE(rl_steady_state) {
    RateLimiter rl(1.0, 5.0); // 1 token/ms, burst 5
    // Consume 1 token every 1 ms — should always succeed
    for (Timestamp t = 0; t < 20; ++t) {
        ASSERT_TRUE(rl.try_acquire(t));
    }
    ASSERT_EQ(rl.total_acquired(), (uint64_t)20);
    ASSERT_EQ(rl.total_rejected(), (uint64_t)0);
}

// --- 13. Rejection counter increments ---
TEST_CASE(rl_rejection_counter) {
    RateLimiter rl(1.0, 1.0);
    ASSERT_TRUE(rl.try_acquire(0));
    ASSERT_FALSE(rl.try_acquire(0));
    ASSERT_FALSE(rl.try_acquire(0));
    ASSERT_FALSE(rl.try_acquire(0));
    ASSERT_EQ(rl.total_rejected(), (uint64_t)3);
}

// --- 14. Large burst consume and partial refill ---
TEST_CASE(rl_partial_refill) {
    RateLimiter rl(2.0, 20.0); // 2 tokens/ms
    rl.try_acquire(0, 20.0); // drain
    ASSERT_NEAR(rl.available_tokens(), 0.0, 0.001);
    // After 3ms → 6 tokens refilled
    ASSERT_TRUE(rl.try_acquire(3, 5.0));
    ASSERT_NEAR(rl.available_tokens(), 1.0, 0.001);
}

RUN_ALL_TESTS()
