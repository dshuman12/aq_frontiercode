#include "pulse/aggregator/histogram.hpp"

namespace pulse {

Histogram::Histogram(double min_value, double max_value, size_t bucket_count)
    : min_(min_value)
    , max_(max_value)
    , num_buckets_(bucket_count)
    , buckets_(bucket_count, 0)
    , overflow_(0)
    , underflow_(0)
    , total_count_(0)
{
    if (bucket_count == 0) {
        throw std::invalid_argument("Histogram bucket_count must be > 0");
    }
    if (min_value > max_value) {
        throw std::invalid_argument("Histogram min_value must be <= max_value");
    }
    if (min_value == max_value) {
        // Degenerate case: zero-width range.
        // bucket_width_ is 0; record() handles this specially.
        bucket_width_ = 0.0;
    } else {
        bucket_width_ = (max_value - min_value) / static_cast<double>(bucket_count);
    }
}

void Histogram::record(double value) {
    total_count_++;

    // Handle the degenerate case where min == max.
    // Values exactly equal to the point go to bucket 0;
    // anything else is underflow or overflow.
    if (min_ == max_) {
        if (value < min_) {
            underflow_++;
        } else if (value > max_) {
            overflow_++;
        } else {
            buckets_[0]++;
        }
        return;
    }

    if (value < min_) {
        underflow_++;
    } else if (value >= max_) {
        overflow_++;
    } else {
        size_t idx = static_cast<size_t>((value - min_) / bucket_width_);
        // Guard against floating-point edge landing exactly at max.
        if (idx >= num_buckets_) {
            idx = num_buckets_ - 1;
        }
        buckets_[idx]++;
    }
}

uint64_t Histogram::count() const {
    return total_count_;
}

uint64_t Histogram::bucket_count(size_t idx) const {
    if (idx >= num_buckets_) {
        throw std::out_of_range("Histogram bucket index out of range");
    }
    return buckets_[idx];
}

size_t Histogram::bucket_for(double value) const {
    if (min_ == max_) {
        return 0;
    }
    if (value < min_) {
        return 0;
    }
    if (value >= max_) {
        return num_buckets_ - 1;
    }
    size_t idx = static_cast<size_t>((value - min_) / bucket_width_);
    if (idx >= num_buckets_) {
        idx = num_buckets_ - 1;
    }
    return idx;
}

double Histogram::bucket_lower(size_t idx) const {
    if (idx >= num_buckets_) {
        throw std::out_of_range("Histogram bucket index out of range");
    }
    return min_ + static_cast<double>(idx) * bucket_width_;
}

double Histogram::bucket_upper(size_t idx) const {
    if (idx >= num_buckets_) {
        throw std::out_of_range("Histogram bucket index out of range");
    }
    // The last bucket's upper bound is exactly max to avoid
    // floating-point drift from repeated addition.
    if (idx == num_buckets_ - 1) {
        return max_;
    }
    return min_ + static_cast<double>(idx + 1) * bucket_width_;
}

size_t Histogram::num_buckets() const {
    return num_buckets_;
}

double Histogram::min_value() const {
    return min_;
}

double Histogram::max_value() const {
    return max_;
}

uint64_t Histogram::overflow_count() const {
    return overflow_;
}

uint64_t Histogram::underflow_count() const {
    return underflow_;
}

double Histogram::percentile(double p) const {
    if (total_count_ == 0) {
        return 0.0;
    }
    if (p <= 0.0) {
        return min_;
    }
    if (p >= 1.0) {
        return max_;
    }

    // The target rank in the cumulative distribution.
    double target = p * static_cast<double>(total_count_);

    // Walk the cumulative distribution: underflow first, then buckets.
    double cumulative = static_cast<double>(underflow_);
    if (cumulative >= target) {
        // Percentile falls within underflow region; best estimate is min.
        return min_;
    }

    for (size_t i = 0; i < num_buckets_; i++) {
        double prev = cumulative;
        cumulative += static_cast<double>(buckets_[i]);
        if (cumulative >= target) {
            // Linearly interpolate within this bucket.
            double fraction = 0.0;
            if (buckets_[i] > 0) {
                fraction = (target - prev) / static_cast<double>(buckets_[i]);
            }
            double lower = bucket_lower(i);
            double width = (min_ == max_) ? 0.0 : bucket_width_;
            return lower + fraction * width;
        }
    }

    // Remaining count is in overflow; best estimate is max.
    return max_;
}

void Histogram::merge(const Histogram& other) {
    if (num_buckets_ != other.num_buckets_ ||
        min_ != other.min_ || max_ != other.max_) {
        throw std::invalid_argument(
            "Cannot merge histograms with different configurations");
    }
    for (size_t i = 0; i < num_buckets_; i++) {
        buckets_[i] += other.buckets_[i];
    }
    overflow_ += other.overflow_;
    underflow_ += other.underflow_;
    total_count_ += other.total_count_;
}

void Histogram::reset() {
    std::fill(buckets_.begin(), buckets_.end(), 0);
    overflow_ = 0;
    underflow_ = 0;
    total_count_ = 0;
}

bool Histogram::empty() const {
    return total_count_ == 0;
}

double Histogram::mean() const {
    if (total_count_ == 0) {
        return 0.0;
    }

    double sum = 0.0;

    // Each bucket contributes its midpoint weighted by its count.
    for (size_t i = 0; i < num_buckets_; i++) {
        if (buckets_[i] > 0) {
            double midpoint = bucket_lower(i) + bucket_width_ / 2.0;
            sum += midpoint * static_cast<double>(buckets_[i]);
        }
    }

    // Underflow values are estimated at min; overflow at max.
    sum += min_ * static_cast<double>(underflow_);
    sum += max_ * static_cast<double>(overflow_);

    return sum / static_cast<double>(total_count_);
}

} // namespace pulse
