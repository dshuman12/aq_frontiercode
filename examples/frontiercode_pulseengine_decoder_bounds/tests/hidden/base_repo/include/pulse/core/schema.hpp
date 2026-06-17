#pragma once
#include "pulse/core/types.hpp"
#include <string>
#include <vector>
#include <unordered_map>
#include <memory>

namespace pulse {

struct FieldDescriptor {
    std::string name;
    FieldType   type;
    bool        required = true;
};

class Schema {
public:
    Schema() = default;
    explicit Schema(const std::string& event_type);

    Schema& add_field(const std::string& name, FieldType type, bool required = true);
    Schema& set_event_type(const std::string& t);

    const std::string& event_type() const { return event_type_; }
    size_t field_count() const { return fields_.size(); }
    const std::vector<FieldDescriptor>& fields() const { return fields_; }

    bool has_field(const std::string& name) const;
    const FieldDescriptor& get_field(const std::string& name) const;
    int field_index(const std::string& name) const;

    Result<void> validate(const std::unordered_map<std::string, FieldValue>& data) const;

    uint32_t fingerprint() const;

private:
    std::string event_type_;
    std::vector<FieldDescriptor> fields_;
    std::unordered_map<std::string, size_t> index_;
};

class SchemaRegistry {
public:
    void register_schema(const std::string& event_type, Schema schema);
    bool has_schema(const std::string& event_type) const;
    const Schema& get_schema(const std::string& event_type) const;
    std::vector<std::string> registered_types() const;
    size_t size() const { return schemas_.size(); }
    void clear();

private:
    std::unordered_map<std::string, Schema> schemas_;
};

} // namespace pulse