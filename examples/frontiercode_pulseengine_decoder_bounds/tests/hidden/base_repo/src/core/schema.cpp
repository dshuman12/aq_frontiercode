#include "pulse/core/schema.hpp"
#include <algorithm>

namespace pulse {

Schema::Schema(const std::string& event_type) : event_type_(event_type) {}

Schema& Schema::add_field(const std::string& name, FieldType type, bool required) {
    if (index_.count(name)) {
        throw PulseError(ErrorCode::InvalidSchema,
                         "Duplicate field name: " + name);
    }
    index_[name] = fields_.size();
    fields_.push_back({name, type, required});
    return *this;
}

Schema& Schema::set_event_type(const std::string& t) {
    event_type_ = t;
    return *this;
}

bool Schema::has_field(const std::string& name) const {
    return index_.count(name) > 0;
}

const FieldDescriptor& Schema::get_field(const std::string& name) const {
    auto it = index_.find(name);
    if (it == index_.end()) {
        throw PulseError(ErrorCode::FieldNotFound,
                         "Field not found: " + name);
    }
    return fields_[it->second];
}

int Schema::field_index(const std::string& name) const {
    auto it = index_.find(name);
    if (it == index_.end()) return -1;
    return static_cast<int>(it->second);
}

Result<void> Schema::validate(
    const std::unordered_map<std::string, FieldValue>& data) const {
    for (const auto& fd : fields_) {
        auto it = data.find(fd.name);
        if (it == data.end()) {
            if (fd.required) {
                return Result<void>::err(ErrorCode::InvalidSchema,
                    "Missing required field: " + fd.name);
            }
            continue;
        }
        FieldType actual = field_value_type(it->second);
        if (actual != fd.type) {
            return Result<void>::err(ErrorCode::TypeMismatch,
                "Field '" + fd.name + "' expected " +
                field_type_name(fd.type) + " but got " +
                field_type_name(actual));
        }
    }
    return Result<void>::ok();
}

uint32_t Schema::fingerprint() const {
    uint32_t hash = 2166136261u;
    auto fnv = [&](uint8_t byte) {
        hash ^= byte;
        hash *= 16777619u;
    };
    for (char c : event_type_) fnv(static_cast<uint8_t>(c));
    fnv(0);
    for (const auto& fd : fields_) {
        for (char c : fd.name) fnv(static_cast<uint8_t>(c));
        fnv(static_cast<uint8_t>(fd.type));
        fnv(fd.required ? 1 : 0);
    }
    return hash;
}

// --- SchemaRegistry ---

void SchemaRegistry::register_schema(const std::string& event_type, Schema schema) {
    schema.set_event_type(event_type);
    schemas_[event_type] = std::move(schema);
}

bool SchemaRegistry::has_schema(const std::string& event_type) const {
    return schemas_.count(event_type) > 0;
}

const Schema& SchemaRegistry::get_schema(const std::string& event_type) const {
    auto it = schemas_.find(event_type);
    if (it == schemas_.end()) {
        throw PulseError(ErrorCode::InvalidSchema,
                         "No schema registered for: " + event_type);
    }
    return it->second;
}

std::vector<std::string> SchemaRegistry::registered_types() const {
    std::vector<std::string> out;
    out.reserve(schemas_.size());
    for (const auto& kv : schemas_) out.push_back(kv.first);
    std::sort(out.begin(), out.end());
    return out;
}

void SchemaRegistry::clear() {
    schemas_.clear();
}

} // namespace pulse