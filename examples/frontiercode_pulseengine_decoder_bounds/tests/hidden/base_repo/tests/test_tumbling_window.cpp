#include "test_framework.hpp"
#include "pulse/window/tumbling_window.hpp"

using namespace pulse;

TEST_CASE(tw_create) {
    int closed = 0;
    TumblingWindow w(1000, [&](const std::vector<Event>&, Timestamp, Timestamp) { closed++; });
    ASSERT_EQ(w.duration_ms(), (uint64_t)1000);
    ASSERT_EQ(w.current_count(), (size_t)0);
    ASSERT_EQ(w.windows_closed(), (uint64_t)0);
}

TEST_CASE(tw_zero_duration_throws) {
    ASSERT_THROWS(TumblingWindow(0, [](const std::vector<Event>&, Timestamp, Timestamp) {}));
}

TEST_CASE(tw_single_window) {
    std::vector<Event> captured;
    TumblingWindow w(1000, [&](const std::vector<Event>& evts, Timestamp, Timestamp) {
        captured = evts;
    });
    w.add(Event("a", 100));
    w.add(Event("b", 500));
    w.add(Event("c", 900));
    ASSERT_EQ(w.current_count(), (size_t)3);
    w.flush();
    ASSERT_EQ(captured.size(), (size_t)3);
}

TEST_CASE(tw_auto_close) {
    int closed = 0;
    size_t last_size = 0;
    TumblingWindow w(1000, [&](const std::vector<Event>& evts, Timestamp, Timestamp) {
        closed++;
        last_size = evts.size();
    });
    w.add(Event("a", 100));
    w.add(Event("b", 500));
    w.add(Event("c", 1500));
    ASSERT_EQ(closed, 1);
    ASSERT_EQ(last_size, (size_t)2);
    ASSERT_EQ(w.current_count(), (size_t)1);
}

TEST_CASE(tw_multiple_windows) {
    int closed = 0;
    TumblingWindow w(100, [&](const std::vector<Event>&, Timestamp, Timestamp) { closed++; });
    for (int i = 0; i < 10; i++) {
        w.add(Event("e", i * 100 + 50));
    }
    ASSERT_EQ(closed, 9);
}

TEST_CASE(tw_window_boundaries) {
    Timestamp start = 0, end = 0;
    TumblingWindow w(1000, [&](const std::vector<Event>&, Timestamp s, Timestamp e) {
        start = s; end = e;
    });
    w.add(Event("a", 100));
    w.add(Event("b", 1100));
    ASSERT_EQ(start, (Timestamp)0);
    ASSERT_EQ(end, (Timestamp)1000);
}

TEST_CASE(tw_advance_time) {
    int closed = 0;
    TumblingWindow w(1000, [&](const std::vector<Event>&, Timestamp, Timestamp) { closed++; });
    w.add(Event("a", 100));
    w.advance_time(2500);
    ASSERT_GE(closed, 1);
}

TEST_CASE(tw_empty_window_on_skip) {
    int closed = 0;
    TumblingWindow w(1000, [&](const std::vector<Event>&, Timestamp, Timestamp) { closed++; });
    w.add(Event("a", 100));
    w.add(Event("b", 3100));
    ASSERT_GE(closed, 1);
}

TEST_CASE(tw_event_at_boundary) {
    size_t first_count = 0;
    TumblingWindow w(1000, [&](const std::vector<Event>& evts, Timestamp, Timestamp) {
        if (first_count == 0) first_count = evts.size();
    });
    w.add(Event("a", 0));
    w.add(Event("b", 999));
    w.add(Event("c", 1000));
    ASSERT_EQ(first_count, (size_t)2);
}

TEST_CASE(tw_flush_empty) {
    int closed = 0;
    TumblingWindow w(1000, [&](const std::vector<Event>&, Timestamp, Timestamp) { closed++; });
    w.flush();
    ASSERT_EQ(closed, 0);
}

TEST_CASE(tw_large_gap) {
    int closed = 0;
    TumblingWindow w(100, [&](const std::vector<Event>&, Timestamp, Timestamp) { closed++; });
    w.add(Event("a", 50));
    w.add(Event("b", 10050));
    ASSERT_GE(closed, 1);
}

TEST_CASE(tw_windows_closed_counter) {
    TumblingWindow w(100, [](const std::vector<Event>&, Timestamp, Timestamp) {});
    w.add(Event("a", 50));
    w.add(Event("b", 150));
    w.add(Event("c", 250));
    w.flush();
    ASSERT_EQ(w.windows_closed(), (uint64_t)3);
}

RUN_ALL_TESTS()