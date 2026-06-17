#pragma once
#include "pulse/core/types.hpp"
#include "pulse/state/lru_cache.hpp"
#include <string>
#include <unordered_map>
#include <cstdint>
#include <functional>
#include <optional>
#include <vector>

namespace pulse {

class StateStore {
public:
    explicit StateStore(size_t max_entries = 10000, uint64_t default_ttl_ms = 0);

    void put(const std::string& key, FieldValue value);
    void put(const std::string& key, FieldValue value, uint64_t ttl_ms);
    std::optional<FieldValue> get(const std::string& key);
    const FieldValue* peek(const std::string& key) const;
    bool contains(const std::string& key) const;
    bool remove(const std::string& key);
    void clear();

    void expire(Timestamp now);

    size_t size() const;
    bool empty() const;

    std::vector<std::string> keys() const;

    void set_expiry_callback(std::function<void(const std::string&, const FieldValue&)> cb);

    struct Stats {
        uint64_t total_puts = 0;
        uint64_t total_gets = 0;
        uint64_t hits = 0;
        uint64_t misses = 0;
        uint64_t expirations = 0;
        uint64_t evictions = 0;
    };
    Stats stats() const { return stats_; }

private:
    struct Entry {
        FieldValue value;
        uint64_t expire_at = 0;  // 0 = no TTL
    };

    LRUCache<std::string, Entry> cache_;
    uint64_t default_ttl_ms_;
    mutable Stats stats_;
    std::function<void(const std::string&, const FieldValue&)> expiry_cb_;
    Timestamp current_time_ = 0;
};

} // namespace pulse