#include "test_framework.hpp"
#include "pulse/flow/circuit_breaker.hpp"

using namespace pulse;

// --- 1. Initial state is Closed ---
TEST_CASE(cb_initial_state) {
    CircuitBreaker cb(3, 1000);
    ASSERT_TRUE(cb.state() == CircuitBreaker::State::Closed);
    ASSERT_EQ(cb.failure_count(), (uint64_t)0);
    ASSERT_EQ(cb.success_count(), (uint64_t)0);
    ASSERT_EQ(cb.trip_count(), (uint64_t)0);
}

// --- 2. Closed allows requests ---
TEST_CASE(cb_closed_allows) {
    CircuitBreaker cb(3, 1000);
    ASSERT_TRUE(cb.allow(0));
    ASSERT_TRUE(cb.allow(100));
}

// --- 3. Failures below threshold stay Closed ---
TEST_CASE(cb_below_threshold) {
    CircuitBreaker cb(3, 1000);
    cb.record_failure(10);
    cb.record_failure(20);
    ASSERT_TRUE(cb.state() == CircuitBreaker::State::Closed);
    ASSERT_EQ(cb.failure_count(), (uint64_t)2);
}

// --- 4. Closed → Open on threshold ---
TEST_CASE(cb_trip_open) {
    CircuitBreaker cb(3, 1000);
    cb.record_failure(10);
    cb.record_failure(20);
    cb.record_failure(30);
    ASSERT_TRUE(cb.state() == CircuitBreaker::State::Open);
    ASSERT_EQ(cb.trip_count(), (uint64_t)1);
}

// --- 5. Open rejects requests ---
TEST_CASE(cb_open_rejects) {
    CircuitBreaker cb(2, 1000);
    cb.record_failure(0);
    cb.record_failure(0);
    ASSERT_TRUE(cb.state() == CircuitBreaker::State::Open);
    ASSERT_FALSE(cb.allow(500)); // before timeout
}

// --- 6. Open → HalfOpen after timeout ---
TEST_CASE(cb_open_to_halfopen) {
    CircuitBreaker cb(2, 100);
    cb.record_failure(0);
    cb.record_failure(0);
    ASSERT_TRUE(cb.state() == CircuitBreaker::State::Open);
    ASSERT_TRUE(cb.allow(100)); // exactly at timeout → HalfOpen
    ASSERT_TRUE(cb.state() == CircuitBreaker::State::HalfOpen);
}

// --- 7. HalfOpen → Closed on success ---
TEST_CASE(cb_halfopen_to_closed) {
    CircuitBreaker cb(2, 100);
    cb.record_failure(0);
    cb.record_failure(0);
    cb.allow(100); // transition to HalfOpen
    cb.record_success(100);
    ASSERT_TRUE(cb.state() == CircuitBreaker::State::Closed);
}

// --- 8. HalfOpen → Open on failure ---
TEST_CASE(cb_halfopen_to_open) {
    CircuitBreaker cb(2, 100);
    cb.record_failure(0);
    cb.record_failure(0);
    cb.allow(100); // HalfOpen
    cb.record_failure(110);
    ASSERT_TRUE(cb.state() == CircuitBreaker::State::Open);
    ASSERT_EQ(cb.trip_count(), (uint64_t)2);
}

// --- 9. Success resets failure count in Closed ---
TEST_CASE(cb_success_resets_failures) {
    CircuitBreaker cb(3, 1000);
    cb.record_failure(0);
    cb.record_failure(0);
    ASSERT_EQ(cb.failure_count(), (uint64_t)2);
    cb.record_success(0);
    ASSERT_EQ(cb.failure_count(), (uint64_t)0);
}

// --- 10. Trip count accumulates ---
TEST_CASE(cb_trip_count_accumulates) {
    CircuitBreaker cb(1, 50);
    // Trip 1
    cb.record_failure(0);
    ASSERT_TRUE(cb.state() == CircuitBreaker::State::Open);
    cb.allow(50); // HalfOpen
    cb.record_success(50);
    ASSERT_TRUE(cb.state() == CircuitBreaker::State::Closed);
    // Trip 2
    cb.record_failure(60);
    ASSERT_TRUE(cb.state() == CircuitBreaker::State::Open);
    cb.allow(110); // HalfOpen
    cb.record_success(110);
    // Trip 3
    cb.record_failure(120);
    ASSERT_EQ(cb.trip_count(), (uint64_t)3);
}

// --- 11. Multiple success threshold in HalfOpen ---
TEST_CASE(cb_multi_success_threshold) {
    CircuitBreaker cb(2, 100, 3); // need 3 successes to close
    cb.record_failure(0);
    cb.record_failure(0);
    cb.allow(100); // HalfOpen
    cb.record_success(100);
    ASSERT_TRUE(cb.state() == CircuitBreaker::State::HalfOpen);
    cb.record_success(101);
    ASSERT_TRUE(cb.state() == CircuitBreaker::State::HalfOpen);
    cb.record_success(102);
    ASSERT_TRUE(cb.state() == CircuitBreaker::State::Closed);
}

// --- 12. Reset restores Closed ---
TEST_CASE(cb_reset) {
    CircuitBreaker cb(2, 100);
    cb.record_failure(0);
    cb.record_failure(0);
    ASSERT_TRUE(cb.state() == CircuitBreaker::State::Open);
    cb.reset();
    ASSERT_TRUE(cb.state() == CircuitBreaker::State::Closed);
    ASSERT_EQ(cb.failure_count(), (uint64_t)0);
    ASSERT_EQ(cb.trip_count(), (uint64_t)0);
}

// --- 13. Open stays open before timeout ---
TEST_CASE(cb_open_stays_before_timeout) {
    CircuitBreaker cb(1, 500);
    cb.record_failure(0);
    ASSERT_FALSE(cb.allow(100));
    ASSERT_FALSE(cb.allow(200));
    ASSERT_FALSE(cb.allow(499));
    ASSERT_TRUE(cb.state() == CircuitBreaker::State::Open);
}

// --- 14. Full cycle Closed → Open → HalfOpen → Closed ---
TEST_CASE(cb_full_cycle) {
    CircuitBreaker cb(2, 100);
    ASSERT_TRUE(cb.state() == CircuitBreaker::State::Closed);
    cb.record_failure(0);
    cb.record_failure(10);
    ASSERT_TRUE(cb.state() == CircuitBreaker::State::Open);
    ASSERT_FALSE(cb.allow(50));
    ASSERT_TRUE(cb.allow(110));
    ASSERT_TRUE(cb.state() == CircuitBreaker::State::HalfOpen);
    cb.record_success(120);
    ASSERT_TRUE(cb.state() == CircuitBreaker::State::Closed);
    ASSERT_TRUE(cb.allow(200));
    ASSERT_EQ(cb.trip_count(), (uint64_t)1);
}

RUN_ALL_TESTS()
