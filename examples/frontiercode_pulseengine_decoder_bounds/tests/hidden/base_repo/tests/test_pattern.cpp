#include "test_framework.hpp"
#include "pulse/pattern/pattern_matcher.hpp"

using namespace pulse;

TEST_CASE(nfa_create) {
    NFAEngine nfa;
    ASSERT_EQ(nfa.state_count(), (size_t)0);
    ASSERT_EQ(nfa.total_matches(), (uint64_t)0);
}

TEST_CASE(nfa_add_states) {
    NFAEngine nfa;
    size_t s0 = nfa.add_state();
    size_t s1 = nfa.add_state(true);
    ASSERT_EQ(s0, (size_t)0);
    ASSERT_EQ(s1, (size_t)1);
    ASSERT_EQ(nfa.state_count(), (size_t)2);
}

TEST_CASE(nfa_simple_sequence) {
    NFAEngine nfa;
    size_t s0 = nfa.add_state();
    size_t s1 = nfa.add_state();
    size_t s2 = nfa.add_state(true);
    nfa.set_start(s0);

    nfa.add_transition(s0, s1, Predicate::field_eq("type", FieldValue(std::string("login"))));
    nfa.add_transition(s1, s2, Predicate::field_eq("type", FieldValue(std::string("purchase"))));

    int matches = 0;
    nfa.set_callback([&](const std::vector<Event>&) { matches++; });

    Event e1("ev", 100); e1.set_string("type", "login");
    Event e2("ev", 200); e2.set_string("type", "purchase");
    nfa.process(e1);
    nfa.process(e2);
    ASSERT_EQ(matches, 1);
}

TEST_CASE(nfa_no_match) {
    NFAEngine nfa;
    size_t s0 = nfa.add_state();
    size_t s1 = nfa.add_state(true);
    nfa.set_start(s0);
    nfa.add_transition(s0, s1, Predicate::field_eq("type", FieldValue(std::string("A"))));

    int matches = 0;
    nfa.set_callback([&](const std::vector<Event>&) { matches++; });

    Event e("ev", 100); e.set_string("type", "B");
    nfa.process(e);
    ASSERT_EQ(matches, 0);
}

TEST_CASE(nfa_matched_events_captured) {
    NFAEngine nfa;
    size_t s0 = nfa.add_state();
    size_t s1 = nfa.add_state();
    size_t s2 = nfa.add_state(true);
    nfa.set_start(s0);

    nfa.add_transition(s0, s1, Predicate::field_eq("step", FieldValue(int64_t(1))));
    nfa.add_transition(s1, s2, Predicate::field_eq("step", FieldValue(int64_t(2))));

    std::vector<Event> captured;
    nfa.set_callback([&](const std::vector<Event>& evts) { captured = evts; });

    Event e1("ev", 100); e1.set_int("step", 1);
    Event e2("ev", 200); e2.set_int("step", 2);
    nfa.process(e1);
    nfa.process(e2);
    ASSERT_EQ(captured.size(), (size_t)2);
    ASSERT_EQ(captured[0].get_int("step"), (int64_t)1);
    ASSERT_EQ(captured[1].get_int("step"), (int64_t)2);
}

TEST_CASE(nfa_reset) {
    NFAEngine nfa;
    size_t s0 = nfa.add_state();
    size_t s1 = nfa.add_state(true);
    nfa.set_start(s0);
    nfa.add_transition(s0, s1, Predicate::field_exists("x"));
    nfa.set_callback([](const std::vector<Event>&) {});

    Event e("ev", 100); e.set_int("x", 1);
    nfa.process(e);
    nfa.reset();
    ASSERT_EQ(nfa.active_instance_count(), (size_t)0);
    ASSERT_EQ(nfa.total_matches(), (uint64_t)0);
}

TEST_CASE(nfa_total_matches_counter) {
    NFAEngine nfa;
    size_t s0 = nfa.add_state();
    size_t s1 = nfa.add_state(true);
    nfa.set_start(s0);
    nfa.add_transition(s0, s1, Predicate::field_exists("x"));
    nfa.set_callback([](const std::vector<Event>&) {});

    for (int i = 0; i < 5; i++) {
        Event e("ev", i * 100); e.set_int("x", i);
        nfa.process(e);
    }
    ASSERT_EQ(nfa.total_matches(), (uint64_t)5);
}

TEST_CASE(builder_simple_pattern) {
    int matches = 0;
    auto engine = PatternBuilder()
        .begin()
        .then(Predicate::field_eq("action", FieldValue(std::string("start"))))
        .then(Predicate::field_eq("action", FieldValue(std::string("end"))))
        .on_match([&](const std::vector<Event>&) { matches++; })
        .build();

    Event e1("ev", 100); e1.set_string("action", "start");
    Event e2("ev", 200); e2.set_string("action", "end");
    engine->process(e1);
    engine->process(e2);
    ASSERT_EQ(matches, 1);
}

TEST_CASE(builder_three_step_pattern) {
    int matches = 0;
    auto engine = PatternBuilder()
        .begin()
        .then(Predicate::field_eq("step", FieldValue(int64_t(1))))
        .then(Predicate::field_eq("step", FieldValue(int64_t(2))))
        .then(Predicate::field_eq("step", FieldValue(int64_t(3))))
        .on_match([&](const std::vector<Event>&) { matches++; })
        .build();

    Event e1("ev", 1); e1.set_int("step", 1);
    Event e2("ev", 2); e2.set_int("step", 2);
    Event e3("ev", 3); e3.set_int("step", 3);
    engine->process(e1);
    engine->process(e2);
    engine->process(e3);
    ASSERT_EQ(matches, 1);
}

TEST_CASE(matcher_multiple_patterns) {
    PatternMatcher matcher;
    int m1 = 0, m2 = 0;

    auto p1 = PatternBuilder()
        .begin()
        .then(Predicate::field_eq("type", FieldValue(std::string("A"))))
        .on_match([&](const std::vector<Event>&) { m1++; })
        .build();

    auto p2 = PatternBuilder()
        .begin()
        .then(Predicate::field_eq("type", FieldValue(std::string("B"))))
        .on_match([&](const std::vector<Event>&) { m2++; })
        .build();

    matcher.add_pattern("p1", p1);
    matcher.add_pattern("p2", p2);
    ASSERT_EQ(matcher.pattern_count(), (size_t)2);

    Event ea("ev", 1); ea.set_string("type", "A");
    Event eb("ev", 2); eb.set_string("type", "B");
    matcher.process(ea);
    matcher.process(eb);
    ASSERT_EQ(m1, 1);
    ASSERT_EQ(m2, 1);
}

TEST_CASE(matcher_remove_pattern) {
    PatternMatcher matcher;
    int count = 0;
    auto p = PatternBuilder()
        .begin()
        .then(Predicate::field_exists("x"))
        .on_match([&](const std::vector<Event>&) { count++; })
        .build();
    matcher.add_pattern("test", p);
    Event e("ev", 1); e.set_int("x", 1);
    matcher.process(e);
    ASSERT_EQ(count, 1);
    matcher.remove_pattern("test");
    matcher.process(e);
    ASSERT_EQ(count, 1);
}

TEST_CASE(matcher_total_matches) {
    PatternMatcher matcher;
    auto p = PatternBuilder()
        .begin()
        .then(Predicate::field_exists("x"))
        .on_match([](const std::vector<Event>&) {})
        .build();
    matcher.add_pattern("test", p);
    Event e("ev", 1); e.set_int("x", 1);
    matcher.process(e);
    matcher.process(e);
    ASSERT_EQ(matcher.total_matches(), (uint64_t)2);
}

TEST_CASE(matcher_reset) {
    PatternMatcher matcher;
    auto p = PatternBuilder()
        .begin()
        .then(Predicate::field_exists("x"))
        .on_match([](const std::vector<Event>&) {})
        .build();
    matcher.add_pattern("test", p);
    Event e("ev", 1); e.set_int("x", 1);
    matcher.process(e);
    matcher.reset();
    ASSERT_EQ(matcher.total_matches(), (uint64_t)0);
}

TEST_CASE(nfa_shared_matched_events_cow) {
    std::vector<Event> captured;
    auto engine = PatternBuilder()
        .begin()
        .then(Predicate::field_eq("step", FieldValue(int64_t(1))))
        .then(Predicate::field_eq("step", FieldValue(int64_t(2))))
        .then(Predicate::field_eq("step", FieldValue(int64_t(3))))
        .on_match([&](const std::vector<Event>& evts) { captured = evts; })
        .build();

    Event e1("ev", 1); e1.set_int("step", 1);
    Event e2("ev", 2); e2.set_int("step", 2);
    Event e3("ev", 3); e3.set_int("step", 3);
    engine->process(e1);
    engine->process(e2);
    engine->process(e3);
    ASSERT_EQ(captured.size(), (size_t)3);
    ASSERT_EQ(captured[0].get_int("step"), (int64_t)1);
    ASSERT_EQ(captured[2].get_int("step"), (int64_t)3);
}

TEST_CASE(nfa_high_volume_instances) {
    int matches = 0;
    auto engine = PatternBuilder()
        .begin()
        .then(Predicate::field_exists("x"))
        .on_match([&](const std::vector<Event>&) { matches++; })
        .build();

    for (int i = 0; i < 500; i++) {
        Event e("ev", i);
        e.set_int("x", i);
        engine->process(e);
    }
    ASSERT_EQ(matches, 500);
}

TEST_CASE(nfa_multiple_concurrent_matches) {
    int matches = 0;
    auto engine = PatternBuilder()
        .begin()
        .then(Predicate::field_eq("step", FieldValue(int64_t(1))))
        .then(Predicate::field_eq("step", FieldValue(int64_t(2))))
        .on_match([&](const std::vector<Event>&) { matches++; })
        .build();

    Event e1("ev", 1); e1.set_int("step", 1);
    Event e2("ev", 2); e2.set_int("step", 1);
    Event e3("ev", 3); e3.set_int("step", 2);
    engine->process(e1);
    engine->process(e2);
    engine->process(e3);
    ASSERT_EQ(matches, 2);
}

RUN_ALL_TESTS()