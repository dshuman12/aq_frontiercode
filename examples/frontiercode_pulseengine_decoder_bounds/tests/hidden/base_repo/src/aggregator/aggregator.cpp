#include "pulse/aggregator/aggregator.hpp"

namespace pulse {

void Aggregator::add(double value) {
    count_++;
    sum_ += value;
    if (value < min_) min_ = value;
    if (value > max_) max_ = value;

    // Welford's online algorithm for variance
    double delta = value - mean_;
    mean_ += delta / count_;
    double delta2 = value - mean_;
    m2_ += delta * delta2;
}

void Aggregator::merge(const Aggregator& other) {
    if (other.count_ == 0) return;
    if (count_ == 0) {
        *this = other;
        return;
    }

    uint64_t combined_count = count_ + other.count_;
    double delta = other.mean_ - mean_;
    double combined_mean = (sum_ + other.sum_) / combined_count;
    double combined_m2 = m2_ + other.m2_ +
        delta * delta * (static_cast<double>(count_) * other.count_) / combined_count;

    sum_ += other.sum_;
    if (other.min_ < min_) min_ = other.min_;
    if (other.max_ > max_) max_ = other.max_;
    count_ = combined_count;
    mean_ = combined_mean;
    m2_ = combined_m2;
}

void Aggregator::reset() {
    sum_ = 0.0;
    min_ = std::numeric_limits<double>::max();
    max_ = std::numeric_limits<double>::lowest();
    count_ = 0;
    m2_ = 0.0;
    mean_ = 0.0;
}

double Aggregator::variance() const {
    if (count_ < 2) return 0.0;
    return m2_ / (count_ - 1);
}

double Aggregator::stddev() const {
    return std::sqrt(variance());
}

} // namespace pulse