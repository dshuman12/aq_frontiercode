#pragma once
#include "pulse/core/types.hpp"
#include "pulse/core/schema.hpp"
#include <string>
#include <unordered_map>
#include <vector>
#include <atomic>

namespace pulse {

class Event {
public:
    Event();
    Event(const std::string& event_type, Timestamp ts);

    EventId id() const { return id_; }
    const std::string& event_type() const { return event_type_; }
    Timestamp timestamp() const { return timestamp_; }

    void set_timestamp(Timestamp ts) { timestamp_ = ts; }
    void set_event_type(const std::string& t) { event_type_ = t; }

    // Field accessors
    void set_int(const std::string& key, int64_t val);
    void set_double(const std::string& key, double val);
    void set_string(const std::string& key, const std::string& val);
    void set_bool(const std::string& key, bool val);
    void set_bytes(const std::string& key, const std::vector<uint8_t>& val);
    void set_field(const std::string& key, FieldValue val);

    bool has_field(const std::string& key) const;
    const FieldValue& get_field(const std::string& key) const;
    int64_t get_int(const std::string& key) const;
    double get_double(const std::string& key) const;
    const std::string& get_string(const std::string& key) const;
    bool get_bool(const std::string& key) const;
    const std::vector<uint8_t>& get_bytes(const std::string& key) const;

    size_t field_count() const { return fields_.size(); }
    const std::unordered_map<std::string, FieldValue>& fields() const { return fields_; }
    std::vector<std::string> field_names() const;
    void clear_fields();

    Result<void> validate(const Schema& schema) const;

    Event clone() const;
    size_t estimated_size() const;

private:
    void invalidate_size_cache() { size_cached_ = false; }

    static std::atomic<EventId> next_id_;
    EventId id_;
    std::string event_type_;
    Timestamp timestamp_;
    std::unordered_map<std::string, FieldValue> fields_;
    mutable size_t cached_size_ = 0;
    mutable bool size_cached_ = false;
};

class EventBuilder {
public:
    EventBuilder(const std::string& event_type, Timestamp ts);

    EventBuilder& with_int(const std::string& key, int64_t val);
    EventBuilder& with_double(const std::string& key, double val);
    EventBuilder& with_string(const std::string& key, const std::string& val);
    EventBuilder& with_bool(const std::string& key, bool val);
    EventBuilder& with_bytes(const std::string& key, const std::vector<uint8_t>& val);

    Event build();
    Result<Event> build_validated(const Schema& schema);

private:
    Event event_;
};

} // namespace pulse