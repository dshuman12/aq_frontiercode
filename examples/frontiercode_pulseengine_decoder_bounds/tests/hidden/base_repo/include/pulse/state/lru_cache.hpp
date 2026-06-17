#pragma once
#include <string>
#include <unordered_map>
#include <list>
#include <optional>
#include <functional>
#include <cstddef>
#include <cstdint>

namespace pulse {

template<typename K, typename V>
class LRUCache {
public:
    using EvictionCallback = std::function<void(const K&, const V&)>;

    explicit LRUCache(size_t capacity) : capacity_(capacity) {
        if (capacity == 0) throw std::invalid_argument("LRU capacity must be > 0");
    }

    void put(const K& key, V value) {
        auto it = map_.find(key);
        if (it != map_.end()) {
            it->second->second = std::move(value);
            order_.splice(order_.begin(), order_, it->second);
            hits_++;
            total_puts_++;
            return;
        }

        if (map_.size() >= capacity_) {
            auto& back = order_.back();
            if (eviction_cb_) eviction_cb_(back.first, back.second);
            map_.erase(back.first);
            order_.pop_back();
            evictions_++;
        }

        order_.push_front({key, std::move(value)});
        map_[key] = order_.begin();
        total_puts_++;
    }

    std::optional<std::reference_wrapper<V>> get(const K& key) {
        auto it = map_.find(key);
        if (it == map_.end()) {
            misses_++;
            return std::nullopt;
        }
        order_.splice(order_.begin(), order_, it->second);
        hits_++;
        return it->second->second;
    }

    const V* peek(const K& key) const {
        auto it = map_.find(key);
        if (it == map_.end()) return nullptr;
        return &(it->second->second);
    }

    bool contains(const K& key) const {
        return map_.count(key) > 0;
    }

    bool remove(const K& key) {
        auto it = map_.find(key);
        if (it == map_.end()) return false;
        order_.erase(it->second);
        map_.erase(it);
        return true;
    }

    void clear() {
        order_.clear();
        map_.clear();
    }

    size_t size() const { return map_.size(); }
    size_t capacity() const { return capacity_; }
    bool empty() const { return map_.empty(); }
    bool full() const { return map_.size() >= capacity_; }

    std::vector<K> keys() const {
        std::vector<K> result;
        result.reserve(order_.size());
        for (const auto& p : order_) result.push_back(p.first);
        return result;
    }

    void set_eviction_callback(EvictionCallback cb) { eviction_cb_ = std::move(cb); }

    template<typename Pred>
    std::vector<K> collect_if(Pred pred) const {
        std::vector<K> result;
        for (const auto& p : order_) {
            if (pred(p.first, p.second)) {
                result.push_back(p.first);
            }
        }
        return result;
    }

    struct Stats {
        uint64_t hits = 0;
        uint64_t misses = 0;
        uint64_t evictions = 0;
        uint64_t total_puts = 0;
    };
    Stats stats() const { return {hits_, misses_, evictions_, total_puts_}; }

private:
    using ListType = std::list<std::pair<K, V>>;
    size_t capacity_;
    ListType order_;
    std::unordered_map<K, typename ListType::iterator> map_;
    EvictionCallback eviction_cb_;
    uint64_t hits_ = 0;
    uint64_t misses_ = 0;
    uint64_t evictions_ = 0;
    uint64_t total_puts_ = 0;
};

} // namespace pulse