#include "test_framework.hpp"
#include "pulse/pipeline/pipeline.hpp"

using namespace pulse;

TEST_CASE(pipe_empty) {
    Pipeline p;
    Event e("test", 1);
    p.process(e);
    ASSERT_EQ(p.events_in(), (uint64_t)1);
    ASSERT_EQ(p.operator_count(), (size_t)0);
}

TEST_CASE(pipe_sink_only) {
    int count = 0;
    Pipeline p;
    p.sink([&](const Event&) { count++; });
    p.process(Event("a", 1));
    p.process(Event("b", 2));
    ASSERT_EQ(count, 2);
}

TEST_CASE(pipe_filter_sink) {
    int count = 0;
    Pipeline p;
    p.filter([](const Event& e) { return e.timestamp() > 100; })
     .sink([&](const Event&) { count++; });

    p.process(Event("a", 50));
    p.process(Event("b", 150));
    p.process(Event("c", 200));
    ASSERT_EQ(count, 2);
}

TEST_CASE(pipe_map_sink) {
    std::vector<int64_t> values;
    Pipeline p;
    p.map([](const Event& e) {
        Event out = e.clone();
        out.set_int("doubled", e.get_int("x") * 2);
        return out;
    }).sink([&](const Event& e) {
        values.push_back(e.get_int("doubled"));
    });

    Event e1("t", 1); e1.set_int("x", 5);
    Event e2("t", 2); e2.set_int("x", 10);
    p.process(e1);
    p.process(e2);
    ASSERT_EQ(values.size(), (size_t)2);
    ASSERT_EQ(values[0], (int64_t)10);
    ASSERT_EQ(values[1], (int64_t)20);
}

TEST_CASE(pipe_filter_map_sink) {
    std::vector<std::string> results;
    Pipeline p;
    p.filter([](const Event& e) { return e.has_field("status"); }, "status_filter")
     .map([](const Event& e) {
        Event out = e.clone();
        out.set_string("tag", "processed");
        return out;
     }, "tagger")
     .sink([&](const Event& e) {
        results.push_back(e.get_string("tag"));
     }, "collector");

    Event e1("t", 1); e1.set_int("status", 200);
    Event e2("t", 2);
    Event e3("t", 3); e3.set_int("status", 500);
    p.process(e1);
    p.process(e2);
    p.process(e3);
    ASSERT_EQ(results.size(), (size_t)2);
    ASSERT_STR_EQ(results[0], "processed");
}

TEST_CASE(pipe_operator_names) {
    Pipeline p;
    p.filter([](const Event&) { return true; }, "f1")
     .map([](const Event& e) { return e.clone(); }, "m1")
     .sink([](const Event&) {}, "s1");
    auto names = p.operator_names();
    ASSERT_EQ(names.size(), (size_t)3);
    ASSERT_STR_EQ(names[0], "f1");
    ASSERT_STR_EQ(names[1], "m1");
    ASSERT_STR_EQ(names[2], "s1");
}

TEST_CASE(pipe_builder) {
    int count = 0;
    auto pipeline = PipelineBuilder("test_pipe")
        .filter([](const Event& e) { return e.timestamp() > 0; })
        .sink([&](const Event&) { count++; })
        .build();

    pipeline.process(Event("a", 0));
    pipeline.process(Event("b", 1));
    ASSERT_EQ(count, 1);
    ASSERT_STR_EQ(pipeline.name(), "test_pipe");
}

TEST_CASE(pipe_builder_complex) {
    std::vector<double> outputs;
    auto pipeline = PipelineBuilder("metrics")
        .filter([](const Event& e) { return e.has_field("cpu"); })
        .filter([](const Event& e) { return e.get_double("cpu") > 80.0; })
        .map([](const Event& e) {
            Event out = e.clone();
            out.set_string("alert", "high_cpu");
            return out;
        })
        .sink([&](const Event& e) {
            outputs.push_back(e.get_double("cpu"));
        })
        .build();

    Event e1("m", 1); e1.set_double("cpu", 50.0);
    Event e2("m", 2); e2.set_double("cpu", 95.0);
    Event e3("m", 3); e3.set_double("cpu", 85.0);
    Event e4("m", 4);
    pipeline.process(e1);
    pipeline.process(e2);
    pipeline.process(e3);
    pipeline.process(e4);
    ASSERT_EQ(outputs.size(), (size_t)2);
    ASSERT_NEAR(outputs[0], 95.0, 1e-9);
    ASSERT_NEAR(outputs[1], 85.0, 1e-9);
}

TEST_CASE(pipe_events_in_counter) {
    Pipeline p;
    p.sink([](const Event&) {});
    for (int i = 0; i < 100; i++) p.process(Event("e", i));
    ASSERT_EQ(p.events_in(), (uint64_t)100);
}

TEST_CASE(pipe_chain_preserves_data) {
    std::string result;
    Pipeline p;
    p.map([](const Event& e) {
        Event out = e.clone();
        out.set_string("step1", "done");
        return out;
    }).map([](const Event& e) {
        Event out = e.clone();
        out.set_string("step2", "done");
        return out;
    }).sink([&](const Event& e) {
        result = e.get_string("step1") + "_" + e.get_string("step2");
    });

    Event e("t", 1);
    p.process(e);
    ASSERT_STR_EQ(result, "done_done");
}

RUN_ALL_TESTS()