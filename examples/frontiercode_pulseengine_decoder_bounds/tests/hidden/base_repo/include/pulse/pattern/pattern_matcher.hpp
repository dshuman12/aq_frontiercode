#pragma once
#include "pulse/pattern/nfa_engine.hpp"
#include <memory>
#include <string>

namespace pulse {

class PatternBuilder {
public:
    PatternBuilder();

    PatternBuilder& begin();
    PatternBuilder& then(Predicate condition);
    PatternBuilder& followed_by(Predicate condition);
    PatternBuilder& not_followed_by(Predicate condition, uint64_t timeout_ms);
    PatternBuilder& on_match(MatchCallback callback);

    std::shared_ptr<NFAEngine> build();

private:
    std::shared_ptr<NFAEngine> engine_;
    size_t current_state_;
    MatchCallback callback_;
};

class PatternMatcher {
public:
    PatternMatcher() = default;

    void add_pattern(const std::string& name, std::shared_ptr<NFAEngine> engine);
    void remove_pattern(const std::string& name);
    void process(const Event& event);
    void advance_time(Timestamp now);
    void reset();

    size_t pattern_count() const { return patterns_.size(); }
    uint64_t total_matches() const;

private:
    struct NamedPattern {
        std::string name;
        std::shared_ptr<NFAEngine> engine;
    };
    std::vector<NamedPattern> patterns_;
};

} // namespace pulse