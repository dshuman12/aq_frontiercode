#include "test_framework.hpp"
#include "pulse/timer/timer_wheel.hpp"

using namespace pulse;

TEST_CASE(tw_create) {
    TimerWheel tw(64, 10);
    ASSERT_EQ(tw.slot_count(), (size_t)64);
    ASSERT_EQ(tw.pending_count(), (size_t)0);
    ASSERT_EQ(tw.total_fired(), (uint64_t)0);
}

TEST_CASE(tw_zero_slots_throws) {
    ASSERT_THROWS(TimerWheel(0, 1));
}

TEST_CASE(tw_zero_tick_throws) {
    ASSERT_THROWS(TimerWheel(64, 0));
}

TEST_CASE(tw_schedule_and_fire) {
    TimerWheel tw(64, 1);
    int fired = 0;
    tw.schedule(10, [&](TimerId) { fired++; });
    ASSERT_EQ(tw.pending_count(), (size_t)1);
    tw.advance(10);
    ASSERT_EQ(fired, 1);
    ASSERT_EQ(tw.total_fired(), (uint64_t)1);
}

TEST_CASE(tw_cancel) {
    TimerWheel tw(64, 1);
    int fired = 0;
    auto id = tw.schedule(10, [&](TimerId) { fired++; });
    ASSERT_TRUE(tw.cancel(id));
    tw.advance(20);
    ASSERT_EQ(fired, 0);
    ASSERT_EQ(tw.total_cancelled(), (uint64_t)1);
}

TEST_CASE(tw_cancel_nonexistent) {
    TimerWheel tw(64, 1);
    ASSERT_FALSE(tw.cancel(999));
}

TEST_CASE(tw_recurring) {
    TimerWheel tw(64, 1);
    int fired = 0;
    tw.schedule_recurring(5, [&](TimerId) { fired++; });
    tw.advance(25);
    ASSERT_GE(fired, 4);
}

TEST_CASE(tw_cancel_recurring) {
    TimerWheel tw(64, 1);
    int fired = 0;
    auto id = tw.schedule_recurring(5, [&](TimerId) { fired++; });
    tw.advance(12);
    int before = fired;
    tw.cancel(id);
    tw.advance(30);
    ASSERT_EQ(fired, before);
}

TEST_CASE(tw_multiple_timers) {
    TimerWheel tw(256, 1);
    int a = 0, b = 0, c = 0;
    tw.schedule(5, [&](TimerId) { a++; });
    tw.schedule(10, [&](TimerId) { b++; });
    tw.schedule(15, [&](TimerId) { c++; });
    ASSERT_EQ(tw.pending_count(), (size_t)3);
    tw.advance(20);
    ASSERT_EQ(a, 1);
    ASSERT_EQ(b, 1);
    ASSERT_EQ(c, 1);
}

TEST_CASE(tw_fire_order) {
    TimerWheel tw(256, 1);
    std::vector<int> order;
    tw.schedule(3, [&](TimerId) { order.push_back(3); });
    tw.schedule(1, [&](TimerId) { order.push_back(1); });
    tw.schedule(2, [&](TimerId) { order.push_back(2); });
    tw.advance(5);
    ASSERT_EQ(order.size(), (size_t)3);
    ASSERT_EQ(order[0], 1);
    ASSERT_EQ(order[1], 2);
    ASSERT_EQ(order[2], 3);
}

TEST_CASE(tw_overflow_timers) {
    TimerWheel tw(8, 1);
    int fired = 0;
    tw.schedule(20, [&](TimerId) { fired++; });
    tw.advance(25);
    ASSERT_EQ(fired, 1);
}

TEST_CASE(tw_timer_id_unique) {
    TimerWheel tw(64, 1);
    auto id1 = tw.schedule(10, [](TimerId) {});
    auto id2 = tw.schedule(20, [](TimerId) {});
    ASSERT_NE(id1, id2);
}

TEST_CASE(tw_timer_receives_id) {
    TimerWheel tw(64, 1);
    TimerId received_id = 0;
    auto id = tw.schedule(5, [&](TimerId tid) { received_id = tid; });
    tw.advance(10);
    ASSERT_EQ(received_id, id);
}

TEST_CASE(tw_current_time) {
    TimerWheel tw(64, 10);
    ASSERT_EQ(tw.current_time(), (Timestamp)0);
    tw.advance(50);
    ASSERT_EQ(tw.current_time(), (Timestamp)50);
}

TEST_CASE(tw_many_timers_stress) {
    TimerWheel tw(128, 1);
    int total_fired = 0;
    for (int i = 1; i <= 100; i++) {
        tw.schedule(i, [&](TimerId) { total_fired++; });
    }
    tw.advance(200);
    ASSERT_EQ(total_fired, 100);
}

TEST_CASE(tw_immediate_delay) {
    TimerWheel tw(64, 1);
    int fired = 0;
    tw.schedule(1, [&](TimerId) { fired++; });
    tw.tick();
    ASSERT_EQ(fired, 1);
}

TEST_CASE(tw_large_tick_duration) {
    TimerWheel tw(16, 100);
    int fired = 0;
    tw.schedule(500, [&](TimerId) { fired++; });
    tw.advance(600);
    ASSERT_EQ(fired, 1);
}

TEST_CASE(tw_large_advance_fires_all) {
    TimerWheel tw(64, 1);
    int fired_a = 0, fired_b = 0, fired_c = 0;
    tw.schedule(50, [&](TimerId) { fired_a++; });
    tw.schedule(500, [&](TimerId) { fired_b++; });
    tw.schedule(2000, [&](TimerId) { fired_c++; });
    tw.advance(3000);
    ASSERT_EQ(fired_a, 1);
    ASSERT_EQ(fired_b, 1);
    ASSERT_EQ(fired_c, 1);
    ASSERT_EQ(tw.total_fired(), (uint64_t)3);
}

TEST_CASE(tw_overflow_promote_after_revolution) {
    TimerWheel tw(8, 1);
    int fired = 0;
    tw.schedule(5, [&](TimerId) { fired++; });
    tw.schedule(100, [&](TimerId) { fired++; });
    tw.advance(200);
    ASSERT_EQ(fired, 2);
}

TEST_CASE(tw_recurring_with_large_advance) {
    TimerWheel tw(64, 1);
    int fired = 0;
    tw.schedule_recurring(100, [&](TimerId) { fired++; });
    tw.advance(1000);
    ASSERT_GE(fired, 9);
}

RUN_ALL_TESTS()