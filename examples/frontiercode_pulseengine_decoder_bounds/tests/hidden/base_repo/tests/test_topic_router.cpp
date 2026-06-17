#include "test_framework.hpp"
#include "pulse/router/topic_router.hpp"

using namespace pulse;

TEST_CASE(tr_subscribe_count) {
    TopicRouter router;
    ASSERT_EQ(router.subscription_count(), (size_t)0);
    router.subscribe("sys.cpu", [](const Event&) {});
    ASSERT_EQ(router.subscription_count(), (size_t)1);
}

TEST_CASE(tr_exact_match) {
    TopicRouter router;
    int count = 0;
    router.subscribe("sys.cpu", [&](const Event&) { count++; });
    Event e("metric", 100);
    router.publish("sys.cpu", e);
    ASSERT_EQ(count, 1);
}

TEST_CASE(tr_no_match) {
    TopicRouter router;
    int count = 0;
    router.subscribe("sys.cpu", [&](const Event&) { count++; });
    Event e("metric", 100);
    router.publish("sys.mem", e);
    ASSERT_EQ(count, 0);
}

TEST_CASE(tr_multiple_subscribers) {
    TopicRouter router;
    int c1 = 0, c2 = 0;
    router.subscribe("sys.cpu", [&](const Event&) { c1++; });
    router.subscribe("sys.cpu", [&](const Event&) { c2++; });
    router.publish("sys.cpu", Event("m", 1));
    ASSERT_EQ(c1, 1);
    ASSERT_EQ(c2, 1);
}

TEST_CASE(tr_wildcard_single_level) {
    TopicRouter router;
    int count = 0;
    router.subscribe("sys.*.load", [&](const Event&) { count++; });
    router.publish("sys.cpu.load", Event("m", 1));
    ASSERT_EQ(count, 1);
    router.publish("sys.mem.load", Event("m", 2));
    ASSERT_EQ(count, 2);
    router.publish("sys.cpu.temp", Event("m", 3));
    ASSERT_EQ(count, 2);
}

TEST_CASE(tr_wildcard_multi_level) {
    TopicRouter router;
    int count = 0;
    router.subscribe("sys.#", [&](const Event&) { count++; });
    router.publish("sys.cpu", Event("m", 1));
    ASSERT_EQ(count, 1);
    router.publish("sys.cpu.load", Event("m", 2));
    ASSERT_EQ(count, 2);
    router.publish("sys.mem.usage.peak", Event("m", 3));
    ASSERT_EQ(count, 3);
}

TEST_CASE(tr_root_wildcard) {
    TopicRouter router;
    int count = 0;
    router.subscribe("#", [&](const Event&) { count++; });
    router.publish("anything", Event("m", 1));
    ASSERT_EQ(count, 1);
    router.publish("some.deep.topic", Event("m", 2));
    ASSERT_EQ(count, 2);
}

TEST_CASE(tr_unsubscribe) {
    TopicRouter router;
    int count = 0;
    auto id = router.subscribe("sys.cpu", [&](const Event&) { count++; });
    router.publish("sys.cpu", Event("m", 1));
    ASSERT_EQ(count, 1);
    ASSERT_TRUE(router.unsubscribe(id));
    router.publish("sys.cpu", Event("m", 2));
    ASSERT_EQ(count, 1);
}

TEST_CASE(tr_unsubscribe_nonexistent) {
    TopicRouter router;
    ASSERT_FALSE(router.unsubscribe(999));
}

TEST_CASE(tr_clear) {
    TopicRouter router;
    router.subscribe("a", [](const Event&) {});
    router.subscribe("b", [](const Event&) {});
    router.clear();
    ASSERT_EQ(router.subscription_count(), (size_t)0);
}

TEST_CASE(tr_stats) {
    TopicRouter router;
    router.subscribe("sys.cpu", [](const Event&) {});
    router.publish("sys.cpu", Event("m", 1));
    router.publish("sys.cpu", Event("m", 2));
    router.publish("no.match", Event("m", 3));
    auto s = router.stats();
    ASSERT_EQ(s.events_routed, (uint64_t)2);
    ASSERT_EQ(s.events_unmatched, (uint64_t)1);
}

TEST_CASE(tr_deep_topic) {
    TopicRouter router;
    int count = 0;
    router.subscribe("a.b.c.d.e.f", [&](const Event&) { count++; });
    router.publish("a.b.c.d.e.f", Event("m", 1));
    ASSERT_EQ(count, 1);
    router.publish("a.b.c.d.e", Event("m", 2));
    ASSERT_EQ(count, 1);
}

TEST_CASE(tr_event_data_passed) {
    TopicRouter router;
    int64_t received_val = 0;
    router.subscribe("data", [&](const Event& e) {
        received_val = e.get_int("x");
    });
    Event e("data", 1);
    e.set_int("x", 42);
    router.publish("data", e);
    ASSERT_EQ(received_val, (int64_t)42);
}

TEST_CASE(tr_mixed_exact_and_wildcard) {
    TopicRouter router;
    int exact = 0, wild = 0;
    router.subscribe("sys.cpu", [&](const Event&) { exact++; });
    router.subscribe("sys.*", [&](const Event&) { wild++; });
    router.publish("sys.cpu", Event("m", 1));
    ASSERT_EQ(exact, 1);
    ASSERT_EQ(wild, 1);
}

TEST_CASE(tr_publish_routes_and_counts_single_pass) {
    TopicRouter router;
    int c1 = 0, c2 = 0, c3 = 0;
    router.subscribe("sys.cpu", [&](const Event&) { c1++; });
    router.subscribe("sys.*", [&](const Event&) { c2++; });
    router.subscribe("sys.#", [&](const Event&) { c3++; });
    router.publish("sys.cpu", Event("m", 1));
    ASSERT_EQ(c1, 1);
    ASSERT_EQ(c2, 1);
    ASSERT_EQ(c3, 1);
    auto s = router.stats();
    ASSERT_EQ(s.events_routed, (uint64_t)1);
}

TEST_CASE(tr_many_subscriptions) {
    TopicRouter router;
    int total = 0;
    for (int i = 0; i < 50; i++) {
        router.subscribe("topic." + std::to_string(i), [&](const Event&) { total++; });
    }
    ASSERT_EQ(router.subscription_count(), (size_t)50);
    router.publish("topic.25", Event("m", 1));
    ASSERT_EQ(total, 1);
}

TEST_CASE(tr_fast_unsubscribe_batch) {
    TopicRouter router;
    std::vector<HandlerId> ids;
    for (int i = 0; i < 100; i++) {
        auto id = router.subscribe("topic." + std::to_string(i), [](const Event&) {});
        ids.push_back(id);
    }
    ASSERT_EQ(router.subscription_count(), (size_t)100);
    for (auto id : ids) {
        ASSERT_TRUE(router.unsubscribe(id));
    }
    ASSERT_EQ(router.subscription_count(), (size_t)0);
    for (auto id : ids) {
        ASSERT_FALSE(router.unsubscribe(id));
    }
}

TEST_CASE(tr_unsubscribe_wildcard_indexed) {
    TopicRouter router;
    int count = 0;
    auto id = router.subscribe("sys.#", [&](const Event&) { count++; });
    router.publish("sys.cpu.load", Event("m", 1));
    ASSERT_EQ(count, 1);
    ASSERT_TRUE(router.unsubscribe(id));
    router.publish("sys.cpu.load", Event("m", 2));
    ASSERT_EQ(count, 1);
    ASSERT_EQ(router.subscription_count(), (size_t)0);
}

RUN_ALL_TESTS()