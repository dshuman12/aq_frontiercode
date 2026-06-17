#pragma once
#include "pulse/core/event.hpp"
#include <string>
#include <vector>
#include <functional>
#include <memory>

namespace pulse {

enum class PredicateOp {
    Eq, Ne, Lt, Le, Gt, Ge, Contains, StartsWith, EndsWith, Exists
};

class Predicate {
public:
    static Predicate field_eq(const std::string& field, FieldValue value);
    static Predicate field_ne(const std::string& field, FieldValue value);
    static Predicate field_lt(const std::string& field, FieldValue value);
    static Predicate field_le(const std::string& field, FieldValue value);
    static Predicate field_gt(const std::string& field, FieldValue value);
    static Predicate field_ge(const std::string& field, FieldValue value);
    static Predicate field_contains(const std::string& field, const std::string& substr);
    static Predicate field_starts_with(const std::string& field, const std::string& prefix);
    static Predicate field_ends_with(const std::string& field, const std::string& suffix);
    static Predicate field_exists(const std::string& field);

    static Predicate all(std::vector<Predicate> preds);
    static Predicate any(std::vector<Predicate> preds);
    static Predicate negate(Predicate pred);

    bool evaluate(const Event& event) const;

private:
    struct FieldPred {
        std::string field;
        PredicateOp op;
        FieldValue value;
    };
    struct CompositePred {
        enum Type { All, Any, Not } type;
        std::vector<Predicate> children;
    };

    enum class Kind { Field, Composite } kind_;
    FieldPred field_pred_;
    CompositePred composite_;

public:
    Predicate() : kind_(Kind::Field) {}
private:

    static bool compare_values(const FieldValue& a, const FieldValue& b, PredicateOp op);
    static int compare_order(const FieldValue& a, const FieldValue& b);
};

class ContentRouter {
public:
    using RouteHandler = std::function<void(const Event&)>;
    using RouteId = uint64_t;

    RouteId add_route(Predicate predicate, RouteHandler handler);
    bool remove_route(RouteId id);
    void evaluate(const Event& event) const;

    size_t route_count() const { return routes_.size(); }
    void clear() { routes_.clear(); }

    struct Stats {
        uint64_t events_evaluated = 0;
        uint64_t events_matched = 0;
        uint64_t events_unmatched = 0;
    };
    Stats stats() const { return stats_; }

private:
    struct Route {
        RouteId id;
        Predicate predicate;
        RouteHandler handler;
    };
    std::vector<Route> routes_;
    RouteId next_id_ = 1;
    mutable Stats stats_;
};

} // namespace pulse