#include "pulse/state/state_store.hpp"
#include <algorithm>

namespace pulse {

StateStore::StateStore(size_t max_entries, uint64_t default_ttl_ms)
    : cache_(max_entries), default_ttl_ms_(default_ttl_ms) {
    cache_.set_eviction_callback([this](const std::string&, const Entry&) {
        stats_.evictions++;
    });
}

void StateStore::put(const std::string& key, FieldValue value) {
    put(key, std::move(value), default_ttl_ms_);
}

void StateStore::put(const std::string& key, FieldValue value, uint64_t ttl_ms) {
    Entry entry;
    entry.value = std::move(value);
    entry.expire_at = (ttl_ms > 0) ? current_time_ + ttl_ms : 0;
    cache_.put(key, std::move(entry));
    stats_.total_puts++;
}

std::optional<FieldValue> StateStore::get(const std::string& key) {
    stats_.total_gets++;
    auto result = cache_.get(key);
    if (!result.has_value()) {
        stats_.misses++;
        return std::nullopt;
    }
    Entry& entry = result->get();
    if (entry.expire_at > 0 && current_time_ >= entry.expire_at) {
        if (expiry_cb_) expiry_cb_(key, entry.value);
        cache_.remove(key);
        stats_.expirations++;
        stats_.misses++;
        return std::nullopt;
    }
    stats_.hits++;
    return entry.value;
}

const FieldValue* StateStore::peek(const std::string& key) const {
    const auto* entry = cache_.peek(key);
    if (!entry) return nullptr;
    if (entry->expire_at > 0 && current_time_ >= entry->expire_at) return nullptr;
    return &entry->value;
}

bool StateStore::contains(const std::string& key) const {
    const auto* entry = cache_.peek(key);
    if (!entry) return false;
    if (entry->expire_at > 0 && current_time_ >= entry->expire_at) return false;
    return true;
}

bool StateStore::remove(const std::string& key) {
    return cache_.remove(key);
}

void StateStore::clear() {
    cache_.clear();
}

void StateStore::expire(Timestamp now) {
    current_time_ = now;
    auto expired_keys = cache_.collect_if([now](const std::string&, const Entry& entry) {
        return entry.expire_at > 0 && now >= entry.expire_at;
    });
    for (const auto& key : expired_keys) {
        const auto* entry = cache_.peek(key);
        if (entry) {
            if (expiry_cb_) expiry_cb_(key, entry->value);
        }
        cache_.remove(key);
        stats_.expirations++;
    }
}

size_t StateStore::size() const {
    return cache_.size();
}

bool StateStore::empty() const {
    return cache_.empty();
}

std::vector<std::string> StateStore::keys() const {
    return cache_.keys();
}

void StateStore::set_expiry_callback(
    std::function<void(const std::string&, const FieldValue&)> cb) {
    expiry_cb_ = std::move(cb);
}

} // namespace pulse