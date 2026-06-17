#include "test_framework.hpp"
#include "pulse/flow/backpressure.hpp"

using namespace pulse;

// --- 1. Initial state: not pressured ---
TEST_CASE(bp_initial_state) {
    BackpressureController bp(100, 50);
    ASSERT_FALSE(bp.is_pressured());
    ASSERT_EQ(bp.accepted(), (uint64_t)0);
    ASSERT_EQ(bp.rejected(), (uint64_t)0);
    ASSERT_NEAR(bp.acceptance_rate(), 1.0, 0.001);
}

// --- 2. Accept below high watermark ---
TEST_CASE(bp_accept_below_high) {
    BackpressureController bp(100, 50);
    bp.update(80);
    ASSERT_FALSE(bp.is_pressured());
    ASSERT_TRUE(bp.should_accept(80));
    ASSERT_EQ(bp.accepted(), (uint64_t)1);
}

// --- 3. Pressure activates above high watermark ---
TEST_CASE(bp_pressure_activates) {
    BackpressureController bp(100, 50);
    bp.update(101);
    ASSERT_TRUE(bp.is_pressured());
}

// --- 4. Drop strategy rejects when pressured ---
TEST_CASE(bp_drop_rejects) {
    BackpressureController bp(100, 50, BackpressureStrategy::Drop);
    bp.update(101); // pressured
    ASSERT_TRUE(bp.is_pressured());
    ASSERT_FALSE(bp.should_accept(101));
    ASSERT_EQ(bp.rejected(), (uint64_t)1);
}

// --- 5. Block strategy rejects when pressured ---
TEST_CASE(bp_block_rejects) {
    BackpressureController bp(100, 50, BackpressureStrategy::Block);
    bp.update(101);
    ASSERT_FALSE(bp.should_accept(101));
    ASSERT_EQ(bp.rejected(), (uint64_t)1);
}

// --- 6. Hysteresis: stays pressured until below low watermark ---
TEST_CASE(bp_hysteresis) {
    BackpressureController bp(100, 50, BackpressureStrategy::Drop);
    bp.update(101); // enter pressured
    ASSERT_TRUE(bp.is_pressured());
    bp.update(80);  // between low and high → still pressured
    ASSERT_TRUE(bp.is_pressured());
    bp.update(60);  // still above low → still pressured
    ASSERT_TRUE(bp.is_pressured());
    bp.update(49);  // below low → release
    ASSERT_FALSE(bp.is_pressured());
}

// --- 7. Re-enter pressure after hysteresis release ---
TEST_CASE(bp_re_enter_pressure) {
    BackpressureController bp(100, 50, BackpressureStrategy::Drop);
    bp.update(101); // pressured
    bp.update(40);  // released
    ASSERT_FALSE(bp.is_pressured());
    bp.update(101); // pressured again
    ASSERT_TRUE(bp.is_pressured());
}

// --- 8. Sample strategy accepts periodically ---
TEST_CASE(bp_sample_accepts_periodically) {
    BackpressureController bp(10, 5, BackpressureStrategy::Sample);
    bp.update(11); // enter pressured — first sample (counter=0 → accepted)
    ASSERT_EQ(bp.accepted(), (uint64_t)1);
    // Next 3 are rejected (counter 1,2,3)
    bp.update(11);
    bp.update(11);
    bp.update(11);
    // counter=4 → accepted again
    bp.update(11);
    ASSERT_EQ(bp.accepted(), (uint64_t)2);
    ASSERT_EQ(bp.rejected(), (uint64_t)3);
}

// --- 9. Acceptance rate calculation ---
TEST_CASE(bp_acceptance_rate) {
    BackpressureController bp(10, 5, BackpressureStrategy::Drop);
    bp.update(5);   // accepted
    bp.update(5);   // accepted
    bp.update(11);  // pressured, rejected
    bp.update(11);  // rejected
    // 2 accepted, 2 rejected → 0.5
    ASSERT_NEAR(bp.acceptance_rate(), 0.5, 0.001);
}

// --- 10. Reset clears all counters ---
TEST_CASE(bp_reset) {
    BackpressureController bp(100, 50, BackpressureStrategy::Drop);
    bp.update(101);
    bp.update(101);
    ASSERT_TRUE(bp.is_pressured());
    bp.reset();
    ASSERT_FALSE(bp.is_pressured());
    ASSERT_EQ(bp.accepted(), (uint64_t)0);
    ASSERT_EQ(bp.rejected(), (uint64_t)0);
    ASSERT_NEAR(bp.acceptance_rate(), 1.0, 0.001);
}

// --- 11. Exact high watermark is not pressured ---
TEST_CASE(bp_exact_high_watermark) {
    BackpressureController bp(100, 50);
    bp.update(100);
    ASSERT_FALSE(bp.is_pressured());
    ASSERT_TRUE(bp.should_accept(100));
}

// --- 12. Watermark and strategy accessors ---
TEST_CASE(bp_accessors) {
    BackpressureController bp(200, 80, BackpressureStrategy::Sample);
    ASSERT_EQ(bp.high_watermark(), (size_t)200);
    ASSERT_EQ(bp.low_watermark(), (size_t)80);
    ASSERT_TRUE(bp.strategy() == BackpressureStrategy::Sample);
}

RUN_ALL_TESTS()
