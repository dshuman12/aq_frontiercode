# PulseEngine

A high-performance, real-time event processing engine written in C++17.

PulseEngine provides a composable pipeline for ingesting, routing, windowing,
aggregating, and pattern-matching over continuous event streams. It is designed
as an embedded library — link it into your application and build streaming
analytics without external dependencies.

## Features

### Core
- **Typed Event Model** — events carry typed fields (int64, double, string, bool, bytes) with schema validation
- **EventBatch** — bulk container with sort, filter, slice, and iterator support
- **EventPool** — allocation-reuse pool with automatic field cleanup
- **MetricsCollector** — internal counter, gauge, and timing metrics tracking

### Buffers & Transport
- **Ring Buffer** — bounded circular buffer with DropOldest/DropNewest/Block overflow policies
- **Lock-Free SPSC Queue** — cache-line-aligned single-producer/single-consumer queue

### Routing
- **Topic Router** — trie-based topic matching with `*` (single-level) and `#` (multi-level) wildcards
- **Content Router** — predicate-based content filtering with Eq/Ne/Lt/Gt/Contains/StartsWith/EndsWith

### Windows
- **Tumbling Window** — fixed-size non-overlapping time windows
- **Sliding Window** — overlapping windows with configurable slide interval
- **Session Window** — activity-based windows with gap timeout and per-key partitioning
- **Count Window** — count-based tumbling windows (close after N events)
- **Global Window** — accumulate-all window with explicit flush
- **Sliding Count Window** — count-based sliding windows with overlap
- **Watermark Tracker** — out-of-order event handling with configurable lateness tolerance

### Aggregation
- **Statistical Aggregator** — online sum/min/max/mean/count with Welford variance
- **T-Digest** — approximate percentile estimation (p50, p90, p95, p99)
- **HyperLogLog** — cardinality estimation with MurmurHash64
- **Count-Min Sketch** — probabilistic frequency estimation with merge support
- **Histogram** — fixed-bucket distribution tracking with percentile estimation
- **Top-K Tracker** — maintain K highest-scoring items with eviction
- **Exponential Moving Average** — streaming EMA with configurable smoothing

### Complex Event Processing
- **NFA Engine** — pattern matcher for event sequences with match, epsilon, and negation transitions
- **Pattern Builder** — fluent API for constructing patterns with copy-on-write event capture

### Probabilistic Filters
- **Bloom Filter** — probabilistic set membership with configurable false-positive rate
- **Sampling Filter** — deterministic counter-based and consistent hash-based event sampling

### State Management
- **LRU Cache** — O(1) get/put with eviction callbacks and hit/miss statistics
- **State Store** — key-value store with per-key TTL and LRU eviction
- **MapState** — typed key-value state abstraction with for_each, get_or_create, update

### Serialization & Codec
- **Binary Codec** — compact, schema-aware serialization with varint/zigzag encoding
- **JSON Serializer** — hand-written Event ↔ JSON conversion with full string escaping
- **CSV Formatter** — configurable column-based formatting with RFC 4180 quoting
- **CRC32** — data integrity checksums with 256-entry lookup table

### Pipeline
- **Pipeline Builder** — fluent API for filter → map → sink chains
- **FlatMap Operator** — one-to-many event transformation
- **Throttle Operator** — timestamp-based rate limiting per time window
- **Deduplicate Operator** — field-based deduplication with bounded memory
- **Batch Operator** — micro-batching with configurable batch size

### Flow Control
- **Rate Limiter** — token bucket with configurable refill rate and burst capacity
- **Circuit Breaker** — Closed → Open → HalfOpen state machine for fault tolerance
- **Backpressure Controller** — watermark-based flow control with Drop/Block/Sample strategies
- **Retry Policy** — exponential backoff with configurable bounds and static factories

### Timer
- **Timer Wheel** — O(1) scheduling with overflow promotion and recurring timers

## Building

```bash
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
```

## Running Tests

```bash
cd build
ctest --output-on-failure
```

## Quick Example

```cpp
#include "pulse/pulse.hpp"

int main() {
    using namespace pulse;

    // Build a monitoring pipeline
    auto pipeline = PipelineBuilder("monitor")
        .filter([](const Event& e) { return e.has_field("cpu"); })
        .filter([](const Event& e) { return e.get_double("cpu") > 80.0; })
        .sink([](const Event& e) {
            std::cout << "ALERT: CPU " << e.get_double("cpu") << "%" << std::endl;
        })
        .build();

    // Feed events
    for (int i = 0; i < 100; i++) {
        Event e("metric", i * 1000);
        e.set_double("cpu", 50.0 + (i % 20) * 3.0);
        pipeline.process(e);
    }
}
```

## Project Structure

```
include/pulse/   — public headers (one subdirectory per module)
  core/          — Event, Schema, FieldValue, Result<T>, Config
  buffer/        — RingBuffer, SPSCQueue
  router/        — TopicRouter (trie), ContentRouter (predicates)
  window/        — TumblingWindow, SlidingWindow, SessionWindow
  aggregator/    — Aggregator (Welford), TDigest, HyperLogLog
  pattern/       — NFAEngine, PatternMatcher, PatternBuilder
  state/         — LRUCache<K,V>, StateStore
  timer/         — TimerWheel
  codec/         — Encoder, Decoder (binary, varint, zigzag)
  pipeline/      — Operator, Pipeline, PipelineBuilder
src/             — implementation files
tests/           — 19 test executables, 291 tests
environment/     — Dockerfile (gcc:13.3)
```

## License

MIT