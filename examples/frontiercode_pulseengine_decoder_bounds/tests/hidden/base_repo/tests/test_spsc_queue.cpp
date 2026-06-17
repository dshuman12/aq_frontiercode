#include "test_framework.hpp"
#include "pulse/buffer/spsc_queue.hpp"

using namespace pulse;

TEST_CASE(spsc_create) {
    SPSCQueue q(8);
    ASSERT_TRUE(q.empty());
    ASSERT_EQ(q.size_approx(), (size_t)0);
}

TEST_CASE(spsc_capacity_power_of_two) {
    SPSCQueue q(5);
    ASSERT_EQ(q.capacity(), (size_t)8);
    SPSCQueue q2(8);
    ASSERT_EQ(q2.capacity(), (size_t)8);
    SPSCQueue q3(1);
    ASSERT_EQ(q3.capacity(), (size_t)1);
}

TEST_CASE(spsc_zero_capacity_throws) {
    ASSERT_THROWS(SPSCQueue(0));
}

TEST_CASE(spsc_push_pop_single) {
    SPSCQueue q(4);
    Event e("test", 42);
    e.set_int("val", 100);
    ASSERT_TRUE(q.try_push(std::move(e)));
    auto got = q.try_pop();
    ASSERT_TRUE(got.has_value());
    ASSERT_STR_EQ(got->event_type(), "test");
    ASSERT_EQ(got->get_int("val"), (int64_t)100);
}

TEST_CASE(spsc_pop_empty) {
    SPSCQueue q(4);
    auto got = q.try_pop();
    ASSERT_FALSE(got.has_value());
}

TEST_CASE(spsc_fifo_order) {
    SPSCQueue q(8);
    for (int i = 0; i < 4; i++) {
        q.try_push(Event("e", static_cast<Timestamp>(i)));
    }
    for (int i = 0; i < 4; i++) {
        auto e = q.try_pop();
        ASSERT_TRUE(e.has_value());
        ASSERT_EQ(e->timestamp(), static_cast<Timestamp>(i));
    }
}

TEST_CASE(spsc_full_rejects) {
    SPSCQueue q(2);
    ASSERT_TRUE(q.try_push(Event("a", 1)));
    ASSERT_TRUE(q.try_push(Event("b", 2)));
    ASSERT_FALSE(q.try_push(Event("c", 3)));
}

TEST_CASE(spsc_push_pop_interleaved) {
    SPSCQueue q(4);
    q.try_push(Event("a", 1));
    q.try_push(Event("b", 2));
    auto e1 = q.try_pop();
    ASSERT_STR_EQ(e1->event_type(), "a");
    q.try_push(Event("c", 3));
    q.try_push(Event("d", 4));
    auto e2 = q.try_pop();
    ASSERT_STR_EQ(e2->event_type(), "b");
    auto e3 = q.try_pop();
    ASSERT_STR_EQ(e3->event_type(), "c");
    auto e4 = q.try_pop();
    ASSERT_STR_EQ(e4->event_type(), "d");
    ASSERT_TRUE(q.empty());
}

TEST_CASE(spsc_size_approx) {
    SPSCQueue q(8);
    ASSERT_EQ(q.size_approx(), (size_t)0);
    q.try_push(Event("a", 1));
    q.try_push(Event("b", 2));
    ASSERT_EQ(q.size_approx(), (size_t)2);
    q.try_pop();
    ASSERT_EQ(q.size_approx(), (size_t)1);
}

TEST_CASE(spsc_stress_sequential) {
    SPSCQueue q(16);
    for (int round = 0; round < 200; round++) {
        ASSERT_TRUE(q.try_push(Event("e", round)));
        auto e = q.try_pop();
        ASSERT_TRUE(e.has_value());
        ASSERT_EQ(e->timestamp(), static_cast<Timestamp>(round));
    }
    ASSERT_TRUE(q.empty());
}

TEST_CASE(spsc_fill_and_drain) {
    SPSCQueue q(8);
    for (int i = 0; i < 8; i++) {
        ASSERT_TRUE(q.try_push(Event("e", i)));
    }
    ASSERT_FALSE(q.try_push(Event("overflow", 99)));
    for (int i = 0; i < 8; i++) {
        auto e = q.try_pop();
        ASSERT_TRUE(e.has_value());
        ASSERT_EQ(e->timestamp(), static_cast<Timestamp>(i));
    }
    ASSERT_TRUE(q.empty());
}

TEST_CASE(spsc_single_capacity) {
    SPSCQueue q(1);
    ASSERT_EQ(q.capacity(), (size_t)1);
    ASSERT_TRUE(q.try_push(Event("a", 1)));
    ASSERT_FALSE(q.try_push(Event("b", 2)));
    auto e = q.try_pop();
    ASSERT_TRUE(e.has_value());
    ASSERT_TRUE(q.try_push(Event("c", 3)));
    auto e2 = q.try_pop();
    ASSERT_STR_EQ(e2->event_type(), "c");
}

TEST_CASE(spsc_event_data_preserved) {
    SPSCQueue q(4);
    Event orig("metric", 1000);
    orig.set_double("cpu", 95.5);
    orig.set_string("host", "server-1");
    orig.set_bool("alert", true);
    q.try_push(std::move(orig));
    auto got = q.try_pop();
    ASSERT_TRUE(got.has_value());
    ASSERT_NEAR(got->get_double("cpu"), 95.5, 1e-9);
    ASSERT_STR_EQ(got->get_string("host"), "server-1");
    ASSERT_TRUE(got->get_bool("alert"));
}

TEST_CASE(spsc_wrap_around_stress) {
    SPSCQueue q(4);
    for (int i = 0; i < 100; i++) {
        while (!q.try_push(Event("e", i))) {
            q.try_pop();
        }
    }
    while (auto e = q.try_pop()) {
        (void)e;
    }
    ASSERT_TRUE(q.empty());
}

RUN_ALL_TESTS()