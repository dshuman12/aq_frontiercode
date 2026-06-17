#pragma once
#include <string>
#include <cstdint>
#include <unordered_map>
#include <vector>
#include <algorithm>
#include <limits>

namespace pulse {

/// Statistics for a recorded timing metric.
struct TimingStats {
    uint64_t count   = 0;
    uint64_t min_ms  = 0;
    uint64_t max_ms  = 0;
    double   avg_ms  = 0.0;
};

/// Internal metrics collector for counters, gauges, and timing histograms.
class MetricsCollector {
public:
    MetricsCollector() = default;

    // ── Counters ────────────────────────────────────────────────────────
    void increment(const std::string& name, int64_t delta = 1);
    int64_t counter(const std::string& name) const;
    std::vector<std::string> counter_names() const;

    // ── Gauges ──────────────────────────────────────────────────────────
    void gauge(const std::string& name, double value);
    double gauge_value(const std::string& name) const;
    std::vector<std::string> gauge_names() const;

    // ── Timings ─────────────────────────────────────────────────────────
    void record_timing(const std::string& name, uint64_t duration_ms);
    TimingStats timing(const std::string& name) const;
    std::vector<std::string> timing_names() const;

    // ── Aggregate ───────────────────────────────────────────────────────
    void reset();
    size_t total_metrics() const;

private:
    struct TimingAccumulator {
        uint64_t count  = 0;
        uint64_t min_ms = std::numeric_limits<uint64_t>::max();
        uint64_t max_ms = 0;
        double   sum_ms = 0.0;
    };

    std::unordered_map<std::string, int64_t>           counters_;
    std::unordered_map<std::string, double>            gauges_;
    std::unordered_map<std::string, TimingAccumulator> timings_;
};

} // namespace pulse
