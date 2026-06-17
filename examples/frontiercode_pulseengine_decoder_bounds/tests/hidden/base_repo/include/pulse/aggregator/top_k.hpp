#pragma once
#include <vector>
#include <queue>
#include <string>
#include <unordered_map>
#include <algorithm>
#include <cstdint>
#include <stdexcept>

namespace pulse {

class TopK {
public:
    struct Entry {
        std::string key;
        int64_t score;
        bool operator<(const Entry& o) const { return score < o.score; }
        bool operator>(const Entry& o) const { return score > o.score; }
    };

    explicit TopK(size_t k) : k_(k) {
        if (k_ == 0) {
            throw std::invalid_argument("TopK: k must be greater than 0");
        }
    }

    // Add or replace score for key. Replaces only if new score is higher.
    // When full and new score <= current minimum, the item is ignored.
    void add(const std::string& key, int64_t score = 1) {
        total_added_++;

        auto it = scores_.find(key);
        if (it != scores_.end()) {
            // Key already tracked — replace only if new score is higher
            if (score > it->second) {
                it->second = score;
            }
            return;
        }

        // New key — check capacity
        if (scores_.size() >= k_) {
            int64_t current_min = min_score();
            if (score <= current_min) {
                return; // Not high enough to enter the top-k
            }
        }

        scores_[key] = score;
        evict_if_needed();
    }

    // Increment score for key by delta. If key does not exist, inserts
    // with score = delta. Subject to the same eviction rules as add().
    void increment(const std::string& key, int64_t delta = 1) {
        total_added_++;

        auto it = scores_.find(key);
        if (it != scores_.end()) {
            it->second += delta;
            return;
        }

        // New key — check capacity
        if (scores_.size() >= k_) {
            int64_t current_min = min_score();
            if (delta <= current_min) {
                return; // Not high enough to enter the top-k
            }
        }

        scores_[key] = delta;
        evict_if_needed();
    }

    // Returns current entries sorted by score descending.
    std::vector<Entry> top() const {
        std::vector<Entry> result;
        result.reserve(scores_.size());
        for (const auto& pair : scores_) {
            result.push_back({pair.first, pair.second});
        }
        std::sort(result.begin(), result.end(),
                  [](const Entry& a, const Entry& b) {
                      if (a.score != b.score) return a.score > b.score;
                      return a.key < b.key; // Stable tie-break by key
                  });
        return result;
    }

    // Returns true if key is currently in the top-k set.
    bool contains(const std::string& key) const {
        return scores_.find(key) != scores_.end();
    }

    // Returns the score of a tracked key. Throws std::out_of_range if
    // the key is not present.
    int64_t score_of(const std::string& key) const {
        auto it = scores_.find(key);
        if (it == scores_.end()) {
            throw std::out_of_range("TopK: key not found: " + key);
        }
        return it->second;
    }

    // Returns the minimum score among tracked entries, or 0 if empty.
    int64_t min_score() const {
        if (scores_.empty()) {
            return 0;
        }
        int64_t m = scores_.begin()->second;
        for (const auto& pair : scores_) {
            if (pair.second < m) {
                m = pair.second;
            }
        }
        return m;
    }

    // Capacity (the K value).
    size_t k() const { return k_; }

    // Number of entries currently tracked.
    size_t size() const { return scores_.size(); }

    // True when the tracker holds exactly k entries.
    bool full() const { return scores_.size() >= k_; }

    // True when no entries are tracked.
    bool empty() const { return scores_.empty(); }

    // Total number of add/increment calls made (diagnostic counter).
    uint64_t total_added() const { return total_added_; }

    // Clear all tracked entries and reset counters.
    void reset() {
        scores_.clear();
        total_added_ = 0;
    }

private:
    size_t k_;
    std::unordered_map<std::string, int64_t> scores_;
    uint64_t total_added_ = 0;

    // Evict the lowest-scored entry until size <= k.
    void evict_if_needed() {
        while (scores_.size() > k_) {
            // Linear scan for the minimum — fine for small k
            auto min_it = scores_.begin();
            for (auto it = scores_.begin(); it != scores_.end(); ++it) {
                if (it->second < min_it->second) {
                    min_it = it;
                } else if (it->second == min_it->second &&
                           it->first > min_it->first) {
                    // Tie-break: evict lexicographically-later key
                    min_it = it;
                }
            }
            scores_.erase(min_it);
        }
    }
};

} // namespace pulse
