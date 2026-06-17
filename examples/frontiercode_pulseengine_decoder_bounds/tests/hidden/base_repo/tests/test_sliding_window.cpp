#include "test_framework.hpp"
#include "pulse/window/sliding_window.hpp"

using namespace pulse;

TEST_CASE(sw_create) {
    SlidingWindow w(1000, 500, [](const std::vector<Event>&, Timestamp, Timestamp) {});
    ASSERT_EQ(w.window_size_ms(), (uint64_t)1000);
    ASSERT_EQ(w.slide_ms(), (uint64_t)500);
    ASSERT_EQ(w.windows_emitted(), (uint64_t)0);
}

TEST_CASE(sw_zero_params_throw) {
    ASSERT_THROWS(SlidingWindow(0, 500, [](const std::vector<Event>&, Timestamp, Timestamp) {}));
    ASSERT_THROWS(SlidingWindow(1000, 0, [](const std::vector<Event>&, Timestamp, Timestamp) {}));
}

TEST_CASE(sw_emit_on_slide) {
    int emitted = 0;
    SlidingWindow w(1000, 500, [&](const std::vector<Event>&, Timestamp, Timestamp) {
        emitted++;
    });
    w.add(Event("a", 100));
    w.add(Event("b", 300));
    ASSERT_EQ(emitted, 0);
    w.add(Event("c", 600));
    ASSERT_GE(emitted, 1);
}

TEST_CASE(sw_overlapping_windows) {
    std::vector<size_t> sizes;
    SlidingWindow w(1000, 500, [&](const std::vector<Event>& evts, Timestamp, Timestamp) {
        sizes.push_back(evts.size());
    });
    w.add(Event("a", 100));
    w.add(Event("b", 300));
    w.add(Event("c", 600));
    w.add(Event("d", 800));
    w.add(Event("e", 1100));
    ASSERT_GE(sizes.size(), (size_t)1);
}

TEST_CASE(sw_advance_time) {
    int emitted = 0;
    SlidingWindow w(1000, 500, [&](const std::vector<Event>&, Timestamp, Timestamp) {
        emitted++;
    });
    w.add(Event("a", 100));
    w.advance_time(2000);
    ASSERT_GE(emitted, 1);
}

TEST_CASE(sw_flush) {
    int emitted = 0;
    SlidingWindow w(1000, 500, [&](const std::vector<Event>&, Timestamp, Timestamp) {
        emitted++;
    });
    w.add(Event("a", 100));
    w.flush();
    ASSERT_EQ(emitted, 1);
}

TEST_CASE(sw_window_boundaries) {
    Timestamp got_start = 0, got_end = 0;
    SlidingWindow w(1000, 500, [&](const std::vector<Event>&, Timestamp s, Timestamp e) {
        got_start = s;
        got_end = e;
    });
    w.add(Event("a", 100));
    w.add(Event("b", 600));
    ASSERT_EQ(got_end, (Timestamp)500);
    ASSERT_EQ(got_start, (Timestamp)0);
}

TEST_CASE(sw_eviction) {
    size_t last_size = 0;
    SlidingWindow w(500, 500, [&](const std::vector<Event>& evts, Timestamp, Timestamp) {
        last_size = evts.size();
    });
    w.add(Event("a", 100));
    w.add(Event("b", 200));
    w.add(Event("c", 600));
    ASSERT_EQ(last_size, (size_t)2);
    w.add(Event("d", 1200));
    ASSERT_EQ(last_size, (size_t)1);
}

TEST_CASE(sw_emitted_counter) {
    SlidingWindow w(100, 100, [](const std::vector<Event>&, Timestamp, Timestamp) {});
    for (int i = 0; i < 5; i++) {
        w.add(Event("e", i * 100 + 50));
    }
    ASSERT_GE(w.windows_emitted(), (uint64_t)4);
}

RUN_ALL_TESTS()