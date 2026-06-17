#include "pulse/pattern/nfa_engine.hpp"
#include <algorithm>
#include <queue>

namespace pulse {

NFAEngine::NFAEngine() {}

size_t NFAEngine::add_state(bool is_accept) {
    size_t id = states_.size();
    states_.push_back({id, is_accept, {}});
    return id;
}

void NFAEngine::add_transition(size_t from, size_t to, Predicate condition) {
    states_[from].transitions.push_back({
        NFATransitionType::Match, to, std::move(condition), 0
    });
}

void NFAEngine::add_epsilon(size_t from, size_t to) {
    states_[from].transitions.push_back({
        NFATransitionType::Epsilon, to, Predicate::field_exists("__epsilon__"), 0
    });
    closure_cache_.clear();
}

void NFAEngine::add_negation(size_t from, size_t to, Predicate condition,
                              uint64_t timeout_ms) {
    states_[from].transitions.push_back({
        NFATransitionType::Negation, to, std::move(condition), timeout_ms
    });
}

void NFAEngine::build_closures() {
    closure_cache_.clear();
    for (size_t i = 0; i < states_.size(); i++) {
        get_closure(i);
    }
}

const std::set<size_t>& NFAEngine::get_closure(size_t state) {
    auto it = closure_cache_.find(state);
    if (it != closure_cache_.end()) return it->second;

    std::set<size_t> closure;
    std::queue<size_t> worklist;
    worklist.push(state);
    closure.insert(state);

    while (!worklist.empty()) {
        size_t s = worklist.front();
        worklist.pop();
        for (const auto& trans : states_[s].transitions) {
            if (trans.type == NFATransitionType::Epsilon) {
                if (closure.insert(trans.target_state).second) {
                    worklist.push(trans.target_state);
                }
            }
        }
    }
    auto [inserted, _] = closure_cache_.emplace(state, std::move(closure));
    return inserted->second;
}

void NFAEngine::process(const Event& event) {
    // Spawn new instance at start state
    const auto& start_closure = get_closure(start_state_);
    auto empty_events = std::make_shared<std::vector<Event>>();
    for (size_t s : start_closure) {
        instances_.push_back({s, empty_events, event.timestamp(), false, Predicate::field_exists("_"), 0, 0});
    }

    std::vector<Instance> next_instances;
    next_instances.reserve(instances_.size());

    for (auto& inst : instances_) {
        if (inst.pending_negation) {
            if (inst.negation_condition.evaluate(event)) {
                continue;
            }
            if (event.timestamp() >= inst.negation_deadline) {
                inst.current_state = inst.negation_target;
                inst.pending_negation = false;
                const auto& closure = get_closure(inst.current_state);
                for (size_t s : closure) {
                    Instance ni = inst;
                    ni.current_state = s;
                    if (states_[s].is_accept) {
                        if (callback_) callback_(ni.matched_events ? *ni.matched_events : std::vector<Event>{});
                        total_matches_++;
                    } else {
                        next_instances.push_back(std::move(ni));
                    }
                }
                continue;
            }
            next_instances.push_back(std::move(inst));
            continue;
        }

        try_advance(inst, event, next_instances);
    }

    if (next_instances.size() > MAX_INSTANCES) {
        next_instances.resize(MAX_INSTANCES);
    }
    instances_ = std::move(next_instances);
}

void NFAEngine::try_advance(Instance& inst, const Event& event,
                             std::vector<Instance>& new_instances) {
    bool advanced = false;

    for (const auto& trans : states_[inst.current_state].transitions) {
        if (trans.type == NFATransitionType::Match) {
            if (trans.condition.evaluate(event)) {
                Instance ni = inst;
                ni.append_event(event);
                const auto& closure = get_closure(trans.target_state);
                for (size_t s : closure) {
                    Instance ni2 = ni;
                    ni2.current_state = s;
                    if (states_[s].is_accept) {
                        if (callback_) callback_(ni2.matched_events ? *ni2.matched_events : std::vector<Event>{});
                        total_matches_++;
                    } else {
                        new_instances.push_back(std::move(ni2));
                    }
                }
                advanced = true;
            }
        } else if (trans.type == NFATransitionType::Negation) {
            Instance ni = inst;
            ni.pending_negation = true;
            ni.negation_condition = trans.condition;
            ni.negation_deadline = event.timestamp() + trans.timeout_ms;
            ni.negation_target = trans.target_state;
            ni.append_event(event);
            new_instances.push_back(std::move(ni));
        }
    }

    if (!advanced && !states_[inst.current_state].is_accept
        && inst.matched_events && !inst.matched_events->empty()) {
        new_instances.push_back(std::move(inst));
    }
}

void NFAEngine::advance_time(Timestamp now) {
    std::vector<Instance> next;
    for (auto& inst : instances_) {
        if (inst.pending_negation && now >= inst.negation_deadline) {
            inst.current_state = inst.negation_target;
            inst.pending_negation = false;
            if (states_[inst.current_state].is_accept) {
                if (callback_) callback_(inst.matched_events ? *inst.matched_events : std::vector<Event>{});
                total_matches_++;
                continue;
            }
        }
        next.push_back(std::move(inst));
    }
    instances_ = std::move(next);
}

void NFAEngine::reset() {
    instances_.clear();
    total_matches_ = 0;
    closure_cache_.clear();
}

} // namespace pulse