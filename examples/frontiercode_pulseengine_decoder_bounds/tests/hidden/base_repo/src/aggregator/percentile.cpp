#include "pulse/aggregator/percentile.hpp"
#include <numeric>

namespace pulse {

TDigest::TDigest(double compression) : compression_(compression) {}

double TDigest::max_size_for_weight(double q) const {
    return (4.0 * compression_ * q * (1.0 - q)) + 0.5;
}

void TDigest::add(double value, uint64_t weight) {
    buffer_.push_back({value, weight});
    total_weight_ += weight;
    if (buffer_.size() >= BUFFER_SIZE) {
        compress();
    }
}

void TDigest::merge(const TDigest& other) {
    for (const auto& c : other.centroids_) {
        buffer_.push_back(c);
    }
    for (const auto& c : other.buffer_) {
        buffer_.push_back(c);
    }
    total_weight_ += other.total_weight_;
    compress();
}

void TDigest::compress() const {
    if (buffer_.empty() && centroids_.empty()) return;

    std::sort(buffer_.begin(), buffer_.end());

    std::vector<Centroid> all;
    all.reserve(centroids_.size() + buffer_.size());
    std::merge(centroids_.begin(), centroids_.end(),
               buffer_.begin(), buffer_.end(),
               std::back_inserter(all));
    buffer_.clear();

    centroids_.clear();
    if (all.empty()) return;

    centroids_.push_back(all[0]);
    uint64_t weight_so_far = all[0].weight;

    for (size_t i = 1; i < all.size(); i++) {
        double q = (weight_so_far + all[i].weight / 2.0) / total_weight_;
        double max_w = max_size_for_weight(q);

        if (centroids_.back().weight + all[i].weight <= max_w) {
            auto& last = centroids_.back();
            double combined = last.weight + all[i].weight;
            last.mean = (last.mean * last.weight + all[i].mean * all[i].weight) / combined;
            last.weight = static_cast<uint64_t>(combined);
        } else {
            centroids_.push_back(all[i]);
        }
        weight_so_far += all[i].weight;
    }
}

double TDigest::quantile(double q) const {
    if (centroids_.empty() && buffer_.empty()) return 0.0;

    if (!buffer_.empty()) {
        compress();
    }

    if (centroids_.size() == 1) return centroids_[0].mean;

    if (q <= 0.0) return centroids_.front().mean;
    if (q >= 1.0) return centroids_.back().mean;

    double target = q * total_weight_;
    double cumulative = 0.0;

    for (size_t i = 0; i < centroids_.size(); i++) {
        double half_w = centroids_[i].weight / 2.0;
        if (cumulative + half_w >= target) {
            if (i == 0) return centroids_[0].mean;
            double prev_mid = cumulative - centroids_[i-1].weight / 2.0;
            double curr_mid = cumulative + half_w;
            double frac = (target - prev_mid) / (curr_mid - prev_mid);
            return centroids_[i-1].mean + frac * (centroids_[i].mean - centroids_[i-1].mean);
        }
        cumulative += centroids_[i].weight;
    }

    return centroids_.back().mean;
}

void TDigest::reset() {
    centroids_.clear();
    buffer_.clear();
    total_weight_ = 0;
}

} // namespace pulse