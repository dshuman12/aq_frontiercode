#include "test_framework.hpp"
#include "pulse/window/global_window.hpp"

using namespace pulse;

TEST_CASE(gw_create) {
    GlobalWindow w([](const std::vector<Event>&) {});
    ASSERT_EQ(w.size(), (size_t)0);
    ASSERT_TRUE(w.empty());
    ASSERT_EQ(w.flushes(), (uint64_t)0);
}

TEST_CASE(gw_null_callback_throws) {
    ASSERT_THROWS(GlobalWindow(nullptr));
}

TEST_CASE(gw_add_single) {
    GlobalWindow w([](const std::vector<Event>&) {});
    w.add(Event("click", 100));
    ASSERT_EQ(w.size(), (size_t)1);
    ASSERT_FALSE(w.empty());
}

TEST_CASE(gw_add_multiple) {
    GlobalWindow w([](const std::vector<Event>&) {});
    w.add(Event("click", 100));
    w.add(Event("view", 200));
    w.add(Event("scroll", 300));
    w.add(Event("hover", 400));
    w.add(Event("submit", 500));
    ASSERT_EQ(w.size(), (size_t)5);
}

TEST_CASE(gw_flush_calls_callback) {
    std::vector<Event> captured;
    GlobalWindow w([&](const std::vector<Event>& evts) {
        captured = evts;
    });
    w.add(Event("a", 100));
    w.add(Event("b", 200));
    w.add(Event("c", 300));
    w.flush();
    ASSERT_EQ(captured.size(), (size_t)3);
    ASSERT_STR_EQ(captured[0].event_type(), "a");
    ASSERT_STR_EQ(captured[2].event_type(), "c");
}

TEST_CASE(gw_flush_clears_buffer) {
    GlobalWindow w([](const std::vector<Event>&) {});
    w.add(Event("a", 100));
    w.add(Event("b", 200));
    ASSERT_EQ(w.size(), (size_t)2);
    w.flush();
    ASSERT_EQ(w.size(), (size_t)0);
    ASSERT_TRUE(w.empty());
}

TEST_CASE(gw_flush_empty_no_op) {
    int called = 0;
    GlobalWindow w([&](const std::vector<Event>&) { called++; });
    w.flush();
    ASSERT_EQ(called, 0);
    ASSERT_EQ(w.flushes(), (uint64_t)0);
}

TEST_CASE(gw_flush_counter) {
    GlobalWindow w([](const std::vector<Event>&) {});
    w.add(Event("a", 100));
    w.flush();
    ASSERT_EQ(w.flushes(), (uint64_t)1);
    w.add(Event("b", 200));
    w.flush();
    ASSERT_EQ(w.flushes(), (uint64_t)2);
}

TEST_CASE(gw_multiple_flush_cycles) {
    int total_events = 0;
    GlobalWindow w([&](const std::vector<Event>& evts) {
        total_events += static_cast<int>(evts.size());
    });
    w.add(Event("a", 100));
    w.add(Event("b", 200));
    w.flush();
    w.add(Event("c", 300));
    w.flush();
    w.add(Event("d", 400));
    w.add(Event("e", 500));
    w.add(Event("f", 600));
    w.flush();
    ASSERT_EQ(total_events, 6);
    ASSERT_EQ(w.flushes(), (uint64_t)3);
}

TEST_CASE(gw_clear_discards) {
    int called = 0;
    GlobalWindow w([&](const std::vector<Event>&) { called++; });
    w.add(Event("a", 100));
    w.add(Event("b", 200));
    w.clear();
    ASSERT_EQ(called, 0);
    ASSERT_EQ(w.size(), (size_t)0);
    ASSERT_TRUE(w.empty());
}

TEST_CASE(gw_clear_then_flush) {
    int called = 0;
    GlobalWindow w([&](const std::vector<Event>&) { called++; });
    w.add(Event("a", 100));
    w.clear();
    w.flush();
    ASSERT_EQ(called, 0);
    ASSERT_EQ(w.flushes(), (uint64_t)0);
}

TEST_CASE(gw_event_order_preserved) {
    std::vector<Event> captured;
    GlobalWindow w([&](const std::vector<Event>& evts) {
        captured = evts;
    });
    for (int i = 0; i < 10; i++) {
        w.add(Event("e" + std::to_string(i), static_cast<Timestamp>(i * 100)));
    }
    w.flush();
    ASSERT_EQ(captured.size(), (size_t)10);
    for (int i = 0; i < 10; i++) {
        ASSERT_STR_EQ(captured[i].event_type(), "e" + std::to_string(i));
        ASSERT_EQ(captured[i].timestamp(), (Timestamp)(i * 100));
    }
}

RUN_ALL_TESTS()
