#include "test_framework.hpp"
#include "pulse/core/event_batch.hpp"

using namespace pulse;

// helper: create a simple event with a given type and timestamp
static Event make_event(const std::string& type, Timestamp ts) {
    return Event(type, ts);
}

// 1 — default-constructed batch is empty
TEST_CASE(batch_default_empty) {
    EventBatch batch;
    ASSERT_TRUE(batch.empty());
    ASSERT_EQ(batch.size(), (size_t)0);
}

// 2 — reserve constructor still empty but has capacity
TEST_CASE(batch_reserve_ctor) {
    EventBatch batch(64);
    ASSERT_TRUE(batch.empty());
    ASSERT_EQ(batch.size(), (size_t)0);
}

// 3 — add single event
TEST_CASE(batch_add_single) {
    EventBatch batch;
    batch.add(make_event("click", 100));
    ASSERT_FALSE(batch.empty());
    ASSERT_EQ(batch.size(), (size_t)1);
    ASSERT_STR_EQ(batch.at(0).event_type(), "click");
    ASSERT_EQ(batch.at(0).timestamp(), (Timestamp)100);
}

// 4 — add_all appends multiple events
TEST_CASE(batch_add_all) {
    EventBatch batch;
    batch.add(make_event("a", 1));
    std::vector<Event> more;
    more.push_back(make_event("b", 2));
    more.push_back(make_event("c", 3));
    batch.add_all(std::move(more));
    ASSERT_EQ(batch.size(), (size_t)3);
    ASSERT_STR_EQ(batch[2].event_type(), "c");
}

// 5 — at and operator[] are equivalent
TEST_CASE(batch_at_vs_subscript) {
    EventBatch batch;
    batch.add(make_event("x", 10));
    ASSERT_EQ(batch.at(0).timestamp(), batch[0].timestamp());
    ASSERT_STR_EQ(batch.at(0).event_type(), batch[0].event_type());
}

// 6 — at throws on out-of-range index
TEST_CASE(batch_at_out_of_range) {
    EventBatch batch;
    batch.add(make_event("e", 1));
    ASSERT_THROWS(batch.at(1));
    ASSERT_THROWS(batch.at(999));
}

// 7 — take removes and returns the event
TEST_CASE(batch_take) {
    EventBatch batch;
    batch.add(make_event("first", 10));
    batch.add(make_event("second", 20));
    batch.add(make_event("third", 30));
    Event taken = batch.take(1);
    ASSERT_STR_EQ(taken.event_type(), "second");
    ASSERT_EQ(batch.size(), (size_t)2);
    ASSERT_STR_EQ(batch[0].event_type(), "first");
    ASSERT_STR_EQ(batch[1].event_type(), "third");
}

// 8 — take throws on invalid index
TEST_CASE(batch_take_out_of_range) {
    EventBatch batch;
    ASSERT_THROWS(batch.take(0));
}

// 9 — take_all moves everything out
TEST_CASE(batch_take_all) {
    EventBatch batch;
    batch.add(make_event("a", 1));
    batch.add(make_event("b", 2));
    auto all = batch.take_all();
    ASSERT_EQ(all.size(), (size_t)2);
    ASSERT_TRUE(batch.empty());
}

// 10 — clear empties the batch
TEST_CASE(batch_clear) {
    EventBatch batch;
    batch.add(make_event("x", 1));
    batch.add(make_event("y", 2));
    batch.clear();
    ASSERT_TRUE(batch.empty());
    ASSERT_EQ(batch.size(), (size_t)0);
}

// 11 — sort_by_timestamp orders events ascending
TEST_CASE(batch_sort_by_timestamp) {
    EventBatch batch;
    batch.add(make_event("c", 300));
    batch.add(make_event("a", 100));
    batch.add(make_event("b", 200));
    batch.sort_by_timestamp();
    ASSERT_EQ(batch[0].timestamp(), (Timestamp)100);
    ASSERT_EQ(batch[1].timestamp(), (Timestamp)200);
    ASSERT_EQ(batch[2].timestamp(), (Timestamp)300);
}

// 12 — filter keeps matching events
TEST_CASE(batch_filter) {
    EventBatch batch;
    batch.add(make_event("keep", 1));
    batch.add(make_event("drop", 2));
    batch.add(make_event("keep", 3));
    batch.add(make_event("drop", 4));
    batch.filter([](const Event& e) { return e.event_type() == "keep"; });
    ASSERT_EQ(batch.size(), (size_t)2);
    ASSERT_STR_EQ(batch[0].event_type(), "keep");
    ASSERT_STR_EQ(batch[1].event_type(), "keep");
}

// 13 — slice produces a sub-batch (copy)
TEST_CASE(batch_slice) {
    EventBatch batch;
    for (Timestamp t = 0; t < 5; ++t) {
        batch.add(make_event("e", t));
    }
    EventBatch sub = batch.slice(1, 3);
    ASSERT_EQ(sub.size(), (size_t)3);
    ASSERT_EQ(sub[0].timestamp(), (Timestamp)1);
    ASSERT_EQ(sub[1].timestamp(), (Timestamp)2);
    ASSERT_EQ(sub[2].timestamp(), (Timestamp)3);
    // original unchanged
    ASSERT_EQ(batch.size(), (size_t)5);
}

// 14 — slice clamps to end of batch
TEST_CASE(batch_slice_clamp) {
    EventBatch batch;
    batch.add(make_event("a", 10));
    batch.add(make_event("b", 20));
    EventBatch sub = batch.slice(1, 100);
    ASSERT_EQ(sub.size(), (size_t)1);
    ASSERT_EQ(sub[0].timestamp(), (Timestamp)20);
}

// 15 — slice with start beyond size returns empty batch
TEST_CASE(batch_slice_beyond) {
    EventBatch batch;
    batch.add(make_event("a", 1));
    EventBatch sub = batch.slice(5, 2);
    ASSERT_TRUE(sub.empty());
}

// 16 — estimated_bytes returns non-zero for non-empty batch
TEST_CASE(batch_estimated_bytes) {
    EventBatch batch;
    batch.add(make_event("metric", 1));
    batch[0]; // ensure it's accessible
    ASSERT_GT(batch.estimated_bytes(), (size_t)0);
}

// 17 — iterator support: range-for counts correct elements
TEST_CASE(batch_iterator) {
    EventBatch batch;
    batch.add(make_event("a", 1));
    batch.add(make_event("b", 2));
    batch.add(make_event("c", 3));
    size_t count = 0;
    for (const auto& e : batch) {
        (void)e;
        ++count;
    }
    ASSERT_EQ(count, (size_t)3);
}

// 18 — events preserve fields through the batch
TEST_CASE(batch_preserves_fields) {
    Event e("metric", 42);
    e.set_int("cpu", 95);
    e.set_string("host", "srv-1");
    EventBatch batch;
    batch.add(std::move(e));
    ASSERT_EQ(batch[0].get_int("cpu"), (int64_t)95);
    ASSERT_STR_EQ(batch[0].get_string("host"), "srv-1");
    ASSERT_EQ(batch[0].field_count(), (size_t)2);
}

RUN_ALL_TESTS()