#include "test_framework.hpp"
#include "pulse/aggregator/ema.hpp"

using namespace pulse;

// 1 — freshly constructed EMA is empty
TEST_CASE(ema_empty) {
    ExponentialMovingAverage ema(0.5);
    ASSERT_TRUE(ema.empty());
    ASSERT_EQ(ema.count(), (uint64_t)0);
    ASSERT_NEAR(ema.value(), 0.0, 1e-12);
}

// 2 — single observation: EMA equals that value
TEST_CASE(ema_single_value) {
    ExponentialMovingAverage ema(0.3);
    ema.add(42.0);
    ASSERT_FALSE(ema.empty());
    ASSERT_EQ(ema.count(), (uint64_t)1);
    ASSERT_NEAR(ema.value(), 42.0, 1e-12);
}

// 3 — two observations with alpha = 0.5
TEST_CASE(ema_two_values) {
    ExponentialMovingAverage ema(0.5);
    ema.add(10.0);
    ema.add(20.0);
    // EMA = 0.5 * 20 + 0.5 * 10 = 15
    ASSERT_EQ(ema.count(), (uint64_t)2);
    ASSERT_NEAR(ema.value(), 15.0, 1e-12);
}

// 4 — three observations, manual check
TEST_CASE(ema_three_values) {
    ExponentialMovingAverage ema(0.25);
    ema.add(4.0);   // EMA = 4
    ema.add(8.0);   // EMA = 0.25*8 + 0.75*4 = 5
    ema.add(12.0);  // EMA = 0.25*12 + 0.75*5 = 6.75
    ASSERT_EQ(ema.count(), (uint64_t)3);
    ASSERT_NEAR(ema.value(), 6.75, 1e-12);
}

// 5 — alpha = 1 means EMA always equals the latest value
TEST_CASE(ema_alpha_one) {
    ExponentialMovingAverage ema(1.0);
    ema.add(5.0);
    ema.add(100.0);
    ema.add(-3.0);
    ASSERT_NEAR(ema.value(), -3.0, 1e-12);
}

// 6 — with_span factory produces correct alpha
TEST_CASE(ema_with_span) {
    auto ema = ExponentialMovingAverage::with_span(9);
    // alpha = 2/(9+1) = 0.2
    ASSERT_NEAR(ema.alpha(), 0.2, 1e-12);
    ASSERT_TRUE(ema.empty());
}

// 7 — with_span span=1 gives alpha=1
TEST_CASE(ema_with_span_one) {
    auto ema = ExponentialMovingAverage::with_span(1);
    // alpha = 2/(1+1) = 1.0
    ASSERT_NEAR(ema.alpha(), 1.0, 1e-12);
}

// 8 — constructor throws on alpha = 0
TEST_CASE(ema_throw_alpha_zero) {
    ASSERT_THROWS(ExponentialMovingAverage(0.0));
}

// 9 — constructor throws on negative alpha
TEST_CASE(ema_throw_alpha_negative) {
    ASSERT_THROWS(ExponentialMovingAverage(-0.5));
}

// 10 — constructor throws on alpha > 1
TEST_CASE(ema_throw_alpha_too_large) {
    ASSERT_THROWS(ExponentialMovingAverage(1.01));
}

// 11 — with_span(0) throws
TEST_CASE(ema_throw_span_zero) {
    ASSERT_THROWS(ExponentialMovingAverage::with_span(0));
}

// 12 — reset clears state but keeps alpha
TEST_CASE(ema_reset) {
    ExponentialMovingAverage ema(0.4);
    ema.add(10.0);
    ema.add(20.0);
    ema.reset();
    ASSERT_TRUE(ema.empty());
    ASSERT_EQ(ema.count(), (uint64_t)0);
    ASSERT_NEAR(ema.value(), 0.0, 1e-12);
    ASSERT_NEAR(ema.alpha(), 0.4, 1e-12);
}

// 13 — many values converge toward the constant input
TEST_CASE(ema_convergence) {
    ExponentialMovingAverage ema(0.1);
    for (int i = 0; i < 500; ++i) {
        ema.add(100.0);
    }
    ASSERT_NEAR(ema.value(), 100.0, 1e-9);
    ASSERT_EQ(ema.count(), (uint64_t)500);
}

// 14 — negative values handled correctly
TEST_CASE(ema_negative_values) {
    ExponentialMovingAverage ema(0.5);
    ema.add(-10.0);  // EMA = -10
    ema.add(-20.0);  // EMA = 0.5*(-20) + 0.5*(-10) = -15
    ASSERT_NEAR(ema.value(), -15.0, 1e-12);
}

// 15 — alpha accessor returns the value passed to constructor
TEST_CASE(ema_alpha_accessor) {
    ExponentialMovingAverage ema(0.73);
    ASSERT_NEAR(ema.alpha(), 0.73, 1e-15);
}

RUN_ALL_TESTS()