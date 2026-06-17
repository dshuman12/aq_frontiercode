#include "test_framework.hpp"
#include "pulse/window/session_window.hpp"

using namespace pulse;

TEST_CASE(sess_create) {
    SessionWindow w(5000, [](const std::vector<Event>&, Timestamp, Timestamp) {});
    ASSERT_EQ(w.gap_ms(), (uint64_t)5000);
    ASSERT_EQ(w.active_sessions(), (size_t)0);
}

TEST_CASE(sess_zero_gap_throws) {
    ASSERT_THROWS(SessionWindow(0, [](const std::vector<Event>&, Timestamp, Timestamp) {}));
}

TEST_CASE(sess_single_session) {
    std::vector<Event> captured;
    SessionWindow w(1000, [&](const std::vector<Event>& evts, Timestamp, Timestamp) {
        captured = evts;
    });
    w.add(Event("a", 100));
    w.add(Event("b", 500));
    w.add(Event("c", 800));
    ASSERT_EQ(w.active_sessions(), (size_t)1);
    w.flush_all();
    ASSERT_EQ(captured.size(), (size_t)3);
    ASSERT_EQ(w.active_sessions(), (size_t)0);
}

TEST_CASE(sess_gap_closes_session) {
    int closed = 0;
    size_t last_size = 0;
    SessionWindow w(1000, [&](const std::vector<Event>& evts, Timestamp, Timestamp) {
        closed++;
        last_size = evts.size();
    });
    w.add(Event("a", 100));
    w.add(Event("b", 500));
    w.add(Event("c", 2000));
    ASSERT_EQ(closed, 1);
    ASSERT_EQ(last_size, (size_t)2);
}

TEST_CASE(sess_advance_time_closes) {
    int closed = 0;
    SessionWindow w(1000, [&](const std::vector<Event>&, Timestamp, Timestamp) { closed++; });
    w.add(Event("a", 100));
    w.advance_time(5000);
    ASSERT_EQ(closed, 1);
}

TEST_CASE(sess_keyed_sessions) {
    int closed = 0;
    SessionWindow w(1000, [&](const std::vector<Event>&, Timestamp, Timestamp) { closed++; },
                    "user_id");
    Event e1("click", 100); e1.set_string("user_id", "alice");
    Event e2("click", 200); e2.set_string("user_id", "bob");
    Event e3("click", 300); e3.set_string("user_id", "alice");
    w.add(e1);
    w.add(e2);
    w.add(e3);
    ASSERT_EQ(w.active_sessions(), (size_t)2);
    w.flush_all();
    ASSERT_EQ(closed, 2);
}

TEST_CASE(sess_keyed_independent_gaps) {
    int closed = 0;
    SessionWindow w(500, [&](const std::vector<Event>&, Timestamp, Timestamp) { closed++; },
                    "user_id");
    Event e1("c", 100); e1.set_string("user_id", "alice");
    Event e2("c", 200); e2.set_string("user_id", "bob");
    Event e3("c", 400); e3.set_string("user_id", "alice");
    w.add(e1);
    w.add(e2);
    w.add(e3);
    ASSERT_EQ(closed, 0);
    w.advance_time(800);
    ASSERT_EQ(closed, 1);
    w.advance_time(1000);
    ASSERT_EQ(closed, 2);
}

TEST_CASE(sess_session_boundaries) {
    Timestamp got_start = 0, got_end = 0;
    SessionWindow w(1000, [&](const std::vector<Event>&, Timestamp s, Timestamp e) {
        got_start = s; got_end = e;
    });
    w.add(Event("a", 100));
    w.add(Event("b", 500));
    w.add(Event("c", 900));
    w.flush_all();
    ASSERT_EQ(got_start, (Timestamp)100);
    ASSERT_EQ(got_end, (Timestamp)900);
}

TEST_CASE(sess_no_key_field) {
    SessionWindow w(1000, [](const std::vector<Event>&, Timestamp, Timestamp) {});
    w.add(Event("a", 100));
    w.add(Event("b", 200));
    ASSERT_EQ(w.active_sessions(), (size_t)1);
}

TEST_CASE(sess_sessions_closed_counter) {
    SessionWindow w(100, [](const std::vector<Event>&, Timestamp, Timestamp) {});
    w.add(Event("a", 100));
    w.add(Event("b", 300));
    w.add(Event("c", 500));
    w.flush_all();
    ASSERT_EQ(w.sessions_closed(), (uint64_t)3);
}

TEST_CASE(sess_int_key) {
    SessionWindow w(1000, [](const std::vector<Event>&, Timestamp, Timestamp) {},
                    "session_id");
    Event e1("c", 100); e1.set_int("session_id", 42);
    Event e2("c", 200); e2.set_int("session_id", 43);
    w.add(e1);
    w.add(e2);
    ASSERT_EQ(w.active_sessions(), (size_t)2);
    w.flush_all();
}

TEST_CASE(sess_missing_key_field) {
    int closed = 0;
    SessionWindow w(1000, [&](const std::vector<Event>&, Timestamp, Timestamp) { closed++; },
                    "user_id");
    Event e1("c", 100);
    Event e2("c", 200);
    w.add(e1);
    w.add(e2);
    ASSERT_EQ(w.active_sessions(), (size_t)1);
    w.flush_all();
    ASSERT_EQ(closed, 1);
}

RUN_ALL_TESTS()