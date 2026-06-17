#include "test_framework.hpp"
#include "pulse/pulse.hpp"

using namespace pulse;

TEST_CASE(integ_buffer_to_window) {
    RingBuffer rb(100);
    for (int i = 0; i < 50; i++) {
        Event e("metric", i * 100);
        e.set_double("value", static_cast<double>(i));
        rb.push(std::move(e));
    }

    int windows_closed = 0;
    TumblingWindow tw(1000, [&](const std::vector<Event>& evts, Timestamp, Timestamp) {
        windows_closed++;
        ASSERT_GT(evts.size(), (size_t)0);
    });

    auto drained = rb.drain(100);
    for (const auto& e : drained) {
        tw.add(e);
    }
    tw.flush();
    ASSERT_GT(windows_closed, 0);
}

TEST_CASE(integ_router_to_aggregator) {
    TopicRouter router;
    Aggregator agg;

    router.subscribe("metrics.cpu", [&](const Event& e) {
        agg.add(e.get_double("value"));
    });

    for (int i = 0; i < 100; i++) {
        Event e("metric", i);
        e.set_double("value", static_cast<double>(i));
        router.publish("metrics.cpu", e);
    }

    ASSERT_EQ(agg.count(), (uint64_t)100);
    ASSERT_NEAR(agg.mean(), 49.5, 1e-6);
}

TEST_CASE(integ_pipeline_with_schema_validation) {
    Schema schema("sensor");
    schema.add_field("temp", FieldType::Double);
    schema.add_field("sensor_id", FieldType::String);

    int valid_count = 0;
    int invalid_count = 0;

    Pipeline p;
    p.filter([&](const Event& e) {
        auto r = e.validate(schema);
        if (r.is_err()) { invalid_count++; return false; }
        return true;
    }).filter([](const Event& e) {
        return e.get_double("temp") > 30.0;
    }).sink([&](const Event&) {
        valid_count++;
    });

    Event e1("sensor", 1); e1.set_double("temp", 35.0); e1.set_string("sensor_id", "s1");
    Event e2("sensor", 2); e2.set_double("temp", 25.0); e2.set_string("sensor_id", "s2");
    Event e3("sensor", 3); e3.set_string("temp", "not_a_number");
    Event e4("sensor", 4); e4.set_double("temp", 40.0); e4.set_string("sensor_id", "s3");

    p.process(e1);
    p.process(e2);
    p.process(e3);
    p.process(e4);

    ASSERT_EQ(valid_count, 2);
    ASSERT_EQ(invalid_count, 1);
}

TEST_CASE(integ_encode_buffer_decode) {
    RingBuffer rb(50);
    for (int i = 0; i < 10; i++) {
        Event e("log", i * 1000);
        e.set_int("level", i % 3);
        e.set_string("msg", "message_" + std::to_string(i));
        rb.push(std::move(e));
    }

    Encoder enc;
    auto events = rb.drain(100);
    for (const auto& e : events) {
        enc.encode_event(e);
    }

    Decoder dec(enc.data());
    int decoded = 0;
    while (!dec.at_end()) {
        auto r = dec.decode_event();
        ASSERT_TRUE(r.is_ok());
        decoded++;
    }
    ASSERT_EQ(decoded, 10);
}

TEST_CASE(integ_pattern_with_state) {
    StateStore store;
    int alerts = 0;

    auto engine = PatternBuilder()
        .begin()
        .then(Predicate::field_eq("action", FieldValue(std::string("login_fail"))))
        .then(Predicate::field_eq("action", FieldValue(std::string("login_fail"))))
        .then(Predicate::field_eq("action", FieldValue(std::string("login_fail"))))
        .on_match([&](const std::vector<Event>& evts) {
            alerts++;
            if (!evts.empty() && evts[0].has_field("user")) {
                store.put(evts[0].get_string("user"),
                          FieldValue(int64_t(alerts)));
            }
        })
        .build();

    for (int i = 0; i < 5; i++) {
        Event e("auth", i * 100);
        e.set_string("action", "login_fail");
        e.set_string("user", "attacker");
        engine->process(e);
    }

    ASSERT_GT(alerts, 0);
    auto v = store.get("attacker");
    ASSERT_TRUE(v.has_value());
}

TEST_CASE(integ_content_router_to_hll) {
    ContentRouter router;
    HyperLogLog hll;

    router.add_route(
        Predicate::field_exists("user_id"),
        [&](const Event& e) {
            hll.add(e.get_string("user_id"));
        }
    );

    for (int i = 0; i < 200; i++) {
        Event e("visit", i);
        e.set_string("user_id", "user_" + std::to_string(i % 50));
        router.evaluate(e);
    }

    double est = hll.estimate();
    ASSERT_GT(est, 30.0);
    ASSERT_LT(est, 70.0);
}

TEST_CASE(integ_timer_driven_window) {
    TimerWheel tw(256, 1);
    int window_count = 0;

    TumblingWindow window(1000,
        [&](const std::vector<Event>& evts, Timestamp, Timestamp) {
            window_count++;
            (void)evts;
        });

    tw.schedule_recurring(1000, [&](TimerId) {
        window.advance_time(tw.current_time());
    });

    for (int i = 0; i < 50; i++) {
        Event e("tick", i * 100);
        window.add(e);
        tw.advance(i * 100);
    }

    tw.advance(6000);
    window.flush();
    ASSERT_GT(window_count, 0);
}

TEST_CASE(integ_full_pipeline_flow) {
    Aggregator cpu_agg;
    int alert_count = 0;

    auto pipeline = PipelineBuilder("monitoring")
        .filter([](const Event& e) {
            return e.event_type() == "metric" && e.has_field("cpu");
        })
        .map([](const Event& e) {
            Event out = e.clone();
            out.set_bool("processed", true);
            return out;
        })
        .sink([&](const Event& e) {
            double cpu = e.get_double("cpu");
            cpu_agg.add(cpu);
            if (cpu > 90.0) alert_count++;
        })
        .build();

    for (int i = 0; i < 100; i++) {
        Event e("metric", i * 1000);
        e.set_double("cpu", 50.0 + (i % 20) * 3.0);
        pipeline.process(e);
    }

    ASSERT_EQ(cpu_agg.count(), (uint64_t)100);
    ASSERT_GT(cpu_agg.mean(), 50.0);
    ASSERT_GE(alert_count, 0);
}

TEST_CASE(integ_schema_registry_multi_type) {
    SchemaRegistry registry;

    Schema click_schema("click");
    click_schema.add_field("x", FieldType::Int64);
    click_schema.add_field("y", FieldType::Int64);
    registry.register_schema("click", click_schema);

    Schema purchase_schema("purchase");
    purchase_schema.add_field("amount", FieldType::Double);
    purchase_schema.add_field("item", FieldType::String);
    registry.register_schema("purchase", purchase_schema);

    Event e1 = EventBuilder("click", 100).with_int("x", 10).with_int("y", 20).build();
    Event e2 = EventBuilder("purchase", 200).with_double("amount", 49.99).with_string("item", "book").build();

    ASSERT_TRUE(e1.validate(registry.get_schema("click")).is_ok());
    ASSERT_TRUE(e2.validate(registry.get_schema("purchase")).is_ok());
    ASSERT_TRUE(e1.validate(registry.get_schema("purchase")).is_err());
}

TEST_CASE(integ_spsc_producer_consumer) {
    SPSCQueue queue(64);
    std::vector<int64_t> consumed;

    for (int i = 0; i < 30; i++) {
        Event e("data", i);
        e.set_int("seq", i);
        queue.try_push(std::move(e));
    }

    while (auto e = queue.try_pop()) {
        consumed.push_back(e->get_int("seq"));
    }

    ASSERT_EQ(consumed.size(), (size_t)30);
    for (int i = 0; i < 30; i++) {
        ASSERT_EQ(consumed[i], (int64_t)i);
    }
}

TEST_CASE(integ_bloom_filter_dedup_pipeline) {
    BloomFilter<> bloom(1000, 0.01);
    int unique = 0, duplicate = 0;

    for (int i = 0; i < 200; i++) {
        std::string key = "user_" + std::to_string(i % 50);
        if (bloom.might_contain(key)) {
            duplicate++;
        } else {
            bloom.add(key);
            unique++;
        }
    }
    ASSERT_EQ(unique, 50);
    ASSERT_EQ(duplicate, 150);
}

TEST_CASE(integ_json_roundtrip_through_buffer) {
    RingBuffer rb(32);
    for (int i = 0; i < 5; i++) {
        Event e("metric", i * 1000);
        e.set_int("value", i * 10);
        e.set_string("host", "srv" + std::to_string(i));
        rb.push(std::move(e));
    }

    auto events = rb.drain(100);
    for (const auto& e : events) {
        std::string json = JsonSerializer::serialize(e);
        Event restored = JsonSerializer::deserialize(json);
        ASSERT_STR_EQ(restored.event_type(), e.event_type());
        ASSERT_EQ(restored.get_int("value"), e.get_int("value"));
        ASSERT_STR_EQ(restored.get_string("host"), e.get_string("host"));
    }
}

TEST_CASE(integ_event_batch_to_count_window) {
    EventBatch batch;
    for (int i = 0; i < 25; i++) {
        batch.add(Event("tick", i * 100));
    }
    batch.sort_by_timestamp();

    int windows = 0;
    CountWindow cw(10, [&](const std::vector<Event>& evts) {
        windows++;
        ASSERT_LE(evts.size(), (size_t)10);
    });

    for (size_t i = 0; i < batch.size(); i++) {
        cw.add(batch[i]);
    }
    cw.flush();
    ASSERT_GE(windows, 2);
}

TEST_CASE(integ_histogram_from_aggregated_window) {
    Histogram hist(0.0, 100.0, 10);
    Aggregator agg;

    TumblingWindow tw(1000, [&](const std::vector<Event>& evts, Timestamp, Timestamp) {
        for (const auto& e : evts) {
            double v = e.get_double("latency");
            agg.add(v);
            hist.record(v);
        }
    });

    for (int i = 0; i < 100; i++) {
        Event e("req", i * 50);
        e.set_double("latency", 10.0 + (i % 20) * 4.0);
        tw.add(e);
    }
    tw.flush();

    ASSERT_EQ(agg.count(), (uint64_t)100);
    ASSERT_GT(hist.count(), (uint64_t)0);
    ASSERT_NEAR(hist.percentile(0.5), agg.mean(), 20.0);
}

TEST_CASE(integ_rate_limiter_with_circuit_breaker) {
    RateLimiter rl(1.0, 5.0);
    CircuitBreaker cb(3, 1000);

    int processed = 0, rejected = 0;
    for (int i = 0; i < 20; i++) {
        Timestamp now = i * 2;
        if (!cb.allow(now)) {
            rejected++;
            continue;
        }
        if (rl.try_acquire(now)) {
            cb.record_success(now);
            processed++;
        } else {
            cb.record_failure(now);
            rejected++;
        }
    }
    ASSERT_GT(processed, 0);
}

TEST_CASE(integ_watermark_with_sliding_window) {
    WatermarkTracker wm(500);
    int emitted = 0;

    SlidingWindow sw(2000, 1000, [&](const std::vector<Event>&, Timestamp, Timestamp) {
        emitted++;
    });

    for (int i = 0; i < 50; i++) {
        Timestamp ts = i * 100;
        wm.observe(ts);
        if (!wm.is_late(ts)) {
            sw.add(Event("data", ts));
        }
    }
    sw.flush();
    ASSERT_GT(emitted, 0);
    ASSERT_EQ(wm.late_count(), (uint64_t)0);
}

TEST_CASE(integ_metrics_across_pipeline) {
    MetricsCollector metrics;
    int sink_count = 0;

    Pipeline p;
    p.filter([&](const Event& e) {
        metrics.increment("events.received");
        return e.has_field("important");
    }).sink([&](const Event&) {
        metrics.increment("events.processed");
        sink_count++;
    });

    for (int i = 0; i < 100; i++) {
        Event e("log", i);
        if (i % 3 == 0) e.set_bool("important", true);
        p.process(e);
    }

    ASSERT_EQ(metrics.counter("events.received"), (int64_t)100);
    ASSERT_EQ(metrics.counter("events.processed"), (int64_t)sink_count);
    ASSERT_GT(sink_count, 0);
}

TEST_CASE(integ_crc32_codec_integrity) {
    Event e("sensor", 12345);
    e.set_double("temp", 36.6);
    e.set_string("unit", "celsius");

    Encoder enc;
    enc.encode_event(e);
    auto data = enc.data();

    uint32_t checksum = CRC32::compute(data);
    ASSERT_NE(checksum, (uint32_t)0);

    Decoder dec(data);
    auto result = dec.decode_event();
    ASSERT_TRUE(result.is_ok());

    uint32_t checksum2 = CRC32::compute(data);
    ASSERT_EQ(checksum, checksum2);
}

TEST_CASE(integ_map_state_with_session_window) {
    MapState<std::string, int> user_sessions;

    SessionWindow sw(500, [&](const std::vector<Event>& evts, Timestamp, Timestamp) {
        if (!evts.empty() && evts[0].has_field("user")) {
            std::string user = evts[0].get_string("user");
            int prev = user_sessions.get_or_default(user, 0);
            user_sessions.put(user, prev + 1);
        }
    });

    for (int i = 0; i < 10; i++) {
        Event e("click", i * 100);
        e.set_string("user", "alice");
        sw.add(e);
    }
    for (int i = 0; i < 10; i++) {
        Event e("click", 5000 + i * 100);
        e.set_string("user", "bob");
        sw.add(e);
    }
    sw.flush_all();

    ASSERT_TRUE(user_sessions.contains("alice"));
    ASSERT_TRUE(user_sessions.contains("bob"));
    ASSERT_GT(user_sessions.get_or_default("alice", 0), 0);
}

RUN_ALL_TESTS()