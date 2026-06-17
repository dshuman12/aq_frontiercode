# PulseEngine — Development Notes

## Overview

PulseEngine is a real-time event processing engine written in C++17. It provides composable building blocks for ingesting, routing, windowing, aggregating, pattern-matching, and serializing continuous event streams.

**Language:** C++17 (GCC 13.3)
**Build:** CMake 3.14+ / Make
**Test framework:** Custom assertion header (`tests/test_framework.hpp`)
**LOC:** ~6,800+
**Tests:** 291 (19 test executables, all passing)

## Build & Test

```bash
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
ctest --output-on-failure
```

## Dockerfile

`environment/Dockerfile` — `FROM gcc:13.3`, installs cmake+make, copies project, builds.

```
WORKDIR /testbed/PulseEngine
```

## Module Map

### 1. core (include/pulse/core/, src/core/)
| File | Lines | Description |
|---|---|---|
| `types.hpp` | 120 | FieldValue variant (int64/double/string/bool/bytes), Result<T>, ErrorCode, PulseError |
| `event.hpp/cpp` | 130 | Event class with typed fields, unique IDs, clone, estimated_size |
| `schema.hpp/cpp` | 100 | Schema (field descriptors, validation, FNV fingerprint), SchemaRegistry |
| `config.hpp` | 23 | EngineConfig struct with defaults for all modules |
| `version.hpp` | 10 | Version constants (1.0.0) |
| `event_pool.hpp` | 44 | EventPool for allocation reuse |

### 2. buffer (include/pulse/buffer/, src/buffer/)
| File | Lines | Description |
|---|---|---|
| `ring_buffer.hpp/cpp` | 135 | Fixed-capacity circular buffer with DropOldest/DropNewest/Block overflow policies, drain, stats |
| `spsc_queue.hpp/cpp` | 90 | Lock-free SPSC queue using monotonic head/tail with cache-line-aligned atomics |

### 3. router (include/pulse/router/, src/router/)
| File | Lines | Description |
|---|---|---|
| `topic_router.hpp/cpp` | 200 | Trie-based topic routing, dot-separated segments, `*` single-level and `#` multi-level wildcards |
| `content_router.hpp/cpp` | 250 | Predicate-based routing: Eq/Ne/Lt/Le/Gt/Ge/Contains/StartsWith/EndsWith/Exists with All/Any/Not |

### 4. window (include/pulse/window/, src/window/)
| File | Lines | Description |
|---|---|---|
| `tumbling_window.hpp/cpp` | 80 | Fixed-size non-overlapping time windows, auto-close on timestamp advance |
| `sliding_window.hpp/cpp` | 100 | Overlapping windows with configurable slide interval and event eviction |
| `session_window.hpp/cpp` | 120 | Activity-based windows with gap timeout, optional key-field extraction for per-entity sessions |

### 5. aggregator (include/pulse/aggregator/, src/aggregator/)
| File | Lines | Description |
|---|---|---|
| `aggregator.hpp/cpp` | 90 | Online sum/min/max/mean/count with Welford variance, mergeable |
| `percentile.hpp/cpp` | 150 | T-Digest approximate quantile estimation with centroid compression |
| `hyperloglog.hpp/cpp` | 140 | HyperLogLog cardinality estimation with MurmurHash64, precision 4-18 |

### 6. pattern (include/pulse/pattern/, src/pattern/)
| File | Lines | Description |
|---|---|---|
| `nfa_engine.hpp/cpp` | 200 | NFA state machine for event pattern matching: Match/Epsilon/Negation transitions |
| `pattern_matcher.hpp/cpp` | 120 | PatternBuilder fluent API + PatternMatcher registry for named patterns |

### 7. state (include/pulse/state/, src/state/)
| File | Lines | Description |
|---|---|---|
| `lru_cache.hpp` | 115 | Template LRU cache with O(1) ops, eviction callback, stats |
| `state_store.hpp/cpp` | 110 | Key-value store with per-key TTL, LRU eviction, lazy expiry |

### 8. timer (include/pulse/timer/, src/timer/)
| File | Lines | Description |
|---|---|---|
| `timer_wheel.hpp/cpp` | 170 | Timer wheel with overflow list, one-shot/recurring timers, cancel by ID |

### 9. codec (include/pulse/codec/, src/codec/)
| File | Lines | Description |
|---|---|---|
| `encoder.hpp/cpp` | 120 | Binary encoder: varint (LEB128), zigzag, LE doubles, length-prefixed strings |
| `decoder.hpp/cpp` | 180 | Mirror decoder with Result<T> error handling at every step |

### 10. pipeline (include/pulse/pipeline/, src/pipeline/)
| File | Lines | Description |
|---|---|---|
| `operator.hpp` | 105 | Operator base class, FilterOperator, MapOperator, SinkOperator |
| `pipeline.hpp/cpp` | 130 | Pipeline with fluent API, PipelineBuilder for deferred construction |

## Module Dependencies

```
core ← buffer, router, window, aggregator, pattern, state, timer, codec, pipeline
buffer ← pipeline, integration tests
router ← pattern (Predicate), pipeline
window ← pipeline, session needs core only
aggregator ← pipeline, integration tests
pattern ← router (Predicate)
state ← integration tests
timer ← integration tests
codec ← integration tests
pipeline ← integration tests
```

**Cross-cutting:** Changing `Event` or `FieldValue` in core affects every module. Changing `Predicate` in router affects pattern. Changing `WindowCallback` in tumbling_window affects sliding/session.

## Task Writing Notes

- **Event fields** are in `include/pulse/core/event.hpp:16-52` — any new field type requires changes in types.hpp variant, event.hpp accessors, codec encoder+decoder, and test_event.cpp
- **Schema validation** at `src/core/schema.cpp:43-60` — checks required fields and type matching
- **Ring buffer overflow** at `src/buffer/ring_buffer.cpp:19-35` — three policy branches
- **Topic trie matching** at `src/router/topic_router.cpp:80-108` — recursive descent with wildcard expansion
- **Predicate evaluation** at `src/router/content_router.cpp:105-145` — recursive with composite short-circuit
- **T-Digest compress** at `src/aggregator/percentile.cpp:35-65` — centroid merging with weight threshold
- **NFA process** at `src/pattern/nfa_engine.cpp:60-100` — spawns instances, advances, fires callbacks
- **Timer wheel tick** at `src/timer/timer_wheel.cpp:70-100` — fires expired, promotes overflow
- **Varint encoding** at `src/codec/encoder.cpp:12-18` — LEB128, critical for codec correctness
- **Pipeline chaining** at `src/pipeline/pipeline.cpp:10-35` — set_downstream linking