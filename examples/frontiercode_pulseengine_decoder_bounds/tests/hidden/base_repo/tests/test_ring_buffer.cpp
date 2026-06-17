#include "test_framework.hpp"
#include "pulse/buffer/ring_buffer.hpp"

using namespace pulse;

TEST_CASE(rb_create) {
    RingBuffer rb(8);
    ASSERT_EQ(rb.capacity(), (size_t)8);
    ASSERT_EQ(rb.size(), (size_t)0);
    ASSERT_TRUE(rb.empty());
    ASSERT_FALSE(rb.full());
}

TEST_CASE(rb_zero_capacity_throws) {
    ASSERT_THROWS(RingBuffer(0));
}

TEST_CASE(rb_push_pop) {
    RingBuffer rb(4);
    rb.push(Event("a", 1));
    rb.push(Event("b", 2));
    ASSERT_EQ(rb.size(), (size_t)2);
    auto e1 = rb.pop();
    ASSERT_TRUE(e1.has_value());
    ASSERT_STR_EQ(e1->event_type(), "a");
    auto e2 = rb.pop();
    ASSERT_TRUE(e2.has_value());
    ASSERT_STR_EQ(e2->event_type(), "b");
    ASSERT_TRUE(rb.empty());
}

TEST_CASE(rb_pop_empty) {
    RingBuffer rb(2);
    auto e = rb.pop();
    ASSERT_FALSE(e.has_value());
}

TEST_CASE(rb_peek) {
    RingBuffer rb(4);
    ASSERT_TRUE(rb.peek() == nullptr);
    rb.push(Event("x", 10));
    auto* p = rb.peek();
    ASSERT_TRUE(p != nullptr);
    ASSERT_STR_EQ(p->event_type(), "x");
    ASSERT_EQ(rb.size(), (size_t)1);
}

TEST_CASE(rb_fifo_order) {
    RingBuffer rb(10);
    for (int i = 0; i < 5; i++) {
        rb.push(Event("e", static_cast<Timestamp>(i)));
    }
    for (int i = 0; i < 5; i++) {
        auto e = rb.pop();
        ASSERT_TRUE(e.has_value());
        ASSERT_EQ(e->timestamp(), static_cast<Timestamp>(i));
    }
}

TEST_CASE(rb_drop_oldest_policy) {
    RingBuffer rb(3, OverflowPolicy::DropOldest);
    rb.push(Event("a", 1));
    rb.push(Event("b", 2));
    rb.push(Event("c", 3));
    ASSERT_TRUE(rb.full());
    bool ok = rb.push(Event("d", 4));
    ASSERT_TRUE(ok);
    ASSERT_EQ(rb.size(), (size_t)3);
    auto e = rb.pop();
    ASSERT_STR_EQ(e->event_type(), "b");
}

TEST_CASE(rb_drop_newest_policy) {
    RingBuffer rb(2, OverflowPolicy::DropNewest);
    rb.push(Event("a", 1));
    rb.push(Event("b", 2));
    bool ok = rb.push(Event("c", 3));
    ASSERT_FALSE(ok);
    ASSERT_EQ(rb.size(), (size_t)2);
    auto e = rb.pop();
    ASSERT_STR_EQ(e->event_type(), "a");
}

TEST_CASE(rb_block_policy) {
    RingBuffer rb(2, OverflowPolicy::Block);
    rb.push(Event("a", 1));
    rb.push(Event("b", 2));
    bool ok = rb.push(Event("c", 3));
    ASSERT_FALSE(ok);
    ASSERT_EQ(rb.size(), (size_t)2);
}

TEST_CASE(rb_wrap_around) {
    RingBuffer rb(3);
    rb.push(Event("a", 1));
    rb.push(Event("b", 2));
    rb.pop();
    rb.pop();
    rb.push(Event("c", 3));
    rb.push(Event("d", 4));
    rb.push(Event("e", 5));
    ASSERT_EQ(rb.size(), (size_t)3);
    ASSERT_EQ(rb.pop()->timestamp(), (Timestamp)3);
    ASSERT_EQ(rb.pop()->timestamp(), (Timestamp)4);
    ASSERT_EQ(rb.pop()->timestamp(), (Timestamp)5);
}

TEST_CASE(rb_clear) {
    RingBuffer rb(4);
    rb.push(Event("a", 1));
    rb.push(Event("b", 2));
    rb.clear();
    ASSERT_TRUE(rb.empty());
    ASSERT_EQ(rb.size(), (size_t)0);
}

TEST_CASE(rb_fill_ratio) {
    RingBuffer rb(4);
    ASSERT_NEAR(rb.fill_ratio(), 0.0, 1e-9);
    rb.push(Event("a", 1));
    rb.push(Event("b", 2));
    ASSERT_NEAR(rb.fill_ratio(), 0.5, 1e-9);
    rb.push(Event("c", 3));
    rb.push(Event("d", 4));
    ASSERT_NEAR(rb.fill_ratio(), 1.0, 1e-9);
}

TEST_CASE(rb_drain) {
    RingBuffer rb(10);
    for (int i = 0; i < 7; i++) rb.push(Event("e", i));
    auto drained = rb.drain(4);
    ASSERT_EQ(drained.size(), (size_t)4);
    ASSERT_EQ(rb.size(), (size_t)3);
    ASSERT_EQ(drained[0].timestamp(), (Timestamp)0);
    ASSERT_EQ(drained[3].timestamp(), (Timestamp)3);
}

TEST_CASE(rb_drain_more_than_available) {
    RingBuffer rb(4);
    rb.push(Event("a", 1));
    rb.push(Event("b", 2));
    auto drained = rb.drain(100);
    ASSERT_EQ(drained.size(), (size_t)2);
    ASSERT_TRUE(rb.empty());
}

TEST_CASE(rb_drain_into) {
    RingBuffer rb(4);
    rb.push(Event("a", 1));
    rb.push(Event("b", 2));
    std::vector<Event> out;
    size_t n = rb.drain_into(out, 10);
    ASSERT_EQ(n, (size_t)2);
    ASSERT_EQ(out.size(), (size_t)2);
}

TEST_CASE(rb_stats) {
    RingBuffer rb(2, OverflowPolicy::DropOldest);
    rb.push(Event("a", 1));
    rb.push(Event("b", 2));
    rb.push(Event("c", 3));
    rb.pop();
    auto s = rb.stats();
    ASSERT_EQ(s.total_pushed, (uint64_t)3);
    ASSERT_EQ(s.total_popped, (uint64_t)1);
    ASSERT_EQ(s.total_dropped, (uint64_t)1);
}

TEST_CASE(rb_overflow_callback) {
    RingBuffer rb(2, OverflowPolicy::DropOldest);
    int dropped_count = 0;
    Timestamp dropped_ts = 0;
    rb.set_overflow_callback([&](const Event& e) {
        dropped_count++;
        dropped_ts = e.timestamp();
    });
    rb.push(Event("a", 10));
    rb.push(Event("b", 20));
    rb.push(Event("c", 30));
    ASSERT_EQ(dropped_count, 1);
    ASSERT_EQ(dropped_ts, (Timestamp)10);
}

TEST_CASE(rb_overflow_callback_drop_newest) {
    RingBuffer rb(1, OverflowPolicy::DropNewest);
    int dropped_count = 0;
    rb.set_overflow_callback([&](const Event&) { dropped_count++; });
    rb.push(Event("a", 1));
    rb.push(Event("b", 2));
    ASSERT_EQ(dropped_count, 1);
}

TEST_CASE(rb_single_capacity) {
    RingBuffer rb(1);
    rb.push(Event("a", 1));
    ASSERT_TRUE(rb.full());
    rb.push(Event("b", 2));
    auto e = rb.pop();
    ASSERT_STR_EQ(e->event_type(), "b");
}

TEST_CASE(rb_stress_push_pop) {
    RingBuffer rb(16);
    for (int round = 0; round < 100; round++) {
        for (int i = 0; i < 10; i++) {
            rb.push(Event("e", round * 10 + i));
        }
        for (int i = 0; i < 10; i++) {
            auto e = rb.pop();
            ASSERT_TRUE(e.has_value());
        }
    }
    ASSERT_TRUE(rb.empty());
}

RUN_ALL_TESTS()