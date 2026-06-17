#include "test_framework.hpp"
#include "pulse/window/count_window.hpp"

using namespace pulse;

TEST_CASE(cw_create) {
    CountWindow w(5, [](const std::vector<Event>&) {});
    ASSERT_EQ(w.window_size(), (size_t)5);
    ASSERT_EQ(w.current_count(), (size_t)0);
    ASSERT_EQ(w.windows_closed(), (uint64_t)0);
    ASSERT_EQ(w.total_events(), (uint64_t)0);
}

TEST_CASE(cw_zero_size_throws) {
    ASSERT_THROWS(CountWindow(0, [](const std::vector<Event>&) {}));
}

TEST_CASE(cw_null_callback_throws) {
    CountWindow::WindowCallback cb = nullptr;
    ASSERT_THROWS(CountWindow(5, cb));
}

TEST_CASE(cw_single_window_close) {
    std::vector<Event> captured;
    CountWindow w(3, [&](const std::vector<Event>& evts) {
        captured = evts;
    });
    w.add(Event("a", 1));
    w.add(Event("b", 2));
    ASSERT_EQ(w.windows_closed(), (uint64_t)0);
    ASSERT_EQ(w.current_count(), (size_t)2);

    w.add(Event("c", 3));
    ASSERT_EQ(w.windows_closed(), (uint64_t)1);
    ASSERT_EQ(captured.size(), (size_t)3);
    ASSERT_EQ(w.current_count(), (size_t)0);
}

TEST_CASE(cw_multiple_windows) {
    int close_count = 0;
    CountWindow w(2, [&](const std::vector<Event>&) { close_count++; });
    for (int i = 0; i < 7; i++) {
        w.add(Event("e", i));
    }
    ASSERT_EQ(close_count, 3);
    ASSERT_EQ(w.windows_closed(), (uint64_t)3);
    ASSERT_EQ(w.current_count(), (size_t)1);
}

TEST_CASE(cw_flush_partial) {
    std::vector<Event> captured;
    CountWindow w(5, [&](const std::vector<Event>& evts) {
        captured = evts;
    });
    w.add(Event("a", 1));
    w.add(Event("b", 2));
    w.flush();
    ASSERT_EQ(captured.size(), (size_t)2);
    ASSERT_EQ(w.windows_closed(), (uint64_t)1);
    ASSERT_EQ(w.current_count(), (size_t)0);
}

TEST_CASE(cw_flush_empty) {
    int called = 0;
    CountWindow w(5, [&](const std::vector<Event>&) { called++; });
    w.flush();
    ASSERT_EQ(called, 0);
    ASSERT_EQ(w.windows_closed(), (uint64_t)0);
}

TEST_CASE(cw_total_events_tracking) {
    CountWindow w(3, [](const std::vector<Event>&) {});
    for (int i = 0; i < 10; i++) {
        w.add(Event("e", i));
    }
    ASSERT_EQ(w.total_events(), (uint64_t)10);
}

TEST_CASE(cw_event_data_preserved) {
    std::vector<Event> captured;
    CountWindow w(2, [&](const std::vector<Event>& evts) {
        captured = evts;
    });

    Event e1("metric", 100);
    e1.set_int("val", 42);
    Event e2("metric", 200);
    e2.set_int("val", 99);

    w.add(e1);
    w.add(e2);

    ASSERT_EQ(captured.size(), (size_t)2);
    ASSERT_EQ(captured[0].get_int("val"), (int64_t)42);
    ASSERT_EQ(captured[1].get_int("val"), (int64_t)99);
    ASSERT_EQ(captured[0].timestamp(), (Timestamp)100);
    ASSERT_EQ(captured[1].timestamp(), (Timestamp)200);
}

TEST_CASE(cw_window_size_one) {
    int close_count = 0;
    size_t last_size = 0;
    CountWindow w(1, [&](const std::vector<Event>& evts) {
        close_count++;
        last_size = evts.size();
    });
    w.add(Event("a", 1));
    w.add(Event("b", 2));
    w.add(Event("c", 3));
    ASSERT_EQ(close_count, 3);
    ASSERT_EQ(last_size, (size_t)1);
    ASSERT_EQ(w.current_count(), (size_t)0);
}

TEST_CASE(cw_reset) {
    CountWindow w(3, [](const std::vector<Event>&) {});
    w.add(Event("a", 1));
    w.add(Event("b", 2));
    w.add(Event("c", 3));
    ASSERT_EQ(w.windows_closed(), (uint64_t)1);

    w.reset();
    ASSERT_EQ(w.windows_closed(), (uint64_t)0);
    ASSERT_EQ(w.total_events(), (uint64_t)0);
    ASSERT_EQ(w.current_count(), (size_t)0);
}

TEST_CASE(cw_current_buffer_access) {
    CountWindow w(5, [](const std::vector<Event>&) {});
    w.add(Event("x", 10));
    w.add(Event("y", 20));
    const auto& buf = w.current_buffer();
    ASSERT_EQ(buf.size(), (size_t)2);
    ASSERT_STR_EQ(buf[0].event_type(), "x");
    ASSERT_STR_EQ(buf[1].event_type(), "y");
}

TEST_CASE(cw_large_window) {
    int close_count = 0;
    size_t last_size = 0;
    CountWindow w(100, [&](const std::vector<Event>& evts) {
        close_count++;
        last_size = evts.size();
    });
    for (int i = 0; i < 250; i++) {
        w.add(Event("e", i));
    }
    ASSERT_EQ(close_count, 2);
    ASSERT_EQ(w.current_count(), (size_t)50);
    w.flush();
    ASSERT_EQ(close_count, 3);
    ASSERT_EQ(last_size, (size_t)50);
    ASSERT_EQ(w.windows_closed(), (uint64_t)3);
}

RUN_ALL_TESTS()
