#pragma once
#include "pulse/core/event.hpp"
#include "pulse/router/content_router.hpp"
#include <vector>
#include <functional>
#include <memory>
#include <string>
#include <set>
#include <unordered_map>
#include <cstdint>

namespace pulse {

using MatchCallback = std::function<void(const std::vector<Event>&)>;

enum class NFATransitionType {
    Match,
    Epsilon,
    Negation
};

struct NFATransition {
    NFATransitionType type;
    size_t target_state;
    Predicate condition;
    uint64_t timeout_ms = 0;  // for negation: how long to wait for non-occurrence
};

struct NFAState {
    size_t id;
    bool is_accept = false;
    std::vector<NFATransition> transitions;
};

class NFAEngine {
public:
    NFAEngine();

    size_t add_state(bool is_accept = false);
    void add_transition(size_t from, size_t to, Predicate condition);
    void add_epsilon(size_t from, size_t to);
    void add_negation(size_t from, size_t to, Predicate condition, uint64_t timeout_ms);
    void set_start(size_t state_id) { start_state_ = state_id; }
    void set_callback(MatchCallback cb) { callback_ = std::move(cb); }

    void process(const Event& event);
    void advance_time(Timestamp now);
    void reset();
    void build_closures();

    size_t state_count() const { return states_.size(); }
    size_t active_instance_count() const { return instances_.size(); }
    uint64_t total_matches() const { return total_matches_; }

private:
    struct Instance {
        size_t current_state;
        std::shared_ptr<std::vector<Event>> matched_events;
        Timestamp created_at;
        bool pending_negation = false;
        Predicate negation_condition;
        uint64_t negation_deadline = 0;
        size_t negation_target = 0;

        void append_event(const Event& e) {
            if (!matched_events || matched_events.use_count() > 1) {
                auto copy = matched_events
                    ? std::make_shared<std::vector<Event>>(*matched_events)
                    : std::make_shared<std::vector<Event>>();
                matched_events = std::move(copy);
            }
            matched_events->push_back(e);
        }
    };

    const std::set<size_t>& get_closure(size_t state);
    void try_advance(Instance& inst, const Event& event, std::vector<Instance>& new_instances);

    std::vector<NFAState> states_;
    size_t start_state_ = 0;
    MatchCallback callback_;
    std::vector<Instance> instances_;
    uint64_t total_matches_ = 0;
    std::unordered_map<size_t, std::set<size_t>> closure_cache_;
    static constexpr size_t MAX_INSTANCES = 10000;
};

} // namespace pulse