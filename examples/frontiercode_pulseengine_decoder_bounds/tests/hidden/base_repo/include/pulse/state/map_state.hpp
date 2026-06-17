#pragma once
#include <unordered_map>
#include <optional>
#include <functional>
#include <vector>
#include <stdexcept>
#include <string>

namespace pulse {

/// Typed key-value state abstraction.
/// Provides a simple dictionary interface with convenience helpers
/// (get_or_default, get_or_create, update, for_each, etc.).
template<typename K, typename V>
class MapState {
public:
    MapState() = default;

    /// Insert or overwrite a key-value pair.
    void put(const K& key, V value) {
        map_[key] = std::move(value);
    }

    /// Retrieve the value for a key, or std::nullopt if absent.
    std::optional<V> get(const K& key) const {
        auto it = map_.find(key);
        if (it == map_.end()) return std::nullopt;
        return it->second;
    }

    /// Check whether a key exists.
    bool contains(const K& key) const {
        return map_.count(key) > 0;
    }

    /// Remove a key. Returns true if the key existed.
    bool remove(const K& key) {
        return map_.erase(key) > 0;
    }

    /// Remove all entries.
    void clear() {
        map_.clear();
    }

    /// Number of entries.
    size_t size() const {
        return map_.size();
    }

    /// True if the map contains no entries.
    bool empty() const {
        return map_.empty();
    }

    /// Return a vector of all keys (unordered).
    std::vector<K> keys() const {
        std::vector<K> result;
        result.reserve(map_.size());
        for (const auto& kv : map_) {
            result.push_back(kv.first);
        }
        return result;
    }

    /// Iterate over all entries, invoking fn(key, value) for each.
    void for_each(std::function<void(const K&, const V&)> fn) const {
        for (const auto& kv : map_) {
            fn(kv.first, kv.second);
        }
    }

    /// Return the value for a key, or a default if absent.
    V get_or_default(const K& key, V default_val) const {
        auto it = map_.find(key);
        if (it == map_.end()) return default_val;
        return it->second;
    }

    /// Return a mutable reference to the value for a key.
    /// If the key does not exist it is created using factory().
    V& get_or_create(const K& key, std::function<V()> factory) {
        auto it = map_.find(key);
        if (it == map_.end()) {
            auto [inserted, _] = map_.emplace(key, factory());
            return inserted->second;
        }
        return it->second;
    }

    /// Apply fn to the current value of key, storing the result.
    /// Throws std::out_of_range if the key does not exist.
    void update(const K& key, std::function<V(const V&)> fn) {
        auto it = map_.find(key);
        if (it == map_.end()) {
            throw std::out_of_range("MapState::update — key not found");
        }
        it->second = fn(it->second);
    }

private:
    std::unordered_map<K, V> map_;
};

} // namespace pulse
