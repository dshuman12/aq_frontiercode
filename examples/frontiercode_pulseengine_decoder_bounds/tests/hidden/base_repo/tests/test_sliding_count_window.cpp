#include "test_framework.hpp"
#include "pulse/window/sliding_count_window.hpp"

using namespace pulse;

TEST_CASE(scw_create) {
    SlidingCountWindow w(5, 2, [](const std::vector<Event>&) {});
    ASSERT_EQ(w.window_size(), (size_t)5);
    ASSERT_EQ(w.slide_size(), (size_t)2);
    ASSERT_EQ(w.windows_emitted(), (uint64_t)0);
    ASSERT_EQ(w.buffer_size(), (size_t)0);
}

TEST_CASE(scw_zero_window_throws) {
    ASSERT_THROWS(SlidingCountWindow(0, 2, [](const std::vector<Event>&) {}));
}

TEST_CASE(scw_zero_slide_throws) {
    ASSERT_THROWS(SlidingCountWindow(5, 0, [](const std::vector<Event>&) {}));
}

TEST_CASE(scw_null_callback_throws) {
    ASSERT_THROWS(SlidingCountWindow(5, 2, nullptr));
}

TEST_CASE(scw_first_emit) {
    int emitted = 0;
    size_t last_size = 0;
    SlidingCountWindow w(5, 3, [&](const std::vector<Event>& evts) {
        emitted++;
        last_size = evts.size();
    });
    w.add(Event("a", 100));
    w.add(Event("b", 200));
    ASSERT_EQ(emitted, 0);
    w.add(Event("c", 300));
    ASSERT_EQ(emitted, 1);
    ASSERT_EQ(last_size, (size_t)3);
}

TEST_CASE(scw_window_contents_correct) {
    std::vector<std::string> captured_types;
    SlidingCountWindow w(3, 3, [&](const std::vector<Event>& evts) {
        captured_types.clear();
        for (auto& e : evts) {
            captured_types.push_back(e.event_type());
        }
    });
    w.add(Event("a", 100));
    w.add(Event("b", 200));
    w.add(Event("c", 300));
    ASSERT_EQ(captured_types.size(), (size_t)3);
    ASSERT_STR_EQ(captured_types[0], "a");
    ASSERT_STR_EQ(captured_types[1], "b");
    ASSERT_STR_EQ(captured_types[2], "c");
}

TEST_CASE(scw_multiple_emissions) {
    int emitted = 0;
    SlidingCountWindow w(4, 2, [&](const std::vector<Event>&) { emitted++; });
    for (int i = 0; i < 10; i++) {
        w.add(Event("e", static_cast<Timestamp>(i * 100)));
    }
    ASSERT_EQ(emitted, 5);
    ASSERT_EQ(w.windows_emitted(), (uint64_t)5);
}

TEST_CASE(scw_sliding_overlap) {
    std::vector<std::string> last_window;
    SlidingCountWindow w(4, 2, [&](const std::vector<Event>& evts) {
        last_window.clear();
        for (auto& e : evts) {
            last_window.push_back(e.event_type());
        }
    });
    // Add e0..e5, slide=2, window=4
    for (int i = 0; i < 6; i++) {
        w.add(Event("e" + std::to_string(i), static_cast<Timestamp>(i)));
    }
    // Last emit at total=6: last 4 events = e2,e3,e4,e5
    ASSERT_EQ(last_window.size(), (size_t)4);
    ASSERT_STR_EQ(last_window[0], "e2");
    ASSERT_STR_EQ(last_window[1], "e3");
    ASSERT_STR_EQ(last_window[2], "e4");
    ASSERT_STR_EQ(last_window[3], "e5");
}

TEST_CASE(scw_partial_first_window) {
    size_t first_window_size = 0;
    SlidingCountWindow w(10, 3, [&](const std::vector<Event>& evts) {
        if (first_window_size == 0) first_window_size = evts.size();
    });
    w.add(Event("a", 100));
    w.add(Event("b", 200));
    w.add(Event("c", 300));
    // window_size=10 but only 3 events exist
    ASSERT_EQ(first_window_size, (size_t)3);
}

TEST_CASE(scw_flush_remaining) {
    std::vector<Event> captured;
    SlidingCountWindow w(5, 3, [&](const std::vector<Event>& evts) {
        captured = evts;
    });
    w.add(Event("a", 100));
    w.add(Event("b", 200));
    ASSERT_EQ(w.windows_emitted(), (uint64_t)0);
    w.flush();
    ASSERT_EQ(captured.size(), (size_t)2);
    ASSERT_EQ(w.windows_emitted(), (uint64_t)1);
    ASSERT_EQ(w.buffer_size(), (size_t)0);
}

TEST_CASE(scw_flush_empty_no_op) {
    int emitted = 0;
    SlidingCountWindow w(5, 2, [&](const std::vector<Event>&) { emitted++; });
    w.flush();
    ASSERT_EQ(emitted, 0);
    ASSERT_EQ(w.windows_emitted(), (uint64_t)0);
}

TEST_CASE(scw_buffer_bounded) {
    SlidingCountWindow w(3, 2, [](const std::vector<Event>&) {});
    for (int i = 0; i < 100; i++) {
        w.add(Event("e", static_cast<Timestamp>(i)));
    }
    // buffer should never exceed window_size + slide_size = 5
    ASSERT_LE(w.buffer_size(), (size_t)5);
}

TEST_CASE(scw_windows_emitted_counter) {
    SlidingCountWindow w(3, 1, [](const std::vector<Event>&) {});
    w.add(Event("a", 100));
    ASSERT_EQ(w.windows_emitted(), (uint64_t)1);
    w.add(Event("b", 200));
    ASSERT_EQ(w.windows_emitted(), (uint64_t)2);
    w.add(Event("c", 300));
    ASSERT_EQ(w.windows_emitted(), (uint64_t)3);
}

TEST_CASE(scw_slide_equals_window) {
    int emitted = 0;
    size_t last_size = 0;
    SlidingCountWindow w(3, 3, [&](const std::vector<Event>& evts) {
        emitted++;
        last_size = evts.size();
    });
    for (int i = 0; i < 9; i++) {
        w.add(Event("e", static_cast<Timestamp>(i * 10)));
    }
    ASSERT_EQ(emitted, 3);
    ASSERT_EQ(last_size, (size_t)3);
}

RUN_ALL_TESTS()
