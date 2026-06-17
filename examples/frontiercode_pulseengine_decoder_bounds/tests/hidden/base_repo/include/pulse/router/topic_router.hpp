#pragma once
#include "pulse/core/event.hpp"
#include <string>
#include <vector>
#include <functional>
#include <memory>
#include <unordered_map>

namespace pulse {

using EventHandler = std::function<void(const Event&)>;
using HandlerId = uint64_t;

class TopicTrie {
public:
    TopicTrie();

    HandlerId subscribe(const std::string& pattern, EventHandler handler);
    bool unsubscribe(HandlerId id);
    std::vector<HandlerId> match(const std::string& topic) const;
    void route(const std::string& topic, const Event& event) const;
    size_t route_and_count(const std::string& topic, const Event& event) const;
    size_t subscription_count() const { return total_subs_; }
    void clear();

private:
    struct Subscription {
        HandlerId id;
        EventHandler handler;
    };

    struct TrieNode {
        std::unordered_map<std::string, std::unique_ptr<TrieNode>> children;
        std::vector<Subscription> handlers;
        std::vector<Subscription> wildcard_handlers;  // for '#' multi-level
    };

    static std::vector<std::string> split_topic(const std::string& topic);
    void match_recursive(const TrieNode* node, const std::vector<std::string>& segments,
                         size_t depth, std::vector<HandlerId>& out) const;
    void route_recursive(const TrieNode* node, const std::vector<std::string>& segments,
                         size_t depth, const Event& event) const;
    void route_count_recursive(const TrieNode* node, const std::vector<std::string>& segments,
                               size_t depth, const Event& event, size_t& count) const;
    bool remove_recursive(TrieNode* node, HandlerId id);

    struct HandlerLocation {
        TrieNode* node;
        bool is_wildcard;
    };

    std::unique_ptr<TrieNode> root_;
    std::unordered_map<HandlerId, HandlerLocation> handler_index_;
    HandlerId next_id_ = 1;
    size_t total_subs_ = 0;
};

class TopicRouter {
public:
    HandlerId subscribe(const std::string& topic_pattern, EventHandler handler);
    bool unsubscribe(HandlerId id);
    void publish(const std::string& topic, const Event& event);
    size_t subscription_count() const { return trie_.subscription_count(); }
    void clear() { trie_.clear(); }

    struct Stats {
        uint64_t events_routed = 0;
        uint64_t events_unmatched = 0;
    };
    Stats stats() const { return stats_; }

private:
    TopicTrie trie_;
    Stats stats_;
};

} // namespace pulse