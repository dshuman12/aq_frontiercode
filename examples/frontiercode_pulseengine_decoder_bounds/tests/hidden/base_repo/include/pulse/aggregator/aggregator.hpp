#pragma once
#include "pulse/core/types.hpp"
#include <string>
#include <cstdint>
#include <limits>
#include <cmath>

namespace pulse {

class Aggregator {
public:
    void add(double value);
    void merge(const Aggregator& other);
    void reset();

    double sum() const { return sum_; }
    double min() const { return min_; }
    double max() const { return max_; }
    double mean() const { return count_ > 0 ? sum_ / count_ : 0.0; }
    uint64_t count() const { return count_; }
    double variance() const;
    double stddev() const;

    bool empty() const { return count_ == 0; }

private:
    double sum_ = 0.0;
    double min_ = std::numeric_limits<double>::max();
    double max_ = std::numeric_limits<double>::lowest();
    uint64_t count_ = 0;
    double m2_ = 0.0;      // for Welford's online variance
    double mean_ = 0.0;    // running mean for Welford
};

} // namespace pulse