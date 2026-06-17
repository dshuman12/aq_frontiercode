#include "test_framework.hpp"
#include "pulse/router/content_router.hpp"

using namespace pulse;

TEST_CASE(cr_add_route) {
    ContentRouter router;
    auto id = router.add_route(
        Predicate::field_eq("level", FieldValue(std::string("error"))),
        [](const Event&) {}
    );
    ASSERT_GT(id, (ContentRouter::RouteId)0);
    ASSERT_EQ(router.route_count(), (size_t)1);
}

TEST_CASE(cr_eq_match) {
    ContentRouter router;
    int count = 0;
    router.add_route(
        Predicate::field_eq("status", FieldValue(int64_t(200))),
        [&](const Event&) { count++; }
    );
    Event e("http", 1);
    e.set_int("status", 200);
    router.evaluate(e);
    ASSERT_EQ(count, 1);
}

TEST_CASE(cr_eq_no_match) {
    ContentRouter router;
    int count = 0;
    router.add_route(
        Predicate::field_eq("status", FieldValue(int64_t(200))),
        [&](const Event&) { count++; }
    );
    Event e("http", 1);
    e.set_int("status", 404);
    router.evaluate(e);
    ASSERT_EQ(count, 0);
}

TEST_CASE(cr_ne) {
    ContentRouter router;
    int count = 0;
    router.add_route(
        Predicate::field_ne("status", FieldValue(int64_t(200))),
        [&](const Event&) { count++; }
    );
    Event e("http", 1);
    e.set_int("status", 500);
    router.evaluate(e);
    ASSERT_EQ(count, 1);
}

TEST_CASE(cr_lt) {
    ContentRouter router;
    int count = 0;
    router.add_route(
        Predicate::field_lt("cpu", FieldValue(double(50.0))),
        [&](const Event&) { count++; }
    );
    Event e1("m", 1); e1.set_double("cpu", 30.0);
    Event e2("m", 2); e2.set_double("cpu", 70.0);
    router.evaluate(e1);
    router.evaluate(e2);
    ASSERT_EQ(count, 1);
}

TEST_CASE(cr_gt) {
    ContentRouter router;
    int count = 0;
    router.add_route(
        Predicate::field_gt("temp", FieldValue(double(100.0))),
        [&](const Event&) { count++; }
    );
    Event e("sensor", 1); e.set_double("temp", 150.0);
    router.evaluate(e);
    ASSERT_EQ(count, 1);
}

TEST_CASE(cr_le_ge) {
    ContentRouter router;
    int le_count = 0, ge_count = 0;
    router.add_route(
        Predicate::field_le("x", FieldValue(int64_t(10))),
        [&](const Event&) { le_count++; }
    );
    router.add_route(
        Predicate::field_ge("x", FieldValue(int64_t(10))),
        [&](const Event&) { ge_count++; }
    );
    Event e("t", 1); e.set_int("x", 10);
    router.evaluate(e);
    ASSERT_EQ(le_count, 1);
    ASSERT_EQ(ge_count, 1);
}

TEST_CASE(cr_contains) {
    ContentRouter router;
    int count = 0;
    router.add_route(
        Predicate::field_contains("msg", "error"),
        [&](const Event&) { count++; }
    );
    Event e1("log", 1); e1.set_string("msg", "fatal error occurred");
    Event e2("log", 2); e2.set_string("msg", "all ok");
    router.evaluate(e1);
    router.evaluate(e2);
    ASSERT_EQ(count, 1);
}

TEST_CASE(cr_starts_with) {
    ContentRouter router;
    int count = 0;
    router.add_route(
        Predicate::field_starts_with("path", "/api/"),
        [&](const Event&) { count++; }
    );
    Event e1("http", 1); e1.set_string("path", "/api/users");
    Event e2("http", 2); e2.set_string("path", "/web/home");
    router.evaluate(e1);
    router.evaluate(e2);
    ASSERT_EQ(count, 1);
}

TEST_CASE(cr_ends_with) {
    ContentRouter router;
    int count = 0;
    router.add_route(
        Predicate::field_ends_with("file", ".log"),
        [&](const Event&) { count++; }
    );
    Event e1("fs", 1); e1.set_string("file", "app.log");
    Event e2("fs", 2); e2.set_string("file", "app.txt");
    router.evaluate(e1);
    router.evaluate(e2);
    ASSERT_EQ(count, 1);
}

TEST_CASE(cr_exists) {
    ContentRouter router;
    int count = 0;
    router.add_route(
        Predicate::field_exists("trace_id"),
        [&](const Event&) { count++; }
    );
    Event e1("req", 1); e1.set_string("trace_id", "abc");
    Event e2("req", 2); e2.set_int("status", 200);
    router.evaluate(e1);
    router.evaluate(e2);
    ASSERT_EQ(count, 1);
}

TEST_CASE(cr_composite_all) {
    ContentRouter router;
    int count = 0;
    router.add_route(
        Predicate::all({
            Predicate::field_gt("cpu", FieldValue(double(90.0))),
            Predicate::field_eq("host", FieldValue(std::string("srv1")))
        }),
        [&](const Event&) { count++; }
    );
    Event e1("m", 1); e1.set_double("cpu", 95.0); e1.set_string("host", "srv1");
    Event e2("m", 2); e2.set_double("cpu", 95.0); e2.set_string("host", "srv2");
    Event e3("m", 3); e3.set_double("cpu", 50.0); e3.set_string("host", "srv1");
    router.evaluate(e1);
    router.evaluate(e2);
    router.evaluate(e3);
    ASSERT_EQ(count, 1);
}

TEST_CASE(cr_composite_any) {
    ContentRouter router;
    int count = 0;
    router.add_route(
        Predicate::any({
            Predicate::field_eq("level", FieldValue(std::string("error"))),
            Predicate::field_eq("level", FieldValue(std::string("fatal")))
        }),
        [&](const Event&) { count++; }
    );
    Event e1("log", 1); e1.set_string("level", "error");
    Event e2("log", 2); e2.set_string("level", "info");
    Event e3("log", 3); e3.set_string("level", "fatal");
    router.evaluate(e1);
    router.evaluate(e2);
    router.evaluate(e3);
    ASSERT_EQ(count, 2);
}

TEST_CASE(cr_composite_not) {
    ContentRouter router;
    int count = 0;
    router.add_route(
        Predicate::negate(Predicate::field_eq("status", FieldValue(int64_t(200)))),
        [&](const Event&) { count++; }
    );
    Event e1("http", 1); e1.set_int("status", 200);
    Event e2("http", 2); e2.set_int("status", 500);
    router.evaluate(e1);
    router.evaluate(e2);
    ASSERT_EQ(count, 1);
}

TEST_CASE(cr_remove_route) {
    ContentRouter router;
    int count = 0;
    auto id = router.add_route(
        Predicate::field_exists("x"),
        [&](const Event&) { count++; }
    );
    Event e("t", 1); e.set_int("x", 1);
    router.evaluate(e);
    ASSERT_EQ(count, 1);
    ASSERT_TRUE(router.remove_route(id));
    router.evaluate(e);
    ASSERT_EQ(count, 1);
}

TEST_CASE(cr_stats) {
    ContentRouter router;
    router.add_route(Predicate::field_exists("x"), [](const Event&) {});
    Event e1("t", 1); e1.set_int("x", 1);
    Event e2("t", 2);
    router.evaluate(e1);
    router.evaluate(e2);
    auto s = router.stats();
    ASSERT_EQ(s.events_evaluated, (uint64_t)2);
    ASSERT_EQ(s.events_matched, (uint64_t)1);
    ASSERT_EQ(s.events_unmatched, (uint64_t)1);
}

TEST_CASE(cr_missing_field_no_match) {
    ContentRouter router;
    int count = 0;
    router.add_route(
        Predicate::field_eq("x", FieldValue(int64_t(1))),
        [&](const Event&) { count++; }
    );
    Event e("t", 1);
    router.evaluate(e);
    ASSERT_EQ(count, 0);
}

TEST_CASE(cr_multiple_routes_match) {
    ContentRouter router;
    int c1 = 0, c2 = 0;
    router.add_route(Predicate::field_exists("x"), [&](const Event&) { c1++; });
    router.add_route(Predicate::field_exists("x"), [&](const Event&) { c2++; });
    Event e("t", 1); e.set_int("x", 1);
    router.evaluate(e);
    ASSERT_EQ(c1, 1);
    ASSERT_EQ(c2, 1);
}

TEST_CASE(cr_clear) {
    ContentRouter router;
    router.add_route(Predicate::field_exists("x"), [](const Event&) {});
    router.clear();
    ASSERT_EQ(router.route_count(), (size_t)0);
}

TEST_CASE(cr_starts_with_zero_alloc) {
    ContentRouter router;
    int count = 0;
    router.add_route(
        Predicate::field_starts_with("path", "/api/v2/"),
        [&](const Event&) { count++; }
    );
    Event e1("http", 1); e1.set_string("path", "/api/v2/users/123");
    Event e2("http", 2); e2.set_string("path", "/api/v1/users");
    Event e3("http", 3); e3.set_string("path", "/api/v2/");
    router.evaluate(e1);
    router.evaluate(e2);
    router.evaluate(e3);
    ASSERT_EQ(count, 2);
}

TEST_CASE(cr_ends_with_zero_alloc) {
    ContentRouter router;
    int count = 0;
    router.add_route(
        Predicate::field_ends_with("file", ".json"),
        [&](const Event&) { count++; }
    );
    Event e1("fs", 1); e1.set_string("file", "config.json");
    Event e2("fs", 2); e2.set_string("file", "config.yaml");
    Event e3("fs", 3); e3.set_string("file", ".json");
    router.evaluate(e1);
    router.evaluate(e2);
    router.evaluate(e3);
    ASSERT_EQ(count, 2);
}

TEST_CASE(cr_nested_composite) {
    ContentRouter router;
    int count = 0;
    auto pred = Predicate::all({
        Predicate::any({
            Predicate::field_eq("env", FieldValue(std::string("prod"))),
            Predicate::field_eq("env", FieldValue(std::string("staging")))
        }),
        Predicate::field_gt("latency", FieldValue(double(1000.0)))
    });
    router.add_route(pred, [&](const Event&) { count++; });
    Event e1("req", 1); e1.set_string("env", "prod"); e1.set_double("latency", 1500.0);
    Event e2("req", 2); e2.set_string("env", "dev"); e2.set_double("latency", 1500.0);
    Event e3("req", 3); e3.set_string("env", "prod"); e3.set_double("latency", 500.0);
    router.evaluate(e1);
    router.evaluate(e2);
    router.evaluate(e3);
    ASSERT_EQ(count, 1);
}

RUN_ALL_TESTS()