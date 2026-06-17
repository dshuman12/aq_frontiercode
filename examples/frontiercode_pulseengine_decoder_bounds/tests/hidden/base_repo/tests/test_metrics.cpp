#include "test_framework.hpp"
#include "pulse/core/metrics.hpp"

using namespace pulse;

TEST_CASE(metrics_counter_increment) {
    MetricsCollector m;
    m.increment("req.count");
    m.increment("req.count");
    m.increment("req.count", 3);
    ASSERT_EQ(m.counter("req.count"), (int64_t)5);
}

TEST_CASE(metrics_counter_default_zero) {
    MetricsCollector m;
    ASSERT_EQ(m.counter("nonexistent"), (int64_t)0);
}

TEST_CASE(metrics_counter_negative_delta) {
    MetricsCollector m;
    m.increment("balance", 10);
    m.increment("balance", -3);
    ASSERT_EQ(m.counter("balance"), (int64_t)7);
}

TEST_CASE(metrics_gauge_set) {
    MetricsCollector m;
    m.gauge("cpu", 0.75);
    ASSERT_NEAR(m.gauge_value("cpu"), 0.75, 0.001);
}

TEST_CASE(metrics_gauge_overwrite) {
    MetricsCollector m;
    m.gauge("mem", 0.5);
    m.gauge("mem", 0.9);
    ASSERT_NEAR(m.gauge_value("mem"), 0.9, 0.001);
}

TEST_CASE(metrics_gauge_default_zero) {
    MetricsCollector m;
    ASSERT_NEAR(m.gauge_value("missing"), 0.0, 0.001);
}

TEST_CASE(metrics_timing_single) {
    MetricsCollector m;
    m.record_timing("latency", 42);
    auto s = m.timing("latency");
    ASSERT_EQ(s.count, (uint64_t)1);
    ASSERT_EQ(s.min_ms, (uint64_t)42);
    ASSERT_EQ(s.max_ms, (uint64_t)42);
    ASSERT_NEAR(s.avg_ms, 42.0, 0.001);
}

TEST_CASE(metrics_timing_multiple) {
    MetricsCollector m;
    m.record_timing("latency", 10);
    m.record_timing("latency", 20);
    m.record_timing("latency", 30);
    auto s = m.timing("latency");
    ASSERT_EQ(s.count, (uint64_t)3);
    ASSERT_EQ(s.min_ms, (uint64_t)10);
    ASSERT_EQ(s.max_ms, (uint64_t)30);
    ASSERT_NEAR(s.avg_ms, 20.0, 0.001);
}

TEST_CASE(metrics_timing_missing) {
    MetricsCollector m;
    auto s = m.timing("nope");
    ASSERT_EQ(s.count, (uint64_t)0);
    ASSERT_NEAR(s.avg_ms, 0.0, 0.001);
}

TEST_CASE(metrics_reset) {
    MetricsCollector m;
    m.increment("a");
    m.gauge("b", 1.0);
    m.record_timing("c", 50);
    ASSERT_EQ(m.total_metrics(), (size_t)3);
    m.reset();
    ASSERT_EQ(m.total_metrics(), (size_t)0);
    ASSERT_EQ(m.counter("a"), (int64_t)0);
    ASSERT_NEAR(m.gauge_value("b"), 0.0, 0.001);
    ASSERT_EQ(m.timing("c").count, (uint64_t)0);
}

TEST_CASE(metrics_counter_names) {
    MetricsCollector m;
    m.increment("x");
    m.increment("y");
    m.increment("z");
    auto names = m.counter_names();
    ASSERT_EQ(names.size(), (size_t)3);
}

TEST_CASE(metrics_gauge_names) {
    MetricsCollector m;
    m.gauge("g1", 1.0);
    m.gauge("g2", 2.0);
    auto names = m.gauge_names();
    ASSERT_EQ(names.size(), (size_t)2);
}

TEST_CASE(metrics_timing_names) {
    MetricsCollector m;
    m.record_timing("t1", 10);
    m.record_timing("t2", 20);
    auto names = m.timing_names();
    ASSERT_EQ(names.size(), (size_t)2);
}

TEST_CASE(metrics_total_metrics) {
    MetricsCollector m;
    m.increment("c1");
    m.increment("c2");
    m.gauge("g1", 0.5);
    m.record_timing("t1", 100);
    ASSERT_EQ(m.total_metrics(), (size_t)4);
}

RUN_ALL_TESTS()
