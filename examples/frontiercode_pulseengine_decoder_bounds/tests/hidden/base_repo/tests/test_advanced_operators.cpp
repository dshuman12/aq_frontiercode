#include "test_framework.hpp"
#include "pulse/pipeline/advanced_operators.hpp"

using namespace pulse;

// ==========================================================================
//  Helper: CollectorSink — collects events into a vector for inspection
// ==========================================================================
static std::shared_ptr<SinkOperator> make_collector(std::vector<Event>& out) {
    return std::make_shared<SinkOperator>([&out](const Event& e) {
        out.push_back(e.clone());
    }, "collector");
}

// ==========================================================================
//  FlatMapOperator tests
// ==========================================================================

TEST_CASE(flatmap_one_to_many) {
    // Each input event produces 3 output events with suffixed types.
    std::vector<Event> collected;
    auto fm = std::make_shared<FlatMapOperator>([](const Event& e) -> std::vector<Event> {
        std::vector<Event> out;
        for (int i = 0; i < 3; i++) {
            Event o(e.event_type() + "_" + std::to_string(i), e.timestamp());
            o.set_int("index", i);
            out.push_back(o);
        }
        return out;
    }, "expand_3x");
    fm->set_downstream(make_collector(collected));

    fm->process(Event("src", 100));
    ASSERT_EQ(collected.size(), (size_t)3);
    ASSERT_STR_EQ(collected[0].event_type(), "src_0");
    ASSERT_STR_EQ(collected[1].event_type(), "src_1");
    ASSERT_STR_EQ(collected[2].event_type(), "src_2");
    ASSERT_EQ(collected[2].get_int("index"), (int64_t)2);
}

TEST_CASE(flatmap_one_to_zero) {
    // Function returns empty vector — nothing should reach the sink.
    std::vector<Event> collected;
    auto fm = std::make_shared<FlatMapOperator>([](const Event&) -> std::vector<Event> {
        return {};
    }, "dropper");
    fm->set_downstream(make_collector(collected));

    fm->process(Event("a", 1));
    fm->process(Event("b", 2));
    ASSERT_EQ(collected.size(), (size_t)0);
    ASSERT_EQ(fm->events_out(), (uint64_t)0);
    ASSERT_EQ(fm->empty_results(), (uint64_t)2);
}

TEST_CASE(flatmap_one_to_one) {
    // Passthrough: each input produces exactly one output.
    std::vector<Event> collected;
    auto fm = std::make_shared<FlatMapOperator>([](const Event& e) -> std::vector<Event> {
        return { e.clone() };
    });
    fm->set_downstream(make_collector(collected));

    fm->process(Event("x", 10));
    fm->process(Event("y", 20));
    ASSERT_EQ(collected.size(), (size_t)2);
    ASSERT_EQ(fm->events_in(), (uint64_t)2);
    ASSERT_EQ(fm->events_out(), (uint64_t)2);
}

TEST_CASE(flatmap_count_tracking) {
    // Verify events_in, events_out, and expansion_ratio metrics.
    auto fm = std::make_shared<FlatMapOperator>([](const Event& e) -> std::vector<Event> {
        int n = static_cast<int>(e.get_int("n"));
        std::vector<Event> out;
        for (int i = 0; i < n; i++) out.push_back(Event("out", e.timestamp()));
        return out;
    }, "variable_expand");

    Event e1("t", 1); e1.set_int("n", 2);
    Event e2("t", 2); e2.set_int("n", 5);
    Event e3("t", 3); e3.set_int("n", 0);
    fm->process(e1);
    fm->process(e2);
    fm->process(e3);

    ASSERT_EQ(fm->events_in(), (uint64_t)3);
    ASSERT_EQ(fm->events_out(), (uint64_t)7);   // 2+5+0
    ASSERT_EQ(fm->empty_results(), (uint64_t)1); // third event
    ASSERT_NEAR(fm->expansion_ratio(), 7.0 / 3.0, 1e-9);
}

TEST_CASE(flatmap_max_fan_out) {
    auto fm = std::make_shared<FlatMapOperator>([](const Event& e) -> std::vector<Event> {
        int n = static_cast<int>(e.get_int("n"));
        std::vector<Event> out;
        for (int i = 0; i < n; i++) out.push_back(Event("o", 0));
        return out;
    });

    Event e1("t", 1); e1.set_int("n", 3);
    Event e2("t", 2); e2.set_int("n", 7);
    Event e3("t", 3); e3.set_int("n", 5);
    fm->process(e1);
    fm->process(e2);
    fm->process(e3);

    ASSERT_EQ(fm->max_fan_out(), (size_t)7);
}

TEST_CASE(flatmap_preserves_fields) {
    // Output events should carry fields set by the flat-map function.
    std::vector<Event> collected;
    auto fm = std::make_shared<FlatMapOperator>([](const Event& e) -> std::vector<Event> {
        Event out = e.clone();
        out.set_string("added", "yes");
        return { out };
    });
    fm->set_downstream(make_collector(collected));

    Event e("metric", 42);
    e.set_int("cpu", 80);
    fm->process(e);
    ASSERT_EQ(collected.size(), (size_t)1);
    ASSERT_EQ(collected[0].get_int("cpu"), (int64_t)80);
    ASSERT_STR_EQ(collected[0].get_string("added"), "yes");
}

TEST_CASE(flatmap_null_fn_throws) {
    FlatMapOperator::FlatMapFn null_fn;
    ASSERT_THROWS(auto fm = FlatMapOperator(null_fn));
}

TEST_CASE(flatmap_type_and_name) {
    auto fm = std::make_shared<FlatMapOperator>([](const Event&) -> std::vector<Event> {
        return {};
    }, "my_flatmap");
    ASSERT_TRUE(fm->type() == OperatorType::FlatMap);
    ASSERT_STR_EQ(fm->name(), "my_flatmap");
}

// ==========================================================================
//  ThrottleOperator tests
// ==========================================================================

TEST_CASE(throttle_within_limit_passes) {
    // All events within the limit should pass through.
    std::vector<Event> collected;
    auto th = std::make_shared<ThrottleOperator>(5, 1000, "rate_limiter");
    th->set_downstream(make_collector(collected));

    for (int i = 0; i < 5; i++) {
        th->process(Event("e", 100 + i));  // timestamps 100..104, all within 1 window
    }
    ASSERT_EQ(collected.size(), (size_t)5);
    ASSERT_EQ(th->passed(), (uint64_t)5);
    ASSERT_EQ(th->dropped(), (uint64_t)0);
}

TEST_CASE(throttle_over_limit_drops) {
    // 6th event in same window should be dropped.
    std::vector<Event> collected;
    auto th = std::make_shared<ThrottleOperator>(3, 1000);
    th->set_downstream(make_collector(collected));

    for (int i = 0; i < 10; i++) {
        th->process(Event("e", 500 + i)); // all in same window [500, 1500)
    }
    ASSERT_EQ(th->passed(), (uint64_t)3);
    ASSERT_EQ(th->dropped(), (uint64_t)7);
    ASSERT_EQ(collected.size(), (size_t)3);
}

TEST_CASE(throttle_window_reset) {
    // After the window expires, the counter should reset.
    std::vector<Event> collected;
    auto th = std::make_shared<ThrottleOperator>(2, 100);
    th->set_downstream(make_collector(collected));

    // Window 1: ts 0..99 — allow 2, drop rest
    th->process(Event("e", 0));   // pass
    th->process(Event("e", 50));  // pass
    th->process(Event("e", 80));  // drop

    // Window 2: ts 100..199 — fresh quota
    th->process(Event("e", 100)); // pass
    th->process(Event("e", 150)); // pass
    th->process(Event("e", 180)); // drop

    ASSERT_EQ(th->passed(), (uint64_t)4);
    ASSERT_EQ(th->dropped(), (uint64_t)2);
    ASSERT_EQ(collected.size(), (size_t)4);
}

TEST_CASE(throttle_large_time_gap) {
    // A big time gap should advance past multiple windows correctly.
    std::vector<Event> collected;
    auto th = std::make_shared<ThrottleOperator>(1, 100);
    th->set_downstream(make_collector(collected));

    th->process(Event("e", 0));     // pass (window starts at 0)
    th->process(Event("e", 50));    // drop (already 1 in this window)
    th->process(Event("e", 5000));  // pass (many windows later)

    ASSERT_EQ(th->passed(), (uint64_t)2);
    ASSERT_EQ(th->dropped(), (uint64_t)1);
    ASSERT_GT(th->windows_total(), (uint64_t)1);
}

TEST_CASE(throttle_total_and_drop_rate) {
    auto th = std::make_shared<ThrottleOperator>(1, 100);
    th->process(Event("e", 0));   // pass
    th->process(Event("e", 50));  // drop
    th->process(Event("e", 60));  // drop
    th->process(Event("e", 70));  // drop

    ASSERT_EQ(th->total(), (uint64_t)4);
    ASSERT_NEAR(th->drop_rate(), 0.75, 1e-9);
}

TEST_CASE(throttle_reset) {
    auto th = std::make_shared<ThrottleOperator>(1, 100);
    th->process(Event("e", 0));
    th->process(Event("e", 50));
    ASSERT_EQ(th->passed(), (uint64_t)1);
    ASSERT_EQ(th->dropped(), (uint64_t)1);

    th->reset();
    ASSERT_EQ(th->passed(), (uint64_t)0);
    ASSERT_EQ(th->dropped(), (uint64_t)0);
    ASSERT_FALSE(th->is_started());
}

TEST_CASE(throttle_invalid_params_throws) {
    ASSERT_THROWS(ThrottleOperator(0, 100));    // max_events == 0
    ASSERT_THROWS(ThrottleOperator(10, 0));     // window_ms == 0
}

TEST_CASE(throttle_type_and_name) {
    ThrottleOperator th(5, 1000, "my_throttle");
    ASSERT_TRUE(th.type() == OperatorType::Filter);
    ASSERT_STR_EQ(th.name(), "my_throttle");
}

// ==========================================================================
//  DeduplicateOperator tests
// ==========================================================================

TEST_CASE(dedup_first_occurrence_passes) {
    std::vector<Event> collected;
    auto dd = std::make_shared<DeduplicateOperator>("uid", 100, "dedup1");
    dd->set_downstream(make_collector(collected));

    Event e1("t", 1); e1.set_string("uid", "aaa");
    Event e2("t", 2); e2.set_string("uid", "bbb");
    dd->process(e1);
    dd->process(e2);

    ASSERT_EQ(collected.size(), (size_t)2);
    ASSERT_EQ(dd->unique_count(), (uint64_t)2);
    ASSERT_EQ(dd->duplicate_count(), (uint64_t)0);
}

TEST_CASE(dedup_duplicate_drops) {
    std::vector<Event> collected;
    auto dd = std::make_shared<DeduplicateOperator>("uid");
    dd->set_downstream(make_collector(collected));

    Event e1("t", 1); e1.set_string("uid", "x");
    Event e2("t", 2); e2.set_string("uid", "x");
    Event e3("t", 3); e3.set_string("uid", "x");
    dd->process(e1);
    dd->process(e2);
    dd->process(e3);

    ASSERT_EQ(collected.size(), (size_t)1);
    ASSERT_EQ(dd->unique_count(), (uint64_t)1);
    ASSERT_EQ(dd->duplicate_count(), (uint64_t)2);
}

TEST_CASE(dedup_key_extraction_int) {
    // Dedup should work with integer key fields too.
    std::vector<Event> collected;
    auto dd = std::make_shared<DeduplicateOperator>("code");
    dd->set_downstream(make_collector(collected));

    Event e1("t", 1); e1.set_int("code", 42);
    Event e2("t", 2); e2.set_int("code", 42);  // duplicate
    Event e3("t", 3); e3.set_int("code", 99);  // unique
    dd->process(e1);
    dd->process(e2);
    dd->process(e3);

    ASSERT_EQ(collected.size(), (size_t)2);
    ASSERT_EQ(dd->unique_count(), (uint64_t)2);
    ASSERT_EQ(dd->duplicate_count(), (uint64_t)1);
}

TEST_CASE(dedup_key_extraction_double) {
    std::vector<Event> collected;
    auto dd = std::make_shared<DeduplicateOperator>("val");
    dd->set_downstream(make_collector(collected));

    Event e1("t", 1); e1.set_double("val", 3.14);
    Event e2("t", 2); e2.set_double("val", 3.14);  // dup
    Event e3("t", 3); e3.set_double("val", 2.71);  // unique
    dd->process(e1);
    dd->process(e2);
    dd->process(e3);

    ASSERT_EQ(collected.size(), (size_t)2);
}

TEST_CASE(dedup_missing_key_passes) {
    // Events missing the key field should always pass through.
    std::vector<Event> collected;
    auto dd = std::make_shared<DeduplicateOperator>("uid");
    dd->set_downstream(make_collector(collected));

    Event e1("t", 1); // no "uid" field
    Event e2("t", 2); // no "uid" field
    dd->process(e1);
    dd->process(e2);

    ASSERT_EQ(collected.size(), (size_t)2);
    ASSERT_EQ(dd->missing_key_count(), (uint64_t)2);
    ASSERT_EQ(dd->unique_count(), (uint64_t)2);
}

TEST_CASE(dedup_max_seen_eviction) {
    // When the seen set hits max_seen, it is cleared, allowing
    // previously-seen keys to pass through again.
    std::vector<Event> collected;
    auto dd = std::make_shared<DeduplicateOperator>("k", 3, "small_dedup");
    dd->set_downstream(make_collector(collected));

    // Fill the set with 3 unique keys.
    Event e1("t", 1); e1.set_string("k", "a");
    Event e2("t", 2); e2.set_string("k", "b");
    Event e3("t", 3); e3.set_string("k", "c");
    dd->process(e1);  // unique (seen size: 1)
    dd->process(e2);  // unique (seen size: 2)
    dd->process(e3);  // unique (seen size: 3, now at max)

    ASSERT_EQ(dd->seen_size(), (size_t)3);

    // Next insert triggers eviction (seen cleared), then "a" is new again.
    Event e4("t", 4); e4.set_string("k", "a");
    dd->process(e4);  // eviction fires, "a" passes
    ASSERT_EQ(dd->eviction_count(), (uint64_t)1);
    ASSERT_EQ(collected.size(), (size_t)4);  // all 4 passed
}

TEST_CASE(dedup_clear_seen) {
    auto dd = std::make_shared<DeduplicateOperator>("k");
    Event e("t", 1); e.set_string("k", "hello");
    dd->process(e);
    dd->process(e);  // duplicate
    ASSERT_EQ(dd->duplicate_count(), (uint64_t)1);

    dd->clear_seen();
    dd->process(e);  // passes again after clear
    ASSERT_EQ(dd->unique_count(), (uint64_t)2);
    ASSERT_EQ(dd->seen_size(), (size_t)1);
}

TEST_CASE(dedup_invalid_params_throws) {
    ASSERT_THROWS(DeduplicateOperator("", 100));    // empty key_field
    ASSERT_THROWS(DeduplicateOperator("uid", 0));   // max_seen == 0
}

TEST_CASE(dedup_type_and_name) {
    DeduplicateOperator dd("k", 100, "my_dedup");
    ASSERT_TRUE(dd.type() == OperatorType::Filter);
    ASSERT_STR_EQ(dd.name(), "my_dedup");
}

// ==========================================================================
//  Chaining / Integration tests
// ==========================================================================

TEST_CASE(chain_flatmap_to_throttle) {
    // FlatMap expands each event to 5, throttle allows max 3 per window.
    std::vector<Event> collected;
    auto fm = std::make_shared<FlatMapOperator>([](const Event& e) -> std::vector<Event> {
        std::vector<Event> out;
        for (int i = 0; i < 5; i++) out.push_back(Event("exp", e.timestamp()));
        return out;
    });
    auto th = std::make_shared<ThrottleOperator>(3, 1000);
    th->set_downstream(make_collector(collected));
    fm->set_downstream(th);

    fm->process(Event("src", 100));
    ASSERT_EQ(fm->events_out(), (uint64_t)5);
    ASSERT_EQ(th->passed(), (uint64_t)3);
    ASSERT_EQ(th->dropped(), (uint64_t)2);
    ASSERT_EQ(collected.size(), (size_t)3);
}

TEST_CASE(chain_flatmap_to_dedup) {
    // FlatMap duplicates each event; dedup should squash duplicates.
    std::vector<Event> collected;
    auto fm = std::make_shared<FlatMapOperator>([](const Event& e) -> std::vector<Event> {
        // Produce 3 copies with the same "id" field.
        std::vector<Event> out;
        for (int i = 0; i < 3; i++) {
            Event o = e.clone();
            out.push_back(o);
        }
        return out;
    });
    auto dd = std::make_shared<DeduplicateOperator>("uid");
    dd->set_downstream(make_collector(collected));
    fm->set_downstream(dd);

    Event e("t", 1); e.set_string("uid", "u1");
    fm->process(e);

    ASSERT_EQ(fm->events_out(), (uint64_t)3);
    ASSERT_EQ(dd->unique_count(), (uint64_t)1);
    ASSERT_EQ(dd->duplicate_count(), (uint64_t)2);
    ASSERT_EQ(collected.size(), (size_t)1);
}

TEST_CASE(chain_dedup_to_throttle_to_sink) {
    // Three operators chained: dedup → throttle → sink.
    std::vector<Event> collected;
    auto dd = std::make_shared<DeduplicateOperator>("key");
    auto th = std::make_shared<ThrottleOperator>(2, 100);
    th->set_downstream(make_collector(collected));
    dd->set_downstream(th);

    // Send 4 events: 2 unique, 2 duplicate — only 2 pass dedup.
    Event e1("t", 10); e1.set_string("key", "A");
    Event e2("t", 20); e2.set_string("key", "A");  // dup
    Event e3("t", 30); e3.set_string("key", "B");
    Event e4("t", 40); e4.set_string("key", "B");  // dup
    dd->process(e1);
    dd->process(e2);
    dd->process(e3);
    dd->process(e4);

    // Dedup passes 2, throttle allows 2 (within limit).
    ASSERT_EQ(dd->unique_count(), (uint64_t)2);
    ASSERT_EQ(dd->duplicate_count(), (uint64_t)2);
    ASSERT_EQ(th->passed(), (uint64_t)2);
    ASSERT_EQ(collected.size(), (size_t)2);
}

TEST_CASE(chain_flatmap_dedup_throttle) {
    // Full three-operator chain: flatmap → dedup → throttle → sink.
    std::vector<Event> collected;
    auto fm = std::make_shared<FlatMapOperator>([](const Event& e) -> std::vector<Event> {
        // Produce 4 events, 2 with key "same" and 2 with unique keys.
        std::vector<Event> out;
        for (int i = 0; i < 4; i++) {
            Event o("gen", e.timestamp());
            o.set_string("id", (i < 2) ? "same" : ("u" + std::to_string(i)));
            out.push_back(o);
        }
        return out;
    });
    auto dd = std::make_shared<DeduplicateOperator>("id");
    auto th = std::make_shared<ThrottleOperator>(2, 1000);
    th->set_downstream(make_collector(collected));
    dd->set_downstream(th);
    fm->set_downstream(dd);

    fm->process(Event("src", 500));

    // FlatMap emits 4, dedup passes 3 (one "same" dup), throttle allows 2.
    ASSERT_EQ(fm->events_out(), (uint64_t)4);
    ASSERT_EQ(dd->unique_count(), (uint64_t)3);
    ASSERT_EQ(dd->duplicate_count(), (uint64_t)1);
    ASSERT_EQ(th->passed(), (uint64_t)2);
    ASSERT_EQ(th->dropped(), (uint64_t)1);
    ASSERT_EQ(collected.size(), (size_t)2);
}

RUN_ALL_TESTS()
