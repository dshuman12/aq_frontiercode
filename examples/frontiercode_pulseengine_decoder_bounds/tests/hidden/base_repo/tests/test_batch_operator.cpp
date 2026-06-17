#include "test_framework.hpp"
#include "pulse/pipeline/batch_operator.hpp"

using namespace pulse;

TEST_CASE(batch_create) {
    int called = 0;
    BatchOperator op(5, [&](const std::vector<Event>&) { called++; });
    ASSERT_EQ(op.batch_size(), (size_t)5);
    ASSERT_EQ(op.batches_emitted(), (uint64_t)0);
    ASSERT_EQ(op.total_events(), (uint64_t)0);
    ASSERT_EQ(op.buffered_count(), (size_t)0);
    ASSERT_STR_EQ(op.name(), "batch");
}

TEST_CASE(batch_zero_size_throws) {
    ASSERT_THROWS(BatchOperator(0, [](const std::vector<Event>&) {}));
}

TEST_CASE(batch_null_callback_throws) {
    BatchOperator::BatchCallback cb = nullptr;
    ASSERT_THROWS(BatchOperator(5, cb));
}

TEST_CASE(batch_custom_name) {
    BatchOperator op(3, [](const std::vector<Event>&) {}, "my_batch");
    ASSERT_STR_EQ(op.name(), "my_batch");
}

TEST_CASE(batch_emit_on_full) {
    std::vector<Event> captured;
    BatchOperator op(3, [&](const std::vector<Event>& batch) {
        captured = batch;
    });
    op.process(Event("a", 1));
    op.process(Event("b", 2));
    ASSERT_EQ(op.batches_emitted(), (uint64_t)0);
    ASSERT_EQ(op.buffered_count(), (size_t)2);

    op.process(Event("c", 3));
    ASSERT_EQ(op.batches_emitted(), (uint64_t)1);
    ASSERT_EQ(captured.size(), (size_t)3);
    ASSERT_EQ(op.buffered_count(), (size_t)0);
}

TEST_CASE(batch_multiple_batches) {
    int batch_count = 0;
    BatchOperator op(2, [&](const std::vector<Event>&) { batch_count++; });
    for (int i = 0; i < 7; i++) {
        op.process(Event("e", i));
    }
    ASSERT_EQ(batch_count, 3);
    ASSERT_EQ(op.batches_emitted(), (uint64_t)3);
    ASSERT_EQ(op.total_events(), (uint64_t)7);
    ASSERT_EQ(op.buffered_count(), (size_t)1);
}

TEST_CASE(batch_flush_partial) {
    std::vector<Event> captured;
    BatchOperator op(5, [&](const std::vector<Event>& batch) {
        captured = batch;
    });
    op.process(Event("a", 1));
    op.process(Event("b", 2));
    ASSERT_EQ(op.batches_emitted(), (uint64_t)0);

    op.flush();
    ASSERT_EQ(op.batches_emitted(), (uint64_t)1);
    ASSERT_EQ(captured.size(), (size_t)2);
    ASSERT_EQ(op.buffered_count(), (size_t)0);
}

TEST_CASE(batch_flush_empty) {
    int called = 0;
    BatchOperator op(5, [&](const std::vector<Event>&) { called++; });
    op.flush();
    ASSERT_EQ(called, 0);
    ASSERT_EQ(op.batches_emitted(), (uint64_t)0);
}

TEST_CASE(batch_total_events_tracking) {
    BatchOperator op(3, [](const std::vector<Event>&) {});
    for (int i = 0; i < 10; i++) {
        op.process(Event("e", i));
    }
    ASSERT_EQ(op.total_events(), (uint64_t)10);
    ASSERT_EQ(op.batches_emitted(), (uint64_t)3);
    ASSERT_EQ(op.buffered_count(), (size_t)1);
}

TEST_CASE(batch_operator_type) {
    BatchOperator op(5, [](const std::vector<Event>&) {});
    ASSERT_TRUE(op.type() == OperatorType::Window);
}

TEST_CASE(batch_avg_batch_size) {
    BatchOperator op(4, [](const std::vector<Event>&) {});
    // No batches yet — average should be 0.
    ASSERT_NEAR(op.avg_batch_size(), 0.0, 0.01);

    for (int i = 0; i < 4; i++) {
        op.process(Event("e", i));
    }
    // One full batch of 4.
    ASSERT_NEAR(op.avg_batch_size(), 4.0, 0.01);

    // Add 2 more and flush (partial batch of 2).
    op.process(Event("e", 10));
    op.process(Event("e", 11));
    op.flush();
    // Two batches: 4 + 2 = 6 events, avg = 3.0.
    ASSERT_NEAR(op.avg_batch_size(), 3.0, 0.01);
}

TEST_CASE(batch_reset) {
    BatchOperator op(2, [](const std::vector<Event>&) {});
    op.process(Event("a", 1));
    op.process(Event("b", 2));
    op.process(Event("c", 3));
    ASSERT_EQ(op.batches_emitted(), (uint64_t)1);
    ASSERT_GT(op.total_events(), (uint64_t)0);

    op.reset();
    ASSERT_EQ(op.batches_emitted(), (uint64_t)0);
    ASSERT_EQ(op.total_events(), (uint64_t)0);
    ASSERT_EQ(op.buffered_count(), (size_t)0);
}

TEST_CASE(batch_event_data_preserved) {
    std::vector<Event> captured;
    BatchOperator op(2, [&](const std::vector<Event>& batch) {
        captured = batch;
    });

    Event e1("metric", 100);
    e1.set_int("value", 42);
    Event e2("metric", 200);
    e2.set_int("value", 99);

    op.process(e1);
    op.process(e2);

    ASSERT_EQ(captured.size(), (size_t)2);
    ASSERT_EQ(captured[0].get_int("value"), (int64_t)42);
    ASSERT_EQ(captured[1].get_int("value"), (int64_t)99);
    ASSERT_STR_EQ(captured[0].event_type(), "metric");
}

RUN_ALL_TESTS()
