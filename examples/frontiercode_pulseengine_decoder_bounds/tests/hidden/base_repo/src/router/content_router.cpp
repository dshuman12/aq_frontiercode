#include "pulse/router/content_router.hpp"
#include <algorithm>

namespace pulse {

// --- Predicate factories ---

Predicate Predicate::field_eq(const std::string& field, FieldValue value) {
    Predicate p;
    p.kind_ = Kind::Field;
    p.field_pred_ = {field, PredicateOp::Eq, std::move(value)};
    return p;
}
Predicate Predicate::field_ne(const std::string& field, FieldValue value) {
    Predicate p;
    p.kind_ = Kind::Field;
    p.field_pred_ = {field, PredicateOp::Ne, std::move(value)};
    return p;
}
Predicate Predicate::field_lt(const std::string& field, FieldValue value) {
    Predicate p;
    p.kind_ = Kind::Field;
    p.field_pred_ = {field, PredicateOp::Lt, std::move(value)};
    return p;
}
Predicate Predicate::field_le(const std::string& field, FieldValue value) {
    Predicate p;
    p.kind_ = Kind::Field;
    p.field_pred_ = {field, PredicateOp::Le, std::move(value)};
    return p;
}
Predicate Predicate::field_gt(const std::string& field, FieldValue value) {
    Predicate p;
    p.kind_ = Kind::Field;
    p.field_pred_ = {field, PredicateOp::Gt, std::move(value)};
    return p;
}
Predicate Predicate::field_ge(const std::string& field, FieldValue value) {
    Predicate p;
    p.kind_ = Kind::Field;
    p.field_pred_ = {field, PredicateOp::Ge, std::move(value)};
    return p;
}
Predicate Predicate::field_contains(const std::string& field, const std::string& substr) {
    Predicate p;
    p.kind_ = Kind::Field;
    p.field_pred_ = {field, PredicateOp::Contains, FieldValue(substr)};
    return p;
}
Predicate Predicate::field_starts_with(const std::string& field, const std::string& prefix) {
    Predicate p;
    p.kind_ = Kind::Field;
    p.field_pred_ = {field, PredicateOp::StartsWith, FieldValue(prefix)};
    return p;
}
Predicate Predicate::field_ends_with(const std::string& field, const std::string& suffix) {
    Predicate p;
    p.kind_ = Kind::Field;
    p.field_pred_ = {field, PredicateOp::EndsWith, FieldValue(suffix)};
    return p;
}
Predicate Predicate::field_exists(const std::string& field) {
    Predicate p;
    p.kind_ = Kind::Field;
    p.field_pred_ = {field, PredicateOp::Exists, FieldValue(int64_t(0))};
    return p;
}

Predicate Predicate::all(std::vector<Predicate> preds) {
    Predicate p;
    p.kind_ = Kind::Composite;
    p.composite_ = {CompositePred::All, std::move(preds)};
    return p;
}
Predicate Predicate::any(std::vector<Predicate> preds) {
    Predicate p;
    p.kind_ = Kind::Composite;
    p.composite_ = {CompositePred::Any, std::move(preds)};
    return p;
}
Predicate Predicate::negate(Predicate pred) {
    Predicate p;
    p.kind_ = Kind::Composite;
    p.composite_ = {CompositePred::Not, {std::move(pred)}};
    return p;
}

int Predicate::compare_order(const FieldValue& a, const FieldValue& b) {
    if (a.index() != b.index()) return -2;

    if (auto pa = std::get_if<int64_t>(&a)) {
        auto pb = std::get_if<int64_t>(&b);
        if (*pa < *pb) return -1;
        if (*pa > *pb) return 1;
        return 0;
    }
    if (auto pa = std::get_if<double>(&a)) {
        auto pb = std::get_if<double>(&b);
        if (*pa < *pb) return -1;
        if (*pa > *pb) return 1;
        return 0;
    }
    if (auto pa = std::get_if<std::string>(&a)) {
        auto pb = std::get_if<std::string>(&b);
        return pa->compare(*pb);
    }
    if (auto pa = std::get_if<bool>(&a)) {
        auto pb = std::get_if<bool>(&b);
        if (*pa == *pb) return 0;
        return *pa ? 1 : -1;
    }
    return -2;
}

bool Predicate::compare_values(const FieldValue& a, const FieldValue& b, PredicateOp op) {
    switch (op) {
        case PredicateOp::Eq: return a == b;
        case PredicateOp::Ne: return a != b;
        case PredicateOp::Lt: { int c = compare_order(a, b); return c == -1; }
        case PredicateOp::Le: { int c = compare_order(a, b); return c <= 0 && c != -2; }
        case PredicateOp::Gt: { int c = compare_order(a, b); return c == 1; }
        case PredicateOp::Ge: { int c = compare_order(a, b); return c >= 0; }
        case PredicateOp::Contains: {
            auto sa = std::get_if<std::string>(&a);
            auto sb = std::get_if<std::string>(&b);
            if (!sa || !sb) return false;
            return sa->find(*sb) != std::string::npos;
        }
        case PredicateOp::StartsWith: {
            auto sa = std::get_if<std::string>(&a);
            auto sb = std::get_if<std::string>(&b);
            if (!sa || !sb) return false;
            return sa->size() >= sb->size() && sa->compare(0, sb->size(), *sb) == 0;
        }
        case PredicateOp::EndsWith: {
            auto sa = std::get_if<std::string>(&a);
            auto sb = std::get_if<std::string>(&b);
            if (!sa || !sb) return false;
            return sa->size() >= sb->size() &&
                   sa->compare(sa->size() - sb->size(), sb->size(), *sb) == 0;
        }
        case PredicateOp::Exists: return true;
    }
    return false;
}

bool Predicate::evaluate(const Event& event) const {
    if (kind_ == Kind::Field) {
        if (field_pred_.op == PredicateOp::Exists) {
            return event.has_field(field_pred_.field);
        }
        if (!event.has_field(field_pred_.field)) return false;
        const auto& val = event.get_field(field_pred_.field);
        return compare_values(val, field_pred_.value, field_pred_.op);
    }

    // Composite
    switch (composite_.type) {
        case CompositePred::All:
            for (const auto& child : composite_.children) {
                if (!child.evaluate(event)) return false;
            }
            return true;
        case CompositePred::Any:
            for (const auto& child : composite_.children) {
                if (child.evaluate(event)) return true;
            }
            return false;
        case CompositePred::Not:
            return !composite_.children[0].evaluate(event);
    }
    return false;
}

// --- ContentRouter ---

ContentRouter::RouteId ContentRouter::add_route(Predicate predicate, RouteHandler handler) {
    RouteId id = next_id_++;
    routes_.push_back({id, std::move(predicate), std::move(handler)});
    return id;
}

bool ContentRouter::remove_route(RouteId id) {
    auto it = std::find_if(routes_.begin(), routes_.end(),
                           [id](const Route& r) { return r.id == id; });
    if (it == routes_.end()) return false;
    routes_.erase(it);
    return true;
}

void ContentRouter::evaluate(const Event& event) const {
    stats_.events_evaluated++;
    bool matched = false;
    for (const auto& route : routes_) {
        if (route.predicate.evaluate(event)) {
            route.handler(event);
            matched = true;
        }
    }
    if (matched) {
        stats_.events_matched++;
    } else {
        stats_.events_unmatched++;
    }
}

} // namespace pulse