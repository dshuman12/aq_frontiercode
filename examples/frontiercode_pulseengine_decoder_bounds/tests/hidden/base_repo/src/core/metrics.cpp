#include "pulse/core/metrics.hpp"

namespace pulse {

// ── Counters ────────────────────────────────────────────────────────────────

void MetricsCollector::increment(const std::string& name, int64_t delta) {
    counters_[name] += delta;
}

int64_t MetricsCollector::counter(const std::string& name) const {
    auto it = counters_.find(name);
    if (it == counters_.end()) return 0;
    return it->second;
}

std::vector<std::string> MetricsCollector::counter_names() const {
    std::vector<std::string> names;
    names.reserve(counters_.size());
    for (const auto& kv : counters_) {
        names.push_back(kv.first);
    }
    return names;
}

// ── Gauges ──────────────────────────────────────────────────────────────────

void MetricsCollector::gauge(const std::string& name, double value) {
    gauges_[name] = value;
}

double MetricsCollector::gauge_value(const std::string& name) const {
    auto it = gauges_.find(name);
    if (it == gauges_.end()) return 0.0;
    return it->second;
}

std::vector<std::string> MetricsCollector::gauge_names() const {
    std::vector<std::string> names;
    names.reserve(gauges_.size());
    for (const auto& kv : gauges_) {
        names.push_back(kv.first);
    }
    return names;
}

// ── Timings ─────────────────────────────────────────────────────────────────

void MetricsCollector::record_timing(const std::string& name,
                                     uint64_t duration_ms) {
    auto& acc = timings_[name];
    acc.count++;
    acc.sum_ms += static_cast<double>(duration_ms);
    if (duration_ms < acc.min_ms) acc.min_ms = duration_ms;
    if (duration_ms > acc.max_ms) acc.max_ms = duration_ms;
}

TimingStats MetricsCollector::timing(const std::string& name) const {
    auto it = timings_.find(name);
    if (it == timings_.end()) return {};
    const auto& acc = it->second;
    TimingStats stats;
    stats.count  = acc.count;
    stats.min_ms = acc.min_ms;
    stats.max_ms = acc.max_ms;
    stats.avg_ms = (acc.count > 0)
                       ? acc.sum_ms / static_cast<double>(acc.count)
                       : 0.0;
    return stats;
}

std::vector<std::string> MetricsCollector::timing_names() const {
    std::vector<std::string> names;
    names.reserve(timings_.size());
    for (const auto& kv : timings_) {
        names.push_back(kv.first);
    }
    return names;
}

// ── Aggregate ───────────────────────────────────────────────────────────────

void MetricsCollector::reset() {
    counters_.clear();
    gauges_.clear();
    timings_.clear();
}

size_t MetricsCollector::total_metrics() const {
    return counters_.size() + gauges_.size() + timings_.size();
}

} // namespace pulse
