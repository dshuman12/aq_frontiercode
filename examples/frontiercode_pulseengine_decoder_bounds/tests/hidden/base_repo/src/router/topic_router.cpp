#include "pulse/router/topic_router.hpp"

namespace pulse {

TopicTrie::TopicTrie() : root_(std::make_unique<TrieNode>()) {}

std::vector<std::string> TopicTrie::split_topic(const std::string& topic) {
    std::vector<std::string> parts;
    size_t start = 0;
    size_t dot = topic.find('.');
    while (dot != std::string::npos) {
        parts.push_back(topic.substr(start, dot - start));
        start = dot + 1;
        dot = topic.find('.', start);
    }
    parts.push_back(topic.substr(start));
    return parts;
}

HandlerId TopicTrie::subscribe(const std::string& pattern, EventHandler handler) {
    auto segments = split_topic(pattern);
    TrieNode* node = root_.get();

    for (size_t i = 0; i < segments.size(); i++) {
        const auto& seg = segments[i];
        if (seg == "#") {
            HandlerId id = next_id_++;
            node->wildcard_handlers.push_back({id, std::move(handler)});
            handler_index_[id] = {node, true};
            total_subs_++;
            return id;
        }
        auto it = node->children.find(seg);
        if (it == node->children.end()) {
            node->children[seg] = std::make_unique<TrieNode>();
        }
        node = node->children[seg].get();
    }

    HandlerId id = next_id_++;
    node->handlers.push_back({id, std::move(handler)});
    handler_index_[id] = {node, false};
    total_subs_++;
    return id;
}

bool TopicTrie::unsubscribe(HandlerId id) {
    auto loc_it = handler_index_.find(id);
    if (loc_it == handler_index_.end()) return false;

    auto& loc = loc_it->second;
    auto& vec = loc.is_wildcard ? loc.node->wildcard_handlers : loc.node->handlers;
    for (auto it = vec.begin(); it != vec.end(); ++it) {
        if (it->id == id) {
            vec.erase(it);
            handler_index_.erase(loc_it);
            total_subs_--;
            return true;
        }
    }
    handler_index_.erase(loc_it);
    return false;
}

bool TopicTrie::remove_recursive(TrieNode* node, HandlerId id) {
    for (auto it = node->handlers.begin(); it != node->handlers.end(); ++it) {
        if (it->id == id) {
            node->handlers.erase(it);
            return true;
        }
    }
    for (auto it = node->wildcard_handlers.begin(); it != node->wildcard_handlers.end(); ++it) {
        if (it->id == id) {
            node->wildcard_handlers.erase(it);
            return true;
        }
    }
    for (auto& kv : node->children) {
        if (remove_recursive(kv.second.get(), id)) return true;
    }
    return false;
}

std::vector<HandlerId> TopicTrie::match(const std::string& topic) const {
    auto segments = split_topic(topic);
    std::vector<HandlerId> result;
    match_recursive(root_.get(), segments, 0, result);
    return result;
}

void TopicTrie::match_recursive(const TrieNode* node,
                                 const std::vector<std::string>& segments,
                                 size_t depth,
                                 std::vector<HandlerId>& out) const {
    for (const auto& wh : node->wildcard_handlers) {
        out.push_back(wh.id);
    }

    if (depth == segments.size()) {
        for (const auto& h : node->handlers) {
            out.push_back(h.id);
        }
        return;
    }

    const auto& seg = segments[depth];

    // Exact match
    auto it = node->children.find(seg);
    if (it != node->children.end()) {
        match_recursive(it->second.get(), segments, depth + 1, out);
    }

    // Single-level wildcard '*'
    auto star = node->children.find("*");
    if (star != node->children.end()) {
        match_recursive(star->second.get(), segments, depth + 1, out);
    }
}

void TopicTrie::route(const std::string& topic, const Event& event) const {
    auto segments = split_topic(topic);
    route_recursive(root_.get(), segments, 0, event);
}

void TopicTrie::route_recursive(const TrieNode* node,
                                 const std::vector<std::string>& segments,
                                 size_t depth,
                                 const Event& event) const {
    for (const auto& wh : node->wildcard_handlers) {
        wh.handler(event);
    }

    if (depth == segments.size()) {
        for (const auto& h : node->handlers) {
            h.handler(event);
        }
        return;
    }

    const auto& seg = segments[depth];

    auto it = node->children.find(seg);
    if (it != node->children.end()) {
        route_recursive(it->second.get(), segments, depth + 1, event);
    }

    auto star = node->children.find("*");
    if (star != node->children.end()) {
        route_recursive(star->second.get(), segments, depth + 1, event);
    }
}

size_t TopicTrie::route_and_count(const std::string& topic, const Event& event) const {
    auto segments = split_topic(topic);
    size_t count = 0;
    route_count_recursive(root_.get(), segments, 0, event, count);
    return count;
}

void TopicTrie::route_count_recursive(const TrieNode* node,
                                       const std::vector<std::string>& segments,
                                       size_t depth, const Event& event,
                                       size_t& count) const {
    for (const auto& wh : node->wildcard_handlers) {
        wh.handler(event);
        count++;
    }

    if (depth == segments.size()) {
        for (const auto& h : node->handlers) {
            h.handler(event);
            count++;
        }
        return;
    }

    const auto& seg = segments[depth];

    auto it = node->children.find(seg);
    if (it != node->children.end()) {
        route_count_recursive(it->second.get(), segments, depth + 1, event, count);
    }

    auto star = node->children.find("*");
    if (star != node->children.end()) {
        route_count_recursive(star->second.get(), segments, depth + 1, event, count);
    }
}

void TopicTrie::clear() {
    root_ = std::make_unique<TrieNode>();
    handler_index_.clear();
    total_subs_ = 0;
}

// --- TopicRouter ---

HandlerId TopicRouter::subscribe(const std::string& topic_pattern, EventHandler handler) {
    return trie_.subscribe(topic_pattern, std::move(handler));
}

bool TopicRouter::unsubscribe(HandlerId id) {
    return trie_.unsubscribe(id);
}

void TopicRouter::publish(const std::string& topic, const Event& event) {
    size_t matched = trie_.route_and_count(topic, event);
    if (matched == 0) {
        stats_.events_unmatched++;
    } else {
        stats_.events_routed++;
    }
}

} // namespace pulse