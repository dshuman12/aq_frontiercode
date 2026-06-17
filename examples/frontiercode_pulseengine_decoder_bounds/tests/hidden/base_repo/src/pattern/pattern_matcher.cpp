#include "pulse/pattern/pattern_matcher.hpp"
#include <algorithm>

namespace pulse {

PatternBuilder::PatternBuilder()
    : engine_(std::make_shared<NFAEngine>()), current_state_(0) {}

PatternBuilder& PatternBuilder::begin() {
    current_state_ = engine_->add_state(false);
    engine_->set_start(current_state_);
    return *this;
}

PatternBuilder& PatternBuilder::then(Predicate condition) {
    size_t next = engine_->add_state(false);
    engine_->add_transition(current_state_, next, std::move(condition));
    current_state_ = next;
    return *this;
}

PatternBuilder& PatternBuilder::followed_by(Predicate condition) {
    return then(std::move(condition));
}

PatternBuilder& PatternBuilder::not_followed_by(Predicate condition,
                                                  uint64_t timeout_ms) {
    size_t next = engine_->add_state(false);
    engine_->add_negation(current_state_, next, std::move(condition), timeout_ms);
    current_state_ = next;
    return *this;
}

PatternBuilder& PatternBuilder::on_match(MatchCallback callback) {
    callback_ = std::move(callback);
    return *this;
}

std::shared_ptr<NFAEngine> PatternBuilder::build() {
    // Mark current state as accept
    size_t accept = engine_->add_state(true);
    engine_->add_epsilon(current_state_, accept);
    if (callback_) {
        engine_->set_callback(callback_);
    }
    return engine_;
}

// --- PatternMatcher ---

void PatternMatcher::add_pattern(const std::string& name,
                                  std::shared_ptr<NFAEngine> engine) {
    patterns_.push_back({name, std::move(engine)});
}

void PatternMatcher::remove_pattern(const std::string& name) {
    auto it = std::remove_if(patterns_.begin(), patterns_.end(),
                             [&](const NamedPattern& p) { return p.name == name; });
    patterns_.erase(it, patterns_.end());
}

void PatternMatcher::process(const Event& event) {
    for (auto& p : patterns_) {
        p.engine->process(event);
    }
}

void PatternMatcher::advance_time(Timestamp now) {
    for (auto& p : patterns_) {
        p.engine->advance_time(now);
    }
}

void PatternMatcher::reset() {
    for (auto& p : patterns_) {
        p.engine->reset();
    }
}

uint64_t PatternMatcher::total_matches() const {
    uint64_t total = 0;
    for (const auto& p : patterns_) {
        total += p.engine->total_matches();
    }
    return total;
}

} // namespace pulse