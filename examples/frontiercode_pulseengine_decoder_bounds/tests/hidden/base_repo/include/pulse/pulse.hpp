#pragma once

// Core
#include "pulse/core/types.hpp"
#include "pulse/core/event.hpp"
#include "pulse/core/event_pool.hpp"
#include "pulse/core/event_batch.hpp"
#include "pulse/core/schema.hpp"
#include "pulse/core/config.hpp"
#include "pulse/core/version.hpp"
#include "pulse/core/metrics.hpp"

// Buffer
#include "pulse/buffer/ring_buffer.hpp"
#include "pulse/buffer/spsc_queue.hpp"

// Router
#include "pulse/router/topic_router.hpp"
#include "pulse/router/content_router.hpp"

// Window
#include "pulse/window/tumbling_window.hpp"
#include "pulse/window/sliding_window.hpp"
#include "pulse/window/session_window.hpp"
#include "pulse/window/count_window.hpp"
#include "pulse/window/global_window.hpp"
#include "pulse/window/sliding_count_window.hpp"
#include "pulse/window/watermark.hpp"

// Aggregator
#include "pulse/aggregator/aggregator.hpp"
#include "pulse/aggregator/percentile.hpp"
#include "pulse/aggregator/hyperloglog.hpp"
#include "pulse/aggregator/count_min_sketch.hpp"
#include "pulse/aggregator/histogram.hpp"
#include "pulse/aggregator/top_k.hpp"
#include "pulse/aggregator/ema.hpp"

// Pattern
#include "pulse/pattern/nfa_engine.hpp"
#include "pulse/pattern/pattern_matcher.hpp"

// Filter
#include "pulse/filter/bloom_filter.hpp"
#include "pulse/filter/sampling_filter.hpp"

// State
#include "pulse/state/lru_cache.hpp"
#include "pulse/state/state_store.hpp"
#include "pulse/state/map_state.hpp"

// Timer
#include "pulse/timer/timer_wheel.hpp"

// Codec
#include "pulse/codec/encoder.hpp"
#include "pulse/codec/decoder.hpp"
#include "pulse/codec/json.hpp"
#include "pulse/codec/csv.hpp"
#include "pulse/codec/crc32.hpp"

// Pipeline
#include "pulse/pipeline/operator.hpp"
#include "pulse/pipeline/pipeline.hpp"
#include "pulse/pipeline/advanced_operators.hpp"
#include "pulse/pipeline/batch_operator.hpp"

// Flow Control
#include "pulse/flow/rate_limiter.hpp"
#include "pulse/flow/circuit_breaker.hpp"
#include "pulse/flow/backpressure.hpp"
#include "pulse/flow/retry_policy.hpp"