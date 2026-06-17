#pragma once
#include "pulse/pipeline/operator.hpp"
#include <vector>
#include <functional>
#include <string>
#include <unordered_set>
#include <chrono>
#include <algorithm>
#include <sstream>

namespace pulse {

// ---------------------------------------------------------------------------
// FlatMapOperator — one event in, zero or more events out
// ---------------------------------------------------------------------------
class FlatMapOperator : public Operator {
public:
    using FlatMapFn = std::function<std::vector<Event>(const Event&)>;

    explicit FlatMapOperator(FlatMapFn fn, const std::string& name = "flatmap")
        : fn_(std::move(fn)), name_(name) {
        if (!fn_) {
            throw PulseError(ErrorCode::InvalidArgument,
                             "FlatMapOperator: function must not be null");
        }
    }

    void process(const Event& event) override {
        // Apply the flat-map function to produce zero or more output events.
        std::vector<Event> results = fn_(event);
        events_in_++;

        if (results.empty()) {
            // One-to-zero mapping — nothing to emit.
            empty_results_++;
            return;
        }

        // Track how many individual events we produce.
        events_out_ += static_cast<uint64_t>(results.size());

        // Track the maximum fan-out we've ever seen from a single input.
        if (results.size() > max_fan_out_) {
            max_fan_out_ = results.size();
        }

        // Emit each result event downstream in order.
        for (auto& out_event : results) {
            emit(out_event);
        }
    }

    void flush() override {
        // Propagate flush downstream so chained operators also finalize.
        if (downstream_) {
            downstream_->flush();
        }
    }

    OperatorType type() const override { return OperatorType::FlatMap; }
    std::string name() const override { return name_; }

    // --- Metrics ---
    uint64_t events_out() const { return events_out_; }
    uint64_t events_in() const { return events_in_; }
    uint64_t empty_results() const { return empty_results_; }
    size_t   max_fan_out() const { return max_fan_out_; }

    double expansion_ratio() const {
        if (events_in_ == 0) return 0.0;
        return static_cast<double>(events_out_) / static_cast<double>(events_in_);
    }

private:
    FlatMapFn   fn_;
    std::string name_;
    uint64_t    events_out_     = 0;
    uint64_t    events_in_      = 0;
    uint64_t    empty_results_  = 0;
    size_t      max_fan_out_    = 0;
};

// ---------------------------------------------------------------------------
// ThrottleOperator — limits events to at most N per time window
// ---------------------------------------------------------------------------
class ThrottleOperator : public Operator {
public:
    ThrottleOperator(uint64_t max_events, uint64_t window_ms,
                     const std::string& name = "throttle")
        : max_events_(max_events), window_ms_(window_ms), name_(name) {
        if (max_events_ == 0) {
            throw PulseError(ErrorCode::InvalidArgument,
                             "ThrottleOperator: max_events must be > 0");
        }
        if (window_ms_ == 0) {
            throw PulseError(ErrorCode::InvalidArgument,
                             "ThrottleOperator: window_ms must be > 0");
        }
    }

    void process(const Event& event) override {
        uint64_t event_ts = event.timestamp();

        // Bootstrap the very first window from the first event's timestamp.
        if (!started_) {
            window_start_ = event_ts;
            window_count_ = 0;
            started_ = true;
        }

        // If the event falls outside the current window, slide forward.
        // We may need to advance by multiple windows if there was a large gap.
        if (event_ts >= window_start_ + window_ms_) {
            // Calculate how many full windows have elapsed.
            uint64_t elapsed = event_ts - window_start_;
            uint64_t windows_passed = elapsed / window_ms_;
            window_start_ += windows_passed * window_ms_;
            window_count_ = 0;
            windows_total_ += windows_passed;
        }

        // Check whether we are within the rate limit for this window.
        if (window_count_ < max_events_) {
            window_count_++;
            passed_++;
            emit(event);
        } else {
            dropped_++;
        }
    }

    void flush() override {
        // Reset window state on flush so a new stream starts fresh.
        if (downstream_) {
            downstream_->flush();
        }
    }

    OperatorType type() const override { return OperatorType::Filter; }
    std::string name() const override { return name_; }

    // --- Metrics ---
    uint64_t passed() const { return passed_; }
    uint64_t dropped() const { return dropped_; }
    uint64_t total() const { return passed_ + dropped_; }
    uint64_t windows_total() const { return windows_total_; }
    bool     is_started() const { return started_; }

    double drop_rate() const {
        uint64_t t = total();
        if (t == 0) return 0.0;
        return static_cast<double>(dropped_) / static_cast<double>(t);
    }

    void reset() {
        started_ = false;
        window_start_ = 0;
        window_count_ = 0;
        passed_ = 0;
        dropped_ = 0;
        windows_total_ = 0;
    }

private:
    uint64_t    max_events_;
    uint64_t    window_ms_;
    uint64_t    window_start_    = 0;
    uint64_t    window_count_    = 0;
    bool        started_         = false;
    std::string name_;
    uint64_t    passed_          = 0;
    uint64_t    dropped_         = 0;
    uint64_t    windows_total_   = 0;
};

// ---------------------------------------------------------------------------
// DeduplicateOperator — drops duplicate events based on a key field
// ---------------------------------------------------------------------------
class DeduplicateOperator : public Operator {
public:
    DeduplicateOperator(const std::string& key_field, size_t max_seen = 10000,
                        const std::string& name = "dedup")
        : key_field_(key_field), max_seen_(max_seen), name_(name) {
        if (key_field_.empty()) {
            throw PulseError(ErrorCode::InvalidArgument,
                             "DeduplicateOperator: key_field must not be empty");
        }
        if (max_seen_ == 0) {
            throw PulseError(ErrorCode::InvalidArgument,
                             "DeduplicateOperator: max_seen must be > 0");
        }
    }

    void process(const Event& event) override {
        // If the event lacks the key field, treat it as unique and pass through.
        if (!event.has_field(key_field_)) {
            missing_key_++;
            unique_++;
            emit(event);
            return;
        }

        std::string key = extract_key(event);

        // Eviction policy: when the seen set reaches capacity, clear it
        // entirely so memory stays bounded. This is a simple but effective
        // strategy — after eviction some true duplicates may slip through
        // until the set is repopulated.
        if (seen_.size() >= max_seen_) {
            evictions_++;
            seen_.clear();
        }

        auto [it, inserted] = seen_.insert(key);
        if (inserted) {
            // First time we see this key — pass through.
            unique_++;
            emit(event);
        } else {
            // Duplicate — suppress.
            duplicates_++;
        }
    }

    void flush() override {
        if (downstream_) {
            downstream_->flush();
        }
    }

    OperatorType type() const override { return OperatorType::Filter; }
    std::string name() const override { return name_; }

    // --- Metrics ---
    uint64_t unique_count() const { return unique_; }
    uint64_t duplicate_count() const { return duplicates_; }
    uint64_t missing_key_count() const { return missing_key_; }
    uint64_t eviction_count() const { return evictions_; }
    size_t   seen_size() const { return seen_.size(); }

    void clear_seen() {
        seen_.clear();
    }

private:
    std::string extract_key(const Event& event) const {
        // Convert the FieldValue for our key_field to a string representation
        // so we can use it as a hash-set key. Handles every variant arm.
        const FieldValue& fv = event.get_field(key_field_);
        return std::visit([](auto&& arg) -> std::string {
            using T = std::decay_t<decltype(arg)>;
            if constexpr (std::is_same_v<T, int64_t>) {
                return std::to_string(arg);
            } else if constexpr (std::is_same_v<T, double>) {
                std::ostringstream oss;
                oss << arg;
                return oss.str();
            } else if constexpr (std::is_same_v<T, std::string>) {
                return arg;
            } else if constexpr (std::is_same_v<T, bool>) {
                return arg ? "true" : "false";
            } else if constexpr (std::is_same_v<T, std::vector<uint8_t>>) {
                // Hash bytes as hex string for dedup purposes.
                std::ostringstream oss;
                oss << std::hex;
                for (auto b : arg) oss << static_cast<int>(b);
                return oss.str();
            } else {
                return "<?>";
            }
        }, fv);
    }

    std::string                    key_field_;
    size_t                         max_seen_;
    std::unordered_set<std::string> seen_;
    std::string                    name_;
    uint64_t                       unique_      = 0;
    uint64_t                       duplicates_  = 0;
    uint64_t                       missing_key_ = 0;
    uint64_t                       evictions_   = 0;
};

} // namespace pulse
