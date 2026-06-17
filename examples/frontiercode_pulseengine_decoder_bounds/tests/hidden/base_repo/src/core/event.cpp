#include "pulse/core/event.hpp"

namespace pulse {

std::atomic<EventId> Event::next_id_{1};

Event::Event() : id_(next_id_.fetch_add(1)), timestamp_(0) {}

Event::Event(const std::string& event_type, Timestamp ts)
    : id_(next_id_.fetch_add(1)), event_type_(event_type), timestamp_(ts) {}

void Event::set_int(const std::string& key, int64_t val) {
    fields_[key] = val;
    invalidate_size_cache();
}
void Event::set_double(const std::string& key, double val) {
    fields_[key] = val;
    invalidate_size_cache();
}
void Event::set_string(const std::string& key, const std::string& val) {
    fields_[key] = val;
    invalidate_size_cache();
}
void Event::set_bool(const std::string& key, bool val) {
    fields_[key] = val;
    invalidate_size_cache();
}
void Event::set_bytes(const std::string& key, const std::vector<uint8_t>& val) {
    fields_[key] = val;
    invalidate_size_cache();
}
void Event::set_field(const std::string& key, FieldValue val) {
    fields_[key] = std::move(val);
    invalidate_size_cache();
}

bool Event::has_field(const std::string& key) const {
    return fields_.count(key) > 0;
}

const FieldValue& Event::get_field(const std::string& key) const {
    auto it = fields_.find(key);
    if (it == fields_.end()) {
        throw PulseError(ErrorCode::FieldNotFound, "Field not found: " + key);
    }
    return it->second;
}

int64_t Event::get_int(const std::string& key) const {
    const auto& v = get_field(key);
    if (auto p = std::get_if<int64_t>(&v)) return *p;
    throw PulseError(ErrorCode::TypeMismatch,
                     "Field '" + key + "' is not Int64");
}

double Event::get_double(const std::string& key) const {
    const auto& v = get_field(key);
    if (auto p = std::get_if<double>(&v)) return *p;
    throw PulseError(ErrorCode::TypeMismatch,
                     "Field '" + key + "' is not Double");
}

const std::string& Event::get_string(const std::string& key) const {
    const auto& v = get_field(key);
    if (auto p = std::get_if<std::string>(&v)) return *p;
    throw PulseError(ErrorCode::TypeMismatch,
                     "Field '" + key + "' is not String");
}

bool Event::get_bool(const std::string& key) const {
    const auto& v = get_field(key);
    if (auto p = std::get_if<bool>(&v)) return *p;
    throw PulseError(ErrorCode::TypeMismatch,
                     "Field '" + key + "' is not Bool");
}

const std::vector<uint8_t>& Event::get_bytes(const std::string& key) const {
    const auto& v = get_field(key);
    if (auto p = std::get_if<std::vector<uint8_t>>(&v)) return *p;
    throw PulseError(ErrorCode::TypeMismatch,
                     "Field '" + key + "' is not Bytes");
}

void Event::clear_fields() {
    fields_.clear();
    invalidate_size_cache();
}

std::vector<std::string> Event::field_names() const {
    std::vector<std::string> names;
    names.reserve(fields_.size());
    for (const auto& kv : fields_) names.push_back(kv.first);
    return names;
}

Result<void> Event::validate(const Schema& schema) const {
    return schema.validate(fields_);
}

Event Event::clone() const {
    Event e(event_type_, timestamp_);
    for (const auto& kv : fields_) {
        e.fields_[kv.first] = kv.second;
    }
    return e;
}

size_t Event::estimated_size() const {
    if (size_cached_) return cached_size_;
    size_t sz = sizeof(Event) + event_type_.capacity();
    for (const auto& kv : fields_) {
        sz += kv.first.capacity() + sizeof(FieldValue);
        if (auto p = std::get_if<std::string>(&kv.second)) {
            sz += p->capacity();
        } else if (auto p = std::get_if<std::vector<uint8_t>>(&kv.second)) {
            sz += p->capacity();
        }
    }
    cached_size_ = sz;
    size_cached_ = true;
    return sz;
}

// --- EventBuilder ---

EventBuilder::EventBuilder(const std::string& event_type, Timestamp ts)
    : event_(event_type, ts) {}

EventBuilder& EventBuilder::with_int(const std::string& key, int64_t val) {
    event_.set_int(key, val);
    return *this;
}
EventBuilder& EventBuilder::with_double(const std::string& key, double val) {
    event_.set_double(key, val);
    return *this;
}
EventBuilder& EventBuilder::with_string(const std::string& key, const std::string& val) {
    event_.set_string(key, val);
    return *this;
}
EventBuilder& EventBuilder::with_bool(const std::string& key, bool val) {
    event_.set_bool(key, val);
    return *this;
}
EventBuilder& EventBuilder::with_bytes(const std::string& key, const std::vector<uint8_t>& val) {
    event_.set_bytes(key, val);
    return *this;
}

Event EventBuilder::build() {
    return std::move(event_);
}

Result<Event> EventBuilder::build_validated(const Schema& schema) {
    auto r = event_.validate(schema);
    if (r.is_err()) {
        return Result<Event>::err(r.error_code(), r.error_msg());
    }
    return Result<Event>::ok(std::move(event_));
}

} // namespace pulse