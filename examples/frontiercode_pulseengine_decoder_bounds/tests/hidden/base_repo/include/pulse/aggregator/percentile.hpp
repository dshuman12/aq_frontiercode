#pragma once
#include <vector>
#include <algorithm>
#include <cmath>
#include <cstdint>

namespace pulse {

class TDigest {
public:
    explicit TDigest(double compression = 100.0);

    void add(double value, uint64_t weight = 1);
    void merge(const TDigest& other);

    double quantile(double q) const;
    double median() const { return quantile(0.5); }
    double p50() const { return quantile(0.50); }
    double p90() const { return quantile(0.90); }
    double p95() const { return quantile(0.95); }
    double p99() const { return quantile(0.99); }

    uint64_t total_weight() const { return total_weight_; }
    size_t centroid_count() const { return centroids_.size(); }
    bool empty() const { return total_weight_ == 0; }

    void reset();

private:
    struct Centroid {
        double mean;
        uint64_t weight;
        bool operator<(const Centroid& o) const { return mean < o.mean; }
    };

    double max_size_for_weight(double q) const;
    void compress() const;

    double compression_;
    mutable std::vector<Centroid> centroids_;
    uint64_t total_weight_ = 0;
    bool needs_compress_ = false;
    mutable std::vector<Centroid> buffer_;
    static constexpr size_t BUFFER_SIZE = 500;
};

} // namespace pulse